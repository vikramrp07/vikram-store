import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { LogOut, CheckCircle, AlertCircle, Package } from 'lucide-react';

export const OutwardForm: React.FC = () => {
  const { items, processOutward } = useInventory();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState('');
  const [customer, setCustomer] = useState('');
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [uom, setUom] = useState('');

  // Auto-fill and Context Validation
  useEffect(() => {
    const foundItem = items.find(i => i.code === itemCode);
    if (foundItem) {
      setItemName(foundItem.name);
      setCurrentStock(foundItem.currentStock);
      setUom(foundItem.uom);
      
      // Re-validate current quantity against new stock level
      if (qty && Number(qty) > foundItem.currentStock) {
        setError(`Insufficient stock. Only ${foundItem.currentStock} ${foundItem.uom} available.`);
      } else {
        setError(null);
      }
    } else {
      setItemName('');
      setCurrentStock(0);
      setUom('');
      setError(null);
    }
  }, [itemCode, items]);

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQty(val);
    
    // Immediate validation
    if (itemCode && Number(val) > currentStock) {
       setError(`Cannot issue ${val}. Only ${currentStock} ${uom} available.`);
    } else {
       if (error && error.includes("issue")) {
          setError(null);
       }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (Number(qty) > currentStock) {
      setError(`Cannot issue ${qty}. Only ${currentStock} ${uom} available.`);
      return;
    }

    setLoading(true);
    try {
      await processOutward({
        itemCode,
        quantity: Number(qty),
        customer,
      });
      setSuccess(true);
      // Reset form
      setItemCode('');
      setQty('');
      setCustomer('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Error processing outward");
    } finally {
      setLoading(false);
    }
  };

  const isInvalid = Number(qty) > currentStock;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-orange-600 px-6 py-4 flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg flex items-center">
          <LogOut className="mr-2" /> Outward / Issue Stock
        </h2>
        <span className="text-orange-100 text-sm bg-orange-700 px-2 py-1 rounded">
          {new Date().toLocaleDateString()}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center text-sm animate-fade-in border border-red-100">
            <AlertCircle size={16} className="mr-2 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Item</label>
            <select 
              required
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white transition-shadow"
            >
              <option value="">-- Choose Item --</option>
              {items.map(i => <option key={i.code} value={i.code}>{i.code} - {i.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
            <input 
              type="text" 
              disabled
              value={itemName}
              className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              placeholder="Auto-populated"
            />
          </div>
        </div>

        {/* Prominent Stock Display */}
        <div className={`p-5 rounded-xl border transition-all duration-300 transform ${
          itemCode 
            ? (currentStock > 0 
                ? 'bg-blue-50 border-blue-200 shadow-sm translate-y-0 opacity-100' 
                : 'bg-red-50 border-red-200 shadow-sm translate-y-0 opacity-100')
            : 'bg-gray-50 border-dashed border-gray-200'
        }`}>
          <div className="flex justify-between items-center">
             <div className="flex items-center space-x-3">
               <div className={`p-2 rounded-full ${itemCode && currentStock > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                 <Package size={24} />
               </div>
               <div>
                 <span className={`block text-xs font-semibold uppercase tracking-wide ${itemCode ? 'text-gray-500' : 'text-gray-400'}`}>
                   Available Stock
                 </span>
                 {!itemCode && <span className="text-xs text-gray-400">Select an item to view stock</span>}
               </div>
             </div>
             
             {itemCode && (
               <div className="text-right">
                  <span className={`text-3xl font-bold ${currentStock > 0 ? 'text-blue-700' : 'text-red-600'}`}>
                    {currentStock}
                  </span>
                  <span className="ml-1 text-sm font-medium text-gray-500">{uom}</span>
               </div>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Out</label>
            <input 
              type="number" 
              required
              min="1"
              max={currentStock}
              value={qty}
              onChange={handleQtyChange}
              disabled={!itemCode || currentStock === 0}
              className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                isInvalid && qty 
                  ? 'border-red-500 focus:ring-red-200 bg-red-50' 
                  : 'border-gray-300 focus:ring-orange-500'
              } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer / Department</label>
            <input 
              type="text" 
              required
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
              placeholder="e.g. Sales Dept"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading || currentStock === 0 || isInvalid || !itemCode}
          className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3.5 rounded-lg transition-colors flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          {loading ? (
             <span className="flex items-center">Processing...</span>
          ) : success ? (
             <span className="flex items-center"><CheckCircle className="mr-2"/> Issued Successfully</span>
          ) : (
             <span className="flex items-center"><LogOut className="mr-2" size={18}/> Issue Stock</span>
          )}
        </button>
      </form>
    </div>
  );
};