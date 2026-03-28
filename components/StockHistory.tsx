import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ArrowDownLeft, ArrowUpRight, Search, History } from 'lucide-react';

export const StockHistory: React.FC = () => {
  const { items, logs } = useInventory();
  const [selectedItemCode, setSelectedItemCode] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItemLogs = logs.filter(log => log.itemCode === selectedItemCode);
  const selectedItem = items.find(item => item.code === selectedItemCode);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <History size={20} className="mr-2 text-gray-500" />
          Select Item to View History
        </h3>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search item by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>
          <select
            value={selectedItemCode}
            onChange={(e) => setSelectedItemCode(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
          >
            <option value="">-- Select an Item --</option>
            {filteredItems.map(item => (
              <option key={item.code} value={item.code}>
                {item.code} - {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedItemCode && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div>
              <h4 className="text-lg font-bold text-gray-800">{selectedItem?.name}</h4>
              <p className="text-sm text-gray-500">Code: {selectedItem?.code} | Category: {selectedItem?.category}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current Stock</p>
              <p className="text-2xl font-bold text-blue-600">{selectedItem?.currentStock} <span className="text-sm font-normal text-gray-500">{selectedItem?.uom}</span></p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-white text-gray-800 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Type</th>
                  <th className="p-4 font-semibold">Party/Reason</th>
                  <th className="p-4 text-right font-semibold">Quantity</th>
                  <th className="p-4 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedItemLogs.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">No history found for this item.</td></tr>
                ) : (
                  selectedItemLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-500 text-xs">
                        {new Date(log.date).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          log.type === 'INWARD' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {log.type === 'INWARD' ? <ArrowDownLeft size={12} className="mr-1"/> : <ArrowUpRight size={12} className="mr-1"/>}
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-gray-700">{log.partyName}</td>
                      <td className={`p-4 text-right font-bold ${log.type === 'INWARD' ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {log.type === 'INWARD' ? '+' : '-'}{log.quantity}
                      </td>
                      <td className="p-4 text-right text-gray-600 font-medium">{log.stockAfter}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
