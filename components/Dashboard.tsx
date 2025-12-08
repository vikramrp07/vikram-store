import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { generateInventoryInsight } from '../services/geminiService';
import { Package, AlertTriangle, Activity, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const Dashboard: React.FC = () => {
  const { items, logs } = useInventory();
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const totalStock = items.reduce((acc, item) => acc + item.currentStock, 0);
  const lowStockCount = items.filter(item => item.currentStock < 15).length;
  
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
    const result = await generateInventoryInsight(items, logs);
    setInsight(result);
    setLoadingInsight(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Cards */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Package size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total Stock Units</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalStock}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Low Stock Alerts</p>
            <h3 className="text-2xl font-bold text-gray-800">{lowStockCount}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <TrendingUp size={20} className="mr-2 text-gray-500" />
            Top Inventory Items
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  cursor={{ fill: '#F3F4F6' }}
                />
                <Bar dataKey="stock" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm border border-indigo-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-indigo-900 flex items-center">
              <Sparkles size={20} className="mr-2 text-indigo-500" />
              AI Stock Analyst
            </h3>
            <button 
              onClick={handleGenerateInsight}
              disabled={loadingInsight}
              className="px-3 py-1 bg-white hover:bg-indigo-50 text-indigo-600 text-xs font-medium rounded-md border border-indigo-200 transition-colors flex items-center"
            >
              {loadingInsight ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
              {insight ? 'Refresh' : 'Generate'}
            </button>
          </div>
          <div className="text-sm text-indigo-800 leading-relaxed min-h-[200px]">
            {insight ? (
              <div className="whitespace-pre-line">{insight}</div>
            ) : (
              <p className="text-indigo-400 italic text-center mt-10">
                Click generate to let Gemini analyze your inventory health, stock levels, and suggest reordering strategies.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};