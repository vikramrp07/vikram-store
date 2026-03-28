import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { CATEGORIES, UNITS, InwardEntry, Item } from '../types';
import { Save, PlusCircle, CheckCircle, FileSpreadsheet, Download, Upload, AlertCircle, Package, Search, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export const InwardForm: React.FC = () => {
  const { items, processInward, processBulkInward } = useInventory();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Single Entry State
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [qty, setQty] = useState('');
  const [supplier, setSupplier] = useState('');
  const [uom, setUom] = useState(UNITS[0]);
  const [isNewItem, setIsNewItem] = useState(false);
  const [existingStock, setExistingStock] = useState<number | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Filter items based on search term
  const filteredItems = items.filter(i => 
    i.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatch = items.find(i => i.code.toLowerCase() === searchTerm.toLowerCase());

  const handleSelectItem = (item: Item) => {
    setItemCode(item.code);
    setSearchTerm('');
  };

  const handleAddNewItem = () => {
    if (searchTerm.trim().length > 2) {
      setItemCode(searchTerm.toUpperCase().trim());
      setSearchTerm('');
    } else {
      alert("New item code must be at least 3 characters long.");
    }
  };

  const clearSelection = () => {
    setItemCode('');
    setSearchTerm('');
    setQty('');
    setSupplier('');
  };

  // Bulk Import State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ success: number; errors: number; msg: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill logic for Single Entry
  useEffect(() => {
    const foundItem = items.find(i => i.code === itemCode);
    if (foundItem) {
      setItemName(foundItem.name);
      setCategory(foundItem.category);
      setUom(foundItem.uom);
      setExistingStock(foundItem.currentStock);
      setIsNewItem(false);
    } else {
      if (itemCode.length > 2) {
        setIsNewItem(true);
        setExistingStock(null);
      }
    }
  }, [itemCode, items]);

  // Handle Single Entry Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await processInward({
        itemCode,
        quantity: Number(qty),
        supplier,
        date: transactionDate,
        newItemDetails: isNewItem ? { name: itemName, category, uom } : undefined
      });
      setSuccess(true);
      setItemCode('');
      setItemName('');
      setQty('');
      setSupplier('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Error processing inward: " + err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Template Download
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Item Code': 'IT001', 'Quantity': 10, 'Supplier': 'Vendor A', 'Date (YYYY-MM-DD)': '2023-10-27', 'Item Name': '', 'Category': '', 'UoM': '' },
      { 'Item Code': 'NEW001', 'Quantity': 50, 'Supplier': 'Vendor B', 'Date (YYYY-MM-DD)': '', 'Item Name': 'New Widget', 'Category': 'Electronics', 'UoM': 'pcs' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inward_Template");
    XLSX.writeFile(wb, "Inward_Bulk_Template.xlsx");
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

        const entries: InwardEntry[] = jsonData.map((row: any) => {
           // Normalize keys
           const r: any = {};
           Object.keys(row).forEach(key => r[key.toLowerCase().trim()] = row[key]);

           let dateStr = undefined;
           const dateVal = r['date'] || r['date (yyyy-mm-dd)'];
           if (dateVal) {
             if (dateVal instanceof Date) {
               dateStr = dateVal.toISOString().split('T')[0];
             } else {
               dateStr = String(dateVal).trim();
             }
           }

           return {
             itemCode: String(r['item code'] || r['code'] || '').trim(),
             quantity: Number(r['quantity'] || r['qty'] || 0),
             supplier: String(r['supplier'] || r['vendor'] || r['party'] || '').trim(),
             date: dateStr,
             newItemDetails: {
               name: r['item name'] || r['name'] || r['item name (optional)'] ? String(r['item name'] || r['name'] || r['item name (optional)']).trim() : undefined,
               category: r['category'] || r['category (optional)'] ? String(r['category'] || r['category (optional)']).trim() : undefined,
               uom: r['uom'] || r['unit'] || r['uom (optional)'] ? String(r['uom'] || r['unit'] || r['uom (optional)']).trim() : undefined
             }
           };
        });

        const result = await processBulkInward(entries);
        setBulkResult({
          success: result.successCount,
          errors: result.errorCount,
          msg: result.errors
        });
        
        if (result.successCount > 0 && result.errorCount === 0) {
           setBulkFile(null);
           if (fileInputRef.current) fileInputRef.current.value = '';
        }

      } catch (error) {
        console.error(error);
        alert("Failed to process file.");
      } finally {
        setBulkLoading(false);
      }
    };
    reader.readAsArrayBuffer(bulkFile);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      
      {/* Tab Switcher */}
      <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-100 flex">
        <button 
          onClick={() => setActiveTab('single')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'single' 
              ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Single Entry
        </button>
        <button 
          onClick={() => setActiveTab('bulk')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'bulk' 
              ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Bulk Import (Excel)
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg flex items-center">
            {activeTab === 'single' ? <PlusCircle className="mr-2" /> : <FileSpreadsheet className="mr-2" />}
            {activeTab === 'single' ? 'Inward Stock Entry' : 'Bulk Inward Processing'}
          </h2>
          <span className="text-emerald-100 text-sm bg-emerald-700 px-2 py-1 rounded">
            {new Date().toLocaleDateString()}
          </span>
        </div>

        {activeTab === 'single' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                      placeholder="Search existing item or type new code..."
                      className="w-full pl-10 pr-4 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                        {searchTerm.trim().length > 2 && !exactMatch && (
                          <tr 
                            onClick={handleAddNewItem}
                            className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          >
                            <td colSpan={3} className="p-3 font-medium text-emerald-700 flex items-center">
                              <PlusCircle size={16} className="mr-2" />
                              Add as new item: "{searchTerm.toUpperCase()}"
                            </td>
                          </tr>
                        )}
                        {filteredItems.length === 0 && (!searchTerm || searchTerm.trim().length <= 2) ? (
                          <tr><td colSpan={3} className="p-4 text-center text-gray-500">Search to find items or type a new code</td></tr>
                        ) : (
                          filteredItems.map(item => (
                            <tr 
                              key={item.code} 
                              onClick={() => handleSelectItem(item)}
                              className="cursor-pointer hover:bg-emerald-50 transition-colors"
                            >
                              <td className="p-3 font-medium text-gray-900">{item.code}</td>
                              <td className="p-3">{item.name}</td>
                              <td className="p-3 text-right font-semibold text-gray-700">
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
                <div className="flex justify-between items-center p-4 border border-emerald-200 bg-emerald-50 rounded-lg mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white rounded-lg border border-emerald-100">
                      <Package className="text-emerald-600" size={24} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900">
                        {isNewItem ? 'New Item' : itemName}
                      </p>
                      <p className="text-sm text-gray-500">Code: {itemCode}</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={clearSelection}
                    className="flex items-center space-x-1 text-sm text-emerald-600 hover:text-emerald-800 font-medium px-3 py-1.5 bg-white rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <X size={16} />
                    <span>Change Item</span>
                  </button>
                </div>
              )}
            </div>

            {itemCode && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                    <input 
                      type="text" 
                      required
                      value={itemName}
                      readOnly={!isNewItem}
                      onChange={(e) => setItemName(e.target.value)}
                      className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none ${!isNewItem ? 'bg-gray-100' : ''}`}
                      placeholder="Enter item name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select 
                      disabled={!isNewItem}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-gray-100"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Unit (UoM)</label>
                     <select
                       disabled={!isNewItem}
                       value={uom}
                       onChange={(e) => setUom(e.target.value)}
                       className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-gray-100"
                     >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                     </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date</label>
                    <input 
                      type="date" 
                      required
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity In</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {existingStock !== null && (
                      <p className="text-xs text-gray-500 mt-1">Current Stock: {existingStock}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier / Vendor</label>
                    <input 
                      type="text" 
                      required
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center disabled:opacity-70"
                >
                  {loading ? (
                     <span className="flex items-center">Saving...</span>
                  ) : success ? (
                     <span className="flex items-center"><CheckCircle className="mr-2"/> Stock Added Successfully</span>
                  ) : (
                     <span className="flex items-center"><Save className="mr-2" size={18}/> Save to Inventory</span>
                  )}
                </button>
              </>
            )}
          </form>
        ) : (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 text-sm text-blue-900">
              <div className="flex items-center mb-3">
                <AlertCircle className="text-blue-600 mr-2" size={20} />
                <h3 className="font-bold text-base">Bulk Import Instructions</h3>
              </div>
              <p className="mb-3 text-blue-800">Upload an Excel (.xlsx) or CSV file with the following columns. Use the <strong>Download Template</strong> button for a pre-formatted file.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <div className="bg-white bg-opacity-60 p-3 rounded border border-blue-100">
                  <h4 className="font-semibold text-blue-800 border-b border-blue-200 pb-1 mb-2">Required Columns</h4>
                  <ul className="space-y-1">
                    <li><code className="bg-blue-100 px-1 rounded text-blue-800">Item Code</code>: Unique identifier</li>
                    <li><code className="bg-blue-100 px-1 rounded text-blue-800">Quantity</code>: Amount to add</li>
                    <li><code className="bg-blue-100 px-1 rounded text-blue-800">Supplier</code>: Vendor name</li>
                  </ul>
                </div>
                <div className="bg-white bg-opacity-60 p-3 rounded border border-blue-100">
                  <h4 className="font-semibold text-blue-800 border-b border-blue-200 pb-1 mb-2">Optional Fields</h4>
                  <ul className="space-y-1">
                    <li><code className="bg-blue-100 px-1 rounded text-blue-800">Date</code>: YYYY-MM-DD</li>
                    <li><code className="bg-blue-100 px-1 rounded text-blue-800">Item Name</code>: Description (New items)</li>
                    <li><code className="bg-blue-100 px-1 rounded text-blue-800">Category</code>: Item group (New items)</li>
                    <li><code className="bg-blue-100 px-1 rounded text-blue-800">UoM</code>: Unit of Measure (New items)</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-2 italic">Note: If an Item Code does not exist in the system, it will be automatically created using the optional fields provided.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={downloadTemplate}
                className="flex items-center justify-center space-x-2 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-3 rounded-lg transition-colors flex-1"
              >
                <Download size={18} />
                <span>Download Template</span>
              </button>
              
              <div className="flex-1 relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                  accept=".xlsx, .xls"
                  className="hidden"
                  id="bulk-upload-input"
                />
                <label 
                  htmlFor="bulk-upload-input"
                  className={`flex items-center justify-center space-x-2 border-2 border-dashed px-4 py-3 rounded-lg cursor-pointer transition-colors h-full ${
                    bulkFile ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300 hover:border-emerald-400 text-gray-500'
                  }`}
                >
                  <Upload size={18} />
                  <span className="truncate">{bulkFile ? bulkFile.name : "Select Excel File"}</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleBulkUpload}
              disabled={!bulkFile || bulkLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {bulkLoading ? 'Processing...' : 'Process Bulk Import'}
            </button>

            {bulkResult && (
              <div className={`mt-4 p-4 rounded-lg border ${bulkResult.errors > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center justify-between mb-2">
                   <h4 className={`font-semibold ${bulkResult.errors > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                     Import Results
                   </h4>
                   {bulkResult.errors === 0 && <CheckCircle size={18} className="text-green-600" />}
                </div>
                <div className="flex space-x-4 text-sm">
                  <span className="text-green-700">Success: <strong>{bulkResult.success}</strong></span>
                  <span className="text-red-700">Errors: <strong>{bulkResult.errors}</strong></span>
                </div>
                {bulkResult.msg.length > 0 && (
                  <div className="mt-2 text-xs text-red-600 max-h-24 overflow-y-auto">
                    {bulkResult.msg.map((m, i) => <div key={i}>• {m}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};