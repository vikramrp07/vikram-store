import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { LogOut, CheckCircle, AlertCircle, Package, Search, X, FileSpreadsheet, Upload, Download } from 'lucide-react';
import { Item, OutwardEntry } from '../types';
import * as XLSX from 'xlsx';

export const OutwardForm: React.FC = () => {
  const { items, processOutward, processBulkOutward } = useInventory();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Single Entry State
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState('');
  const [customer, setCustomer] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [uom, setUom] = useState('');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Filter items based on search term
  const filteredItems = items.filter(i => 
    i.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Bulk Import State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ success: number; errors: number; msg: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill and Context Validation based on itemCode
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

  const handleSelectItem = (item: Item) => {
    setItemCode(item.code);
    setSearchTerm('');
    setError(null);
  };

  const clearSelection = () => {
    setItemCode('');
    setSearchTerm('');
    setQty('');
  };

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
        date: transactionDate,
      });
      setSuccess(true);
      
      // Reset form
      setItemCode('');
      setSearchTerm(''); // Clear search too
      setQty('');
      setCustomer('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Error processing outward");
    } finally {
      setLoading(false);
    }
  };

  // Handle Template Download
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Item Code': 'IT001', 'Quantity': 5, 'Customer': 'Project Alpha', 'Date (YYYY-MM-DD)': '2023-10-27' },
      { 'Item Code': 'IT002', 'Quantity': 10, 'Customer': 'Sales Dept', 'Date (YYYY-MM-DD)': '' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Outward_Template");
    XLSX.writeFile(wb, "Outward_Bulk_Template.xlsx");
  };

  // Handle Bulk File Upload
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert("Please select a file first.");
      return;
    }

    setBulkLoading(true);
    setBulkResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) {
          alert("Sheet is empty!");
          setBulkLoading(false);
          return;
        }

        const entries: OutwardEntry[] = jsonData.map((row: any) => {
           // Normalize keys
           const r: any = {};
           Object.keys(row).forEach(key => r[key.toLowerCase().trim()] = row[key]);

           let dateStr = undefined;
           const dateVal = r['date'] || r['date (yyyy-mm-dd)'];
           if (dateVal) {
             if (dateVal instanceof Date) {
               if (!isNaN(dateVal.getTime())) {
                 dateStr = dateVal.toISOString().split('T')[0];
               }
             } else {
               dateStr = String(dateVal).trim();
             }
           }

           return {
             itemCode: String(r['item code'] || r['code'] || '').trim(),
             quantity: Number(r['quantity'] || r['qty'] || 0),
             customer: String(r['customer'] || r['project'] || r['department'] || r['party'] || '').trim(),
             date: dateStr,
           };
        });

        const result = await processBulkOutward(entries);
        setBulkResult({
          success: result.successCount,
          errors: result.errorCount,
          msg: result.errors
        });
        
        if (result.successCount > 0 && result.errorCount === 0) {
           setBulkFile(null);
           if (fileInputRef.current) fileInputRef.current.value = '';
        }

      } catch (error: any) {
        console.error(error);
        alert(`Failed to process file: ${error.message || "Unknown error"}`);
      } finally {
        setBulkLoading(false);
      }
    };
    reader.readAsArrayBuffer(bulkFile);
  };

  const isInvalid = Number(qty) > currentStock;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      
      {/* Tab Switcher */}
      <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-100 flex">
        <button 
          onClick={() => setActiveTab('single')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'single' 
              ? 'bg-orange-50 text-orange-700 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Single Issue
        </button>
        <button 
          onClick={() => setActiveTab('bulk')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'bulk' 
              ? 'bg-orange-50 text-orange-700 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Bulk Issue (Excel)
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-orange-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg flex items-center">
            {activeTab === 'single' ? <LogOut className="mr-2" /> : <FileSpreadsheet className="mr-2" />}
            {activeTab === 'single' ? 'Outward / Issue Stock' : 'Bulk Outward Processing'}
          </h2>
          <span className="text-orange-100 text-sm bg-orange-700 px-2 py-1 rounded">
            {new Date().toLocaleDateString()}
          </span>
        </div>

        {activeTab === 'single' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center text-sm animate-fade-in border border-red-100">
                <AlertCircle size={16} className="mr-2 flex-shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Search & Select Item</label>
              
              {!itemCode ? (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="text-gray-400" size={18} />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search item code or name..."
                      className="w-full pl-10 pr-4 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-white">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50 text-gray-800 sticky top-0 shadow-sm">
                        <tr>
                          <th className="p-3 font-medium">Item Code</th>
                          <th className="p-3 font-medium">Name</th>
                          <th className="p-3 text-right font-medium">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredItems.length === 0 ? (
                          <tr><td colSpan={3} className="p-4 text-center text-gray-500">No items found</td></tr>
                        ) : (
                          filteredItems.map(item => (
                            <tr 
                              key={item.code} 
                              onClick={() => handleSelectItem(item)}
                              className={`cursor-pointer hover:bg-orange-50 transition-colors ${item.currentStock === 0 ? 'opacity-60 bg-gray-50' : ''}`}
                            >
                              <td className="p-3 font-medium text-gray-900">{item.code}</td>
                              <td className="p-3">{item.name}</td>
                              <td className={`p-3 text-right font-semibold ${item.currentStock > 0 ? 'text-gray-700' : 'text-red-500'}`}>
                                {item.currentStock} {item.uom}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center p-4 border border-orange-200 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white rounded-lg border border-orange-100">
                      <Package className="text-orange-600" size={24} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900">{itemName}</p>
                      <p className="text-sm text-gray-500">Code: {itemCode}</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={clearSelection}
                    className="flex items-center space-x-1 text-sm text-orange-600 hover:text-orange-800 font-medium px-3 py-1.5 bg-white rounded-md border border-orange-200 hover:bg-orange-100 transition-colors"
                  >
                    <X size={16} />
                    <span>Change Item</span>
                  </button>
                </div>
              )}
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
                     {!itemCode && <span className="text-xs text-gray-400">Search and select an item above</span>}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Date</label>
                <input 
                  type="date" 
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

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
        ) : (
          <div className="p-6 space-y-6">
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-orange-800">Bulk Issue via Excel</h3>
                <p className="text-sm text-orange-600 mt-1">Upload an Excel file (.xlsx) to process multiple outward transactions at once.</p>
              </div>
              <button 
                onClick={downloadTemplate}
                className="flex items-center px-4 py-2 bg-white border border-orange-200 text-orange-700 rounded-md hover:bg-orange-50 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
              >
                <Download size={16} className="mr-2" /> Download Template
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                id="bulk-upload"
                ref={fileInputRef}
                onChange={(e) => setBulkFile(e.target.files ? e.target.files[0] : null)}
              />
              <label htmlFor="bulk-upload" className="cursor-pointer flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
                  <Upload size={32} />
                </div>
                <span className="text-lg font-medium text-gray-700">
                  {bulkFile ? bulkFile.name : 'Click to select Excel file'}
                </span>
                <span className="text-sm text-gray-500 mt-2">or drag and drop here</span>
              </label>
            </div>

            {bulkFile && (
              <button
                onClick={handleBulkUpload}
                disabled={bulkLoading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center disabled:opacity-50 shadow-sm"
              >
                {bulkLoading ? 'Processing File...' : 'Upload and Process Bulk Issue'}
              </button>
            )}

            {bulkResult && (
              <div className={`p-4 rounded-lg border ${bulkResult.errors > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <h4 className={`font-semibold mb-2 ${bulkResult.errors > 0 ? 'text-red-800' : 'text-green-800'}`}>
                  Processing Complete
                </h4>
                <div className="flex space-x-6 text-sm mb-3">
                  <span className="text-green-600 font-medium flex items-center"><CheckCircle size={16} className="mr-1"/> {bulkResult.success} Successful</span>
                  {bulkResult.errors > 0 && <span className="text-red-600 font-medium flex items-center"><AlertCircle size={16} className="mr-1"/> {bulkResult.errors} Failed</span>}
                </div>
                
                {bulkResult.msg.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto text-sm text-red-600 bg-white bg-opacity-50 p-2 rounded border border-red-100">
                    <ul className="list-disc pl-5 space-y-1">
                      {bulkResult.msg.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Important Notes:</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Ensure the column headers exactly match the template.</li>
                <li><code className="bg-gray-200 px-1 rounded">Item Code</code>, <code className="bg-gray-200 px-1 rounded">Quantity</code>, and <code className="bg-gray-200 px-1 rounded">Customer</code> are mandatory.</li>
                <li><code className="bg-gray-200 px-1 rounded">Date (YYYY-MM-DD)</code> is optional. If left blank, the current date is used.</li>
                <li>Items must exist in the inventory and have sufficient stock before they can be issued.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};