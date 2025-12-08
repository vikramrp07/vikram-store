import React, { useState, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Search, Edit2, Save, X, UploadCloud, FileSpreadsheet, Plus, ArrowDownCircle, Loader2 } from 'lucide-react';
import { Item, CATEGORIES, UNITS } from '../types';
import * as XLSX from 'xlsx';

export const MasterList: React.FC = () => {
  const { items, updateItem, importItems, addItem, processInward } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Item>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<Item>({
    code: '',
    name: '',
    category: CATEGORIES[0],
    uom: UNITS[0],
    openingStock: 0,
    currentStock: 0
  });

  // Add Stock Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<{code: string, name: string} | null>(null);
  const [stockQty, setStockQty] = useState('');
  const [stockSupplier, setStockSupplier] = useState('');
  const [stockLoading, setStockLoading] = useState(false);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (item: Item) => {
    setEditingId(item.code);
    setEditForm(item);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = (code: string) => {
    updateItem(code, editForm);
    setEditingId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: keyof Item) => {
    setEditForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  // Handle changes in the "Add New Item" modal
  const handleAddNewChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: keyof Item) => {
    const value = field === 'openingStock' || field === 'currentStock' ? Number(e.target.value) : e.target.value;
    setNewItem(prev => ({
      ...prev,
      [field]: value,
      // Sync current stock with opening stock initially
      ...(field === 'openingStock' ? { currentStock: value as number } : {})
    }));
  };

  const submitNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.code || !newItem.name) {
      alert("Code and Name are required");
      return;
    }
    
    // Check for duplicate code
    if (items.some(i => i.code === newItem.code)) {
      alert("Item Code already exists. Please use a unique code.");
      return;
    }

    addItem(newItem);
    setShowAddModal(false);
    // Reset form
    setNewItem({
      code: '',
      name: '',
      category: CATEGORIES[0],
      uom: UNITS[0],
      openingStock: 0,
      currentStock: 0
    });
  };

  const openStockModal = (item: Item) => {
    setSelectedStockItem({ code: item.code, name: item.name });
    setStockQty('');
    setStockSupplier('');
    setShowStockModal(true);
  };

  const submitAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem || !stockQty || !stockSupplier) return;

    setStockLoading(true);
    try {
      await processInward({
        itemCode: selectedStockItem.code,
        quantity: Number(stockQty),
        supplier: stockSupplier
      });
      setShowStockModal(false);
    } catch (error: any) {
      alert("Failed to add stock: " + error.message);
    } finally {
      setStockLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) {
          alert("Sheet is empty!");
          return;
        }

        // Map loosely matched columns to Item interface
        const parsedItems: Item[] = jsonData.map((row: any) => {
          // Normalize keys to lowercase for flexible matching
          const normalizedRow: any = {};
          Object.keys(row).forEach(key => {
            normalizedRow[key.toLowerCase().trim()] = row[key];
          });

          return {
            code: normalizedRow['item code'] || normalizedRow['code'] || normalizedRow['id'] || '',
            name: normalizedRow['item name'] || normalizedRow['name'] || normalizedRow['item'] || '',
            category: normalizedRow['category'] || 'General',
            uom: normalizedRow['uom'] || normalizedRow['unit'] || 'pcs',
            openingStock: Number(normalizedRow['opening stock'] || normalizedRow['opening'] || 0),
            currentStock: Number(normalizedRow['current stock'] || normalizedRow['stock'] || normalizedRow['quantity'] || normalizedRow['opening stock'] || 0)
          };
        }).filter(i => i.code && i.name); // Valid items only

        if (parsedItems.length > 0) {
          importItems(parsedItems);
          alert(`Successfully imported ${parsedItems.length} items from Excel.`);
        } else {
          alert('No valid items found. Ensure columns like "Item Code" and "Item Name" exist.');
        }

      } catch (error) {
        console.error("Import Error:", error);
        alert("Failed to parse Excel file. Please check the format.");
      } finally {
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-800">Master Inventory List</h3>
          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">{items.length} Items</span>
        </div>
        
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Add Item Button */}
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Item</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* File Upload Trigger */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FileSpreadsheet size={16} />
            <span className="hidden sm:inline">Import Excel</span>
            <span className="sm:hidden">Import</span>
          </button>

          <div className="relative flex-1 md:flex-none md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search item code or name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-800 font-medium">
            <tr>
              <th className="p-4">Item Code</th>
              <th className="p-4">Item Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">UoM</th>
              <th className="p-4 text-right">Stock</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                  <UploadCloud size={48} className="mb-2 opacity-20" />
                  <p>No items found.</p>
                  <div className="flex justify-center gap-3 mt-2">
                    <button onClick={() => setShowAddModal(true)} className="text-blue-500 hover:underline">
                      Add New Item
                    </button>
                    <span>or</span>
                    <button onClick={() => fileInputRef.current?.click()} className="text-blue-500 hover:underline">
                      Import from Excel
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map(item => (
                <tr key={item.code} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{item.code}</td>
                  
                  {/* Name */}
                  <td className="p-4">
                    {editingId === item.code ? (
                      <input 
                        className="border p-1.5 rounded w-full focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                        value={editForm.name || ''} 
                        onChange={(e) => handleChange(e, 'name')}
                      />
                    ) : item.name}
                  </td>

                  {/* Category */}
                  <td className="p-4">
                     {editingId === item.code ? (
                      <select
                        className="border p-1.5 rounded w-full focus:ring-2 focus:ring-blue-500 bg-white focus:outline-none"
                        value={editForm.category || item.category}
                        onChange={(e) => handleChange(e, 'category')}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs border border-gray-200">{item.category}</span>
                    )}
                  </td>

                  {/* UoM - Editable */}
                   <td className="p-4 text-gray-500">
                    {editingId === item.code ? (
                      <select
                        className="border p-1.5 rounded w-full focus:ring-2 focus:ring-blue-500 bg-white focus:outline-none"
                        value={editForm.uom || item.uom}
                        onChange={(e) => handleChange(e, 'uom')}
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    ) : (
                      item.uom
                    )}
                  </td>

                  {/* Stock (Read Only) */}
                  <td className={`p-4 text-right font-bold ${item.currentStock < 10 ? 'text-red-500' : 'text-gray-800'}`}>
                    {item.currentStock}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-center">
                    {editingId === item.code ? (
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => saveEdit(item.code)} className="text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors"><Save size={16} /></button>
                        <button onClick={cancelEdit} className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center space-x-1">
                        <button 
                          onClick={() => startEdit(item)} 
                          className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                          title="Edit Item Details"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => openStockModal(item)} 
                          className="text-emerald-600 hover:bg-emerald-100 p-2 rounded-lg transition-colors"
                          title="Add Stock (Inward)"
                        >
                          <ArrowDownCircle size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Add New Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={submitNewItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
                <input 
                  required
                  type="text" 
                  value={newItem.code}
                  onChange={(e) => handleAddNewChange(e, 'code')}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. IT-005"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input 
                  required
                  type="text" 
                  value={newItem.name}
                  onChange={(e) => handleAddNewChange(e, 'name')}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Wireless Mouse"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    value={newItem.category}
                    onChange={(e) => handleAddNewChange(e, 'category')}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UoM</label>
                  <select 
                    value={newItem.uom}
                    onChange={(e) => handleAddNewChange(e, 'uom')}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Stock</label>
                <input 
                  type="number" 
                  min="0"
                  value={newItem.openingStock}
                  onChange={(e) => handleAddNewChange(e, 'openingStock')}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showStockModal && selectedStockItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center">
              <h3 className="font-semibold text-white flex items-center">
                <ArrowDownCircle size={20} className="mr-2" /> 
                Add Stock (Inward)
              </h3>
              <button onClick={() => setShowStockModal(false)} className="text-emerald-100 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={submitAddStock} className="p-6 space-y-4">
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-sm">
                <span className="text-emerald-800 font-semibold">{selectedStockItem.name}</span>
                <div className="text-emerald-600 text-xs">Code: {selectedStockItem.code}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Add</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  autoFocus
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier / Party</label>
                <input 
                  required
                  type="text" 
                  value={stockSupplier}
                  onChange={(e) => setStockSupplier(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="e.g. Vendor A"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={stockLoading}
                  className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors shadow-sm disabled:opacity-70 flex justify-center items-center"
                >
                  {stockLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    'Confirm Inward'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
