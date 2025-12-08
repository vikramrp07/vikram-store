import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { InwardForm } from './components/InwardForm';
import { OutwardForm } from './components/OutwardForm';
import { MasterList } from './components/MasterList';
import { Logs } from './components/Logs';
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Database, FileText, Menu, X, Box, Settings, Link as LinkIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import { useInventory } from './context/InventoryContext';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const { isConnected, setConnectionUrl, connectionError } = useInventory();
  const [apiUrlInput, setApiUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inward', label: 'Inward Stock', icon: ArrowDownCircle },
    { id: 'outward', label: 'Outward Stock', icon: ArrowUpCircle },
    { id: 'master', label: 'Master List', icon: Database },
    { id: 'logs', label: 'Transaction Logs', icon: FileText },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'inward': return <InwardForm />;
      case 'outward': return <OutwardForm />;
      case 'master': return <MasterList />;
      case 'logs': return <Logs />;
      default: return <Dashboard />;
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');

    const trimmedUrl = apiUrlInput.trim();
    if (!trimmedUrl.includes('script.google.com')) {
      setUrlError('Invalid URL: Must be a Google Apps Script URL.');
      return;
    }
    if (!trimmedUrl.endsWith('/exec')) {
      setUrlError('Warning: Web App URL usually ends with "/exec". Did you paste the correct link?');
      // We allow it but warn, as sometimes custom domains exist
    }

    setConnectionUrl(trimmedUrl);
    setShowSettings(false);
    alert("Connection saved! The app will now attempt to sync.");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100 flex items-center">
          <div className="bg-blue-600 p-2 rounded-lg mr-3">
             <Box className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">VIKRAM STORE</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-blue-50 text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-2">
           {connectionError && (
             <div className="bg-red-50 p-3 rounded-lg border border-red-100 mb-2">
               <div className="flex items-center text-red-700 mb-1">
                 <AlertTriangle size={16} className="mr-2"/>
                 <span className="text-xs font-bold">Connection Error</span>
               </div>
               <p className="text-xs text-red-600 leading-tight">{connectionError}</p>
             </div>
           )}

           <button 
             onClick={() => setShowSettings(true)}
             className={`w-full p-3 rounded-lg text-xs flex items-center space-x-2 transition-colors ${isConnected && !connectionError ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
           >
              {isConnected && !connectionError ? <CheckCircle size={16} /> : <Settings size={16} />}
              <div className="text-left">
                <p className="font-semibold">{isConnected ? (connectionError ? 'Connection Failed' : 'Sheet Connected') : 'Connect Sheet'}</p>
                <p className="opacity-80">{isConnected ? (connectionError ? 'Check settings' : 'Data syncing live') : 'Using local demo data'}</p>
              </div>
           </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed w-full z-20 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Box className="text-blue-600 mr-2" size={24} />
          <h1 className="text-lg font-bold text-gray-800">VIKRAM STORE</h1>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-600">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-10 bg-white pt-20 px-4 space-y-2 animate-fade-in">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-4 rounded-lg border ${
                activeTab === item.id 
                  ? 'bg-blue-50 border-blue-100 text-blue-600' 
                  : 'border-transparent text-gray-600'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          <button
              onClick={() => {
                setShowSettings(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-4 rounded-lg border border-transparent text-gray-600 bg-gray-50"
            >
              <Settings size={20} />
              <span className="font-medium">Connection Settings</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-8 w-full">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 hidden md:block">
            <h2 className="text-2xl font-bold text-gray-800">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p className="text-gray-500 text-sm">Manage your store inventory efficiently.</p>
          </header>
          {renderContent()}
        </div>
      </main>

      {/* Connection Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-scale-up">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <LinkIcon className="mr-2" size={20} /> Connect Google Sheet
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4 space-y-2">
                 <p><strong>Step 1:</strong> Create a Google Sheet & go to <em>Extensions &gt; Apps Script</em>.</p>
                 <p><strong>Step 2:</strong> Paste the backend code provided in <code>GoogleAppsScript.js</code>.</p>
                 <p><strong>Step 3:</strong> Deploy as Web App.</p>
                 <ul className="list-disc pl-5 text-xs mt-1">
                   <li>Execute as: <strong>Me</strong></li>
                   <li>Who has access: <strong>Anyone</strong> (Critical!)</li>
                 </ul>
                 <p><strong>Step 4:</strong> Paste the Web App URL below.</p>
              </div>

              <form onSubmit={handleConnect}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Web App URL</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2 text-sm"
                />
                
                {urlError && (
                  <div className="flex items-center text-red-600 text-xs mb-4 bg-red-50 p-2 rounded">
                    <AlertTriangle size={14} className="mr-1" />
                    {urlError}
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-4">
                   <button 
                     type="button" 
                     onClick={() => {
                        setConnectionUrl(''); 
                        setShowSettings(false);
                     }}
                     className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                   >
                     Disconnect
                   </button>
                   <button 
                     type="submit"
                     className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                   >
                     Save Connection
                   </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;