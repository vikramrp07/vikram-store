import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { generateInventoryInsight } from '../services/geminiService';
import { Package, AlertTriangle, Activity, TrendingUp, Sparkles, Loader2, RefreshCw, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const Dashboard: React.FC = () => {
  const { items, logs } = useInventory();
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(() => {
    const saved = localStorage.getItem('lowStockThreshold');
    return saved ? parseInt(saved, 10) : 15;
  });
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);

  const totalStock = items.reduce((acc, item) => acc + item.currentStock, 0);
  const lowStockCount = items.filter(item => item.currentStock < lowStockThreshold).length;
  
  // Data for chart (Top 5 items by stock)
  const chartData = [...items]
    .sort((a, b) => b.currentStock - a.currentStock)
    .slice(0, 5)
    .map(item => ({
      name: item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name,
      stock: item.currentStock
    }));

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    try {
      const result = await generateInventoryInsight(items, logs);
      setInsight(result);
    } catch (e) {
      setInsight("Failed to load insights. Please try again.");
    } finally {
      setLoadingInsight(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Cards */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 transition-transform hover:scale-[1.02]">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Package size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total Stock Units</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalStock}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 transition-transform hover:scale-[1.02] relative">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <p className="text-gray-500 text-sm">Low Stock Alerts</p>
              <button 
                onClick={() => setIsEditingThreshold(!isEditingThreshold)} 
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                title="Configure Threshold"
              >
                <Settings size={14} />
              </button>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{lowStockCount}</h3>
            
            {isEditingThreshold && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 shadow-lg rounded-lg p-3 z-10 w-48 animate-fade-in">
                <label className="block text-xs font-medium text-gray-700 mb-1">Alert Threshold</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="number" 
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 0) {
                        setLowStockThreshold(val);
                        localStorage.setItem('lowStockThreshold', val.toString());
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button 
                    onClick={() => setIsEditingThreshold(false)}
                    className="px-2 py-1.5 bg-blue-50 text-blue-600 rounded-md text-xs font-medium hover:bg-blue-100"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 transition-transform hover:scale-[1.02]">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Recent Transactions</p>
            <h3 className="text-2xl font-bold text-gray-800">{logs.length}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <TrendingUp size={20} className="mr-2 text-gray-500" />
            Top Inventory Items
          </h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: '#6B7280' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6B7280' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  cursor={{ fill: '#F9FAFB' }}
                />
                <Bar dataKey="stock" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm border border-indigo-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-indigo-900 flex items-center">
              <Sparkles size={20} className="mr-2 text-indigo-500" />
              AI Stock Analyst
            </h3>
            <button 
              onClick={handleGenerateInsight}
              disabled={loadingInsight}
              className="px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg border border-indigo-200 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingInsight ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  <span>{insight ? 'Refresh Analysis' : 'Generate Insights'}</span>
                </>
              )}
            </button>
          </div>
          
          <div className="flex-1 bg-white/60 rounded-xl p-5 border border-indigo-100/50 backdrop-blur-sm overflow-y-auto max-h-[300px]">
            {insight ? (
              <div className="prose prose-sm prose-indigo max-w-none text-indigo-900">
                 {/* Simple rendering splitting by newlines for paragraphs */}
                 {insight.split('\n').map((line, i) => (
                   <p key={i} className={`mb-2 ${line.trim().startsWith('-') || line.trim().startsWith('•') ? 'pl-4' : ''}`}>
                     {line}
                   </p>
                 ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="bg-indigo-100 p-4 rounded-full mb-3">
                  <Sparkles size={32} className="text-indigo-400" />
                </div>
                <h4 className="text-indigo-900 font-medium mb-1">Unlock Inventory Intelligence</h4>
                <p className="text-indigo-400 text-sm max-w-xs">
                  Click the button to let Gemini analyze your stock levels and suggest reordering strategies.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};