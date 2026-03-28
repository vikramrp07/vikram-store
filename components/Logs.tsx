import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Download, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';

export const Logs: React.FC = () => {
  const { logs, exportData, exportDailyReport } = useInventory();
  const [filterType, setFilterType] = useState('ALL');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredLogs = logs.filter(log => filterType === 'ALL' || log.type === filterType);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex space-x-2">
          <button 
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterType === 'ALL' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilterType('INWARD')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterType === 'INWARD' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            Inward
          </button>
          <button 
            onClick={() => setFilterType('OUTWARD')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterType === 'OUTWARD' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            Outward
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Calendar size={16} className="text-gray-500 mr-2" />
            <input 
              type="date" 
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="text-sm text-gray-700 outline-none bg-transparent"
            />
          </div>
          <button 
            onClick={() => exportDailyReport(new Date(reportDate))}
            className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg border border-blue-200 text-sm font-medium transition-colors shadow-sm"
          >
            <Download size={16} />
            <span>Daily Report</span>
          </button>
          <button 
            onClick={exportData}
            className="flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium transition-colors shadow-sm"
          >
            <Download size={16} />
            <span>Export All</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-800">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Item</th>
                <th className="p-4">Party</th>
                <th className="p-4 text-right">Quantity</th>
                <th className="p-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No transactions recorded yet.</td></tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-4 text-gray-500 text-xs">
                      {new Date(log.date).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        log.type === 'INWARD' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {log.type === 'INWARD' ? <ArrowDownLeft size={12} className="mr-1"/> : <ArrowUpRight size={12} className="mr-1"/>}
                        {log.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{log.itemCode}</div>
                      <div className="text-xs text-gray-500">{log.itemName}</div>
                    </td>
                    <td className="p-4">{log.partyName}</td>
                    <td className={`p-4 text-right font-medium ${log.type === 'INWARD' ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {log.type === 'INWARD' ? '+' : '-'}{log.quantity}
                    </td>
                    <td className="p-4 text-right text-gray-500">{log.stockAfter}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};