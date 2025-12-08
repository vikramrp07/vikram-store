import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { CATEGORIES, UNITS, InwardEntry } from '../types';
import { Save, PlusCircle, CheckCircle, FileSpreadsheet, Download, Upload, AlertCircle } from 'lucide-react';
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
        newItemDetails: isNewItem ? { name: itemName, category, uom } : undefined
      });
      setSuccess(true);
      setItemCode('');
      setItemName('');
      setQty('');
      setSupplier('');
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
      { 'Item Code': 'IT001', 'Quantity': 10, 'Supplier': 'Vendor A', 'Item Name (Optional)': '', 'Category (Optional)': '', 'UoM (Optional)': '' },
      { 'Item Code': 'NEW001', 'Quantity': 50, 'Supplier': 'Vendor B', 'Item Name (Optional)': 'New Widget', 'Category (Optional)': 'Electronics', 'UoM (Optional)': 'pcs' }
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
        const workbook = XLSX.read(data, { type: 'array' });
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

           return {
             itemCode: r['item code'] || r['code'] || '',
             quantity: Number(r['quantity'] || r['qty'] || 0),
             supplier: r['supplier'] || r['vendor'] || r['party'] || '',
             newItemDetails: {
               name: r['item name'] || r['name'] || r['item name (optional)'],
               category: r['category'] || r['category (optional)'],
               uom: r['uom'] || r['unit'] || r['uom (optional)']
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
                <input 
                  type="text" 
                  list="item-codes"
                  required
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Scan or type code"
                />
                <datalist id="item-codes">
                  {items.map(i => <option key={i.code} value={i.code} />)}
                </datalist>
                {isNewItem && itemCode.length > 2 && (
                  <p className="text-xs text-blue-600 mt-1">New Item Detected - Please fill details</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input 
                  type="text" 
                  required
                  value={itemName}
                  readOnly={!isNewItem}
                  onChange={(e) => setItemName(e.target.value)}
                  className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none ${!isNewItem ? 'bg-gray-100' : ''}`}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
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
          </form>
        ) : (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Instructions:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Download the template below.</li>
                <li>Fill in <strong>Item Code</strong>, <strong>Quantity</strong>, and <strong>Supplier</strong> (Required).</li>
                <li>For new items, also fill Name, Category, and UoM.</li>
                <li>Upload the file to process inward entries in bulk.</li>
              </ul>
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