import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { InwardForm } from './components/InwardForm';
import { OutwardForm } from './components/OutwardForm';
import { MasterList } from './components/MasterList';
import { Logs } from './components/Logs';
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Database, FileText, Menu, X, Box } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100 flex items-center">
          <div className="bg-blue-600 p-2 rounded-lg mr-3">
             <Box className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">InventoryFlow</h1>
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
        <div className="p-4 border-t border-gray-100">
           <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
              <p className="font-semibold mb-1">Google Sheets Mode</p>
              <p>Data is currently stored locally. Deploy backend to connect live.</p>
           </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed w-full z-20 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Box className="text-blue-600 mr-2" size={24} />
          <h1 className="text-lg font-bold text-gray-800">InventoryFlow</h1>
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
    </div>
  );
};

export default App;