import React, { useState, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ScanLine, ArrowDownCircle, ArrowUpCircle, ClipboardList, CheckCircle, AlertCircle, Loader2, Volume2, VolumeX, History, Camera, XCircle, Zap } from 'lucide-react';
import { Item } from '../types';
import { Html5Qrcode } from 'html5-qrcode';

type ScanMode = 'put' | 'take' | 'count';

interface RecentScan {
  id: string;
  itemName: string;
  itemCode: string;
  qty: number;
  mode: ScanMode;
  time: string;
  success: boolean;
}

const playBeep = (type: 'success' | 'error', enabled: boolean) => {
  if (!enabled) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'success') {
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      osc.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch(e) {
    console.warn("Audio not supported");
  }
};

const ScannerOperations: React.FC = () => {
  const { items, processInward, processOutward, adjustStock } = useInventory();
  
  const [mode, setMode] = useState<ScanMode>('put');
  const [scannedCode, setScannedCode] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [partyName, setPartyName] = useState<string>(''); // Supplier for put, Customer/Reason for take, Reason for count
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<'success' | 'error' | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  // Focus input automatically
  useEffect(() => {
    if (!selectedItem && !showCamera) {
      inputRef.current?.focus();
    }
  }, [mode, selectedItem, showCamera, quickMode]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;

    if (showCamera && !selectedItem) {
      // Small timeout to ensure the DOM element exists
      setTimeout(() => {
        if (!isComponentMounted) return;
        
        try {
          html5QrCode = new Html5Qrcode("reader");
          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 60,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.pause(); // Pause rather than stop for faster scanning
                setScannedCode(decodedText);
                handleItemLookup(decodedText, html5QrCode);
              }
            },
            (errorMessage) => {
              // Handle read error silently
            }
          ).catch(err => {
            console.error("Camera startup error: ", err);
            let errorText = 'Could not start camera. Please ensure permissions are granted.';
            if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied') || String(err).includes('NotAllowedError')) {
              errorText = 'Camera permission denied. If you are in a preview window, try opening the app in a new tab. Otherwise, please allow camera access in your browser settings.';
            } else if (err?.name === 'NotFoundError' || String(err).includes('NotFoundError')) {
              errorText = 'No camera found on this device.';
            }
            setMessage({ type: 'error', text: errorText });
            setShowCamera(false);
          });
        } catch (e) {
            console.error("Html5Qrcode initialization error", e);
        }
      }, 100);
    }

    return () => {
      isComponentMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(error => {
          console.error("Failed to clear html5Qrcode. ", error);
        });
      }
    };
  }, [showCamera, selectedItem]);

  const processQuickScan = async (item: Item, qrScanner?: Html5Qrcode) => {
    setLoading(true);
    try {
      const qty = 1;
      const tPartyName = mode === 'count' ? 'Quick Count' : (mode === 'take' ? 'Quick Issue' : 'Quick Receipt');
      
      if (mode === 'put') {
        await processInward({
          itemCode: item.code,
          quantity: qty,
          supplier: tPartyName,
          date: new Date().toISOString()
        });
      } else if (mode === 'take') {
        if (item.currentStock < qty) {
           throw new Error(`Insufficient stock for ${item.name}`);
        }
        await processOutward({
          itemCode: item.code,
          quantity: qty,
          customer: tPartyName,
          date: new Date().toISOString()
        });
      } else if (mode === 'count') {
        await adjustStock(item.code, qty, tPartyName);
      }
      playBeep('success', soundEnabled);
      setMessage({ type: 'success', text: `Quick ${mode}: ${qty} ${item.name}` });
      addRecentScan(item.name, item.code, qty, true);
      setScanFeedback('success');
      setTimeout(() => setScanFeedback(null), 1000);
    } catch (err: any) {
      playBeep('error', soundEnabled);
      setMessage({ type: 'error', text: err.message || 'Operation failed.' });
      addRecentScan(item.name, item.code, 1, false);
      setScanFeedback('error');
      setTimeout(() => setScanFeedback(null), 1000);
    } finally {
      setLoading(false);
      setScannedCode('');
      
      // Resume scanner if it was passed
      if (qrScanner && qrScanner.isScanning) {
        setTimeout(() => {
          qrScanner.resume();
        }, 500); // 500ms delay to avoid accidental multiple scans of same code, but fast enough for actual use
      } else {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  const handleItemLookup = (codeToLookup: string, qrScanner?: Html5Qrcode) => {
    setMessage(null);
    const code = codeToLookup.trim();
    if (!code) {
       if (qrScanner) qrScanner.resume();
       return;
    }

    const item = items.find(i => i.code.toLowerCase() === code.toLowerCase());
    if (item) {
      if (quickMode) {
        processQuickScan(item, qrScanner);
      } else {
        if (qrScanner) {
          qrScanner.stop().then(() => {
            setShowCamera(false);
          }).catch(console.error);
        }
        setSelectedItem(item);
        setScannedCode(''); // clear for next time
        
        // Auto-select quantity based on mode
        if (mode === 'count') {
          setQuantity(item.currentStock.toString());
        } else {
          setQuantity('1');
        }

        setTimeout(() => {
          qtyRef.current?.focus();
          qtyRef.current?.select();
        }, 100);
        
        // Default party name based on mode
        if (mode === 'count') setPartyName('Physical Count');
        else if (mode === 'take') setPartyName('Issue');
        else if (mode === 'put') setPartyName(''); // Require supplier
      }
    } else {
      playBeep('error', soundEnabled);
      setMessage({ type: 'error', text: `Item with code "${code}" not found.` });
      setScannedCode('');
      if (qrScanner && qrScanner.isScanning) {
        setTimeout(() => {
           qrScanner.resume();
        }, 500);
      } else {
        inputRef.current?.focus();
      }
    }
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    handleItemLookup(scannedCode);
  };

  const addRecentScan = (itemName: string, itemCode: string, qty: number, success: boolean) => {
    const newScan: RecentScan = {
      id: Math.random().toString(36).substr(2, 9),
      itemName,
      itemCode,
      qty,
      mode,
      time: new Date().toLocaleTimeString(),
      success
    };
    setRecentScans(prev => [newScan, ...prev].slice(0, 50)); // Keep last 50
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      playBeep('error', soundEnabled);
      setMessage({ type: 'error', text: 'Please enter a valid quantity.' });
      return;
    }

    if (mode === 'take' && qty > selectedItem.currentStock) {
      playBeep('error', soundEnabled);
      setMessage({ type: 'error', text: `Insufficient stock! Current stock is ${selectedItem.currentStock}.` });
      return;
    }

    if (!partyName && mode !== 'count') {
      playBeep('error', soundEnabled);
      setMessage({ type: 'error', text: 'Reference / Party Name is required.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'put') {
        await processInward({
          itemCode: selectedItem.code,
          quantity: qty,
          supplier: partyName,
          date: new Date().toISOString()
        });
        setMessage({ type: 'success', text: `Successfully received ${qty} ${selectedItem.uom} of ${selectedItem.name}.` });
      } else if (mode === 'take') {
        await processOutward({
          itemCode: selectedItem.code,
          quantity: qty,
          customer: partyName,
          date: new Date().toISOString()
        });
        setMessage({ type: 'success', text: `Successfully issued ${qty} ${selectedItem.uom} of ${selectedItem.name}.` });
      } else if (mode === 'count') {
        await adjustStock(selectedItem.code, qty, partyName || 'Scanner Count');
        setMessage({ type: 'success', text: `Stock for ${selectedItem.name} updated to ${qty} ${selectedItem.uom}.` });
      }
      
      playBeep('success', soundEnabled);
      addRecentScan(selectedItem.name, selectedItem.code, qty, true);

      // Reset after success
      setSelectedItem(null);
      setQuantity('1');
      // Keep partyName for consecutive scans if it's put/take
      if (mode === 'count') setPartyName('');
      
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err: any) {
      playBeep('error', soundEnabled);
      setMessage({ type: 'error', text: err.message || 'Operation failed.' });
      addRecentScan(selectedItem.name, selectedItem.code, qty, false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedItem(null);
    setQuantity('1');
    setMessage(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 flex flex-col lg:flex-row gap-6">
      {/* Left Column: Main Scanner */}
      <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-indigo-50 p-6 sm:p-8 flex-1 relative overflow-hidden">
        {scanFeedback && (
          <div className={`absolute inset-0 z-50 flex items-center justify-center animate-out fade-out duration-1000 pointer-events-none
            ${scanFeedback === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}
          >
            <div className={`rounded-full p-8 shadow-2xl animate-in zoom-in duration-300 ${scanFeedback === 'success' ? 'bg-green-500/90 shadow-green-500/50' : 'bg-red-500/90 shadow-red-500/50'}`}>
              {scanFeedback === 'success' ? <CheckCircle size={100} className="text-white" /> : <XCircle size={100} className="text-white" />}
            </div>
          </div>
        )}
        
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 via-blue-500 to-red-500 opacity-80"></div>
        
        <div className="flex items-center justify-between mb-8 mt-2">
          <h2 className="text-2xl font-black text-gray-800 flex items-center tracking-tight">
            <ScanLine className="mr-3 text-indigo-600" strokeWidth={2.5} size={28} />
            Scan & Actions
          </h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setQuickMode(!quickMode)}
              className={`p-2.5 rounded-full transition-all active:scale-95 flex items-center ${quickMode ? 'bg-amber-100 text-amber-600 shadow-inner' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}
              title={quickMode ? "Fast Mode On (Auto-submits Qty 1)" : "Fast Mode Off"}
            >
              <Zap size={22} className={quickMode ? "fill-amber-500" : ""} />
              {quickMode && <span className="ml-1 text-sm font-bold">FAST</span>}
            </button>
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-gray-400 hover:text-indigo-600 p-2.5 rounded-full hover:bg-indigo-50 transition-all active:scale-95"
              title={soundEnabled ? "Mute Sounds" : "Enable Sounds"}
            >
              {soundEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          <button
            type="button"
            onClick={() => { setMode('put'); setSelectedItem(null); setMessage(null); inputRef.current?.focus(); }}
            className={`flex flex-col items-center justify-center py-4 px-2 rounded-2xl border-2 transition-all duration-300 active:scale-95 ${
              mode === 'put' 
                ? 'border-green-500 bg-green-50 text-green-700 shadow-lg shadow-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-green-200 hover:bg-green-50/30'
            }`}
          >
            <ArrowDownCircle size={28} className={`mb-2 ${mode === 'put' ? 'opacity-100' : 'opacity-70'}`} strokeWidth={mode === 'put' ? 2.5 : 2} />
            <span className="font-extrabold text-sm sm:text-base tracking-wide">PUT</span>
          </button>
          
          <button
            type="button"
            onClick={() => { setMode('take'); setSelectedItem(null); setMessage(null); inputRef.current?.focus(); }}
            className={`flex flex-col items-center justify-center py-4 px-2 rounded-2xl border-2 transition-all duration-300 active:scale-95 ${
              mode === 'take' 
                ? 'border-red-500 bg-red-50 text-red-700 shadow-lg shadow-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-red-200 hover:bg-red-50/30'
            }`}
          >
            <ArrowUpCircle size={28} className={`mb-2 ${mode === 'take' ? 'opacity-100' : 'opacity-70'}`} strokeWidth={mode === 'take' ? 2.5 : 2} />
            <span className="font-extrabold text-sm sm:text-base tracking-wide">TAKE</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('count'); setSelectedItem(null); setMessage(null); inputRef.current?.focus(); }}
            className={`flex flex-col items-center justify-center py-4 px-2 rounded-2xl border-2 transition-all duration-300 active:scale-95 ${
              mode === 'count' 
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg shadow-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-blue-200 hover:bg-blue-50/30'
            }`}
          >
            <ClipboardList size={28} className={`mb-2 ${mode === 'count' ? 'opacity-100' : 'opacity-70'}`} strokeWidth={mode === 'count' ? 2.5 : 2} />
            <span className="font-extrabold text-sm sm:text-base tracking-wide">COUNT</span>
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-start animate-in fade-in slide-in-from-top-2 shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.type === 'success' ? <CheckCircle size={20} className="mr-3 flex-shrink-0 mt-0.5 text-green-600" /> : <AlertCircle size={20} className="mr-3 flex-shrink-0 mt-0.5 text-red-600" />}
            <span className="font-semibold text-sm sm:text-base leading-snug">{message.text}</span>
          </div>
        )}

        {/* Scanner Input / Item Details */}
        {!selectedItem ? (
          <div className="space-y-4">
            <form onSubmit={handleScan}>
              <div className={`relative transition-all duration-500 ${showCamera ? 'bg-black p-4' : 'bg-slate-50/50 p-8 border-2 border-dashed border-indigo-200 hover:bg-slate-50 hover:border-indigo-300'} rounded-3xl text-center overflow-hidden min-h-[320px] flex flex-col items-center justify-center group`}>
                {!showCamera ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <ScanLine size={64} className="mx-auto text-indigo-300 mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:text-indigo-400" strokeWidth={1.5} />
                    <label className="block text-slate-700 font-bold mb-4 text-xl tracking-tight relative z-10">Scan Barcode or Type Code</label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={scannedCode}
                      onChange={(e) => setScannedCode(e.target.value)}
                      placeholder="Scan code..."
                      className="w-full max-w-sm mx-auto p-4 border-2 border-white shadow-sm rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-center font-mono text-2xl font-bold text-slate-800 transition-all outline-none relative z-10 bg-white"
                      autoFocus
                      autoComplete="off"
                    />
                    <p className="text-slate-400 text-sm mt-5 font-medium relative z-10">Scanner hardware should automatically Enter</p>
                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="mt-8 inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 hover:shadow-indigo-600/40 active:scale-95 transition-all relative z-10"
                    >
                      <Camera className="mr-2" size={22} />
                      Use Device Camera
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <style>{`
                      #reader { border: none !important; background: transparent !important; }
                      #reader img { display: none !important; }
                      #reader__dashboard_section_csr { display: none !important; }
                      #reader__dashboard_section_swaplink { display: none !important; }
                      @keyframes scan {
                        0% { top: 2rem; opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { top: calc(100% - 2rem); opacity: 0; }
                      }
                      .animate-scan-line {
                        animation: scan 2s linear infinite;
                      }
                    `}</style>
                    <div className="w-full max-w-md mx-auto aspect-square relative rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20 [&_video]:w-full [&_video]:h-full [&_video]:object-cover border-4 border-indigo-500/30 bg-black">
                      <div id="reader" className="w-full h-full border-none bg-black"></div>
                      
                      {/* Scanning Overlay UI overlaying the video */}
                      <div className="absolute inset-0 pointer-events-none z-10">
                        {/* Corner brackets */}
                        <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-2xl"></div>
                        <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-2xl"></div>
                        <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-2xl"></div>
                        <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-2xl"></div>
                        {/* Scanning Line Animation */}
                        <div className="absolute left-8 right-8 h-1 bg-indigo-400 shadow-[0_0_15px_4px_rgba(99,102,241,0.8)] rounded-full opacity-90 animate-scan-line"></div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCamera(false)}
                      className="mt-6 inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-md text-white font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-white/20"
                    >
                      <XCircle className="mr-2" size={22} />
                      Cancel Camera
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmitAction} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-5 rounded-2xl border-2 border-indigo-100 shadow-inner">
              <div className="mb-4 sm:mb-0">
                <h3 className="font-black text-slate-800 text-2xl tracking-tight">{selectedItem.name}</h3>
                <div className="flex items-center mt-2 space-x-3">
                   <span className="bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-md text-sm font-mono font-bold shadow-sm">{selectedItem.code}</span>
                   {selectedItem.location && (
                     <span className="flex items-center text-indigo-700 bg-indigo-100/50 border border-indigo-200 px-2.5 py-1 rounded-md text-sm font-bold shadow-sm">
                       <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                       {selectedItem.location}
                     </span>
                   )}
                </div>
              </div>
              <div className="text-left sm:text-right bg-white p-3 rounded-xl shadow-sm border border-slate-200 w-full sm:w-auto">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Stock Level</p>
                <div className="flex items-baseline space-x-1 sm:justify-end">
                   <span className="text-4xl font-black text-slate-800 tracking-tighter">{selectedItem.currentStock}</span>
                   <span className="text-sm font-bold text-slate-500 uppercase">{selectedItem.uom}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wide">
                  {mode === 'count' ? 'Actual Count' : 'Quantity to ' + (mode === 'put' ? 'Add' : 'Remove')}
                </label>
                <div className="relative">
                  <input
                    ref={qtyRef}
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-4 border-2 border-indigo-100 bg-indigo-50/30 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white text-3xl font-black text-center text-indigo-900 transition-all outline-none"
                    autoComplete="off"
                  />
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none">
                    <span className="text-indigo-400 font-bold">{selectedItem.uom}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wide">
                  {mode === 'put' ? 'Supplier Name' : mode === 'take' ? 'Destination/Reason' : 'Notes (Optional)'}
                </label>
                <input
                  type="text"
                  required={mode !== 'count'}
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-100 focus:border-slate-400 text-lg font-medium text-slate-800 transition-all outline-none bg-slate-50 focus:bg-white h-full"
                  placeholder={mode === 'put' ? 'Enter supplier...' : mode === 'take' ? 'Where is this going?' : 'Optional notes...'}
                />
              </div>
            </div>

            <div className="flex space-x-4 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 hover:text-slate-900 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 text-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-[2] py-4 text-white font-black rounded-xl flex justify-center shadow-lg active:scale-95 transition-all text-xl ${
                  mode === 'put' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20 hover:shadow-green-500/40 text-shadow-sm' :
                  mode === 'take' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20 hover:shadow-red-500/40 text-shadow-sm' :
                  'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20 hover:shadow-blue-500/40 text-shadow-sm'
                }`}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={28} />
                ) : (
                  <span className="flex items-center">
                     {mode === 'put' ? <ArrowDownCircle className="mr-2" size={24}/> :
                      mode === 'take' ? <ArrowUpCircle className="mr-2" size={24}/> :
                      <ClipboardList className="mr-2" size={24}/> }
                     CONFIRM {mode.toUpperCase()}
                  </span>
                )}
              </button>
            </div>
            
          </form>
        )}
      </div>

      {/* Right Column: Recent Scans */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 lg:w-96 flex-shrink-0 flex flex-col h-full min-h-[400px]">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center tracking-tight">
          <History className="mr-3 text-indigo-500" size={24} strokeWidth={2.5} />
          Recent Scans
        </h3>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 -mx-2 px-2 scrollbar-thin">
          {recentScans.length === 0 ? (
            <div className="text-center text-slate-400 py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <ClipboardList size={48} className="mx-auto mb-4 opacity-30" strokeWidth={1} />
              <p className="font-medium">No recent scans.</p>
              <p className="text-sm mt-1 opacity-70">Scanned items will appear here.</p>
            </div>
          ) : (
            recentScans.map((scan, idx) => (
              <div key={scan.id} className={`p-4 rounded-2xl border-2 transition-all hover:-translate-y-0.5 ${scan.success ? 'bg-white border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md' : 'bg-red-50 border-red-100 shadow-sm shadow-red-100/50'}`} style={{animationDelay: `${idx * 50}ms`}}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-800 truncate pr-3 text-base" title={scan.itemName}>{scan.itemName}</span>
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded-full">{scan.time}</span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-widest ${
                    scan.mode === 'put' ? 'bg-green-100 text-green-800' :
                    scan.mode === 'take' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {scan.mode.toUpperCase()}
                  </span>
                  <span className="font-black text-slate-700 font-mono text-lg flex items-baseline">
                    <span className="text-xs text-slate-400 font-sans font-bold mr-1">QTY</span>
                    {scan.qty}
                  </span>
                </div>
                {!scan.success && (
                  <p className="text-red-500 text-xs font-bold mt-3 flex items-center bg-red-100/50 p-2 rounded-lg">
                    <AlertCircle size={14} className="mr-1.5" /> FAILED
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerOperations;
