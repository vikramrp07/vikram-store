import React, { useState, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Plus, Trash2, Save, Search, Package, List, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { BOMItem, Item, BOM } from '../types';
import * as XLSX from 'xlsx';

export const BOMManager: React.FC = () => {
  const { items, boms, saveBOM, bulkSaveBOM } = useInventory();
  const [selectedFG, setSelectedFG] = useState('');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFGSelect = (code: string) => {
    setSelectedFG(code);
    const existingBOM = boms.find(b => b.fgCode === code);
    if (existingBOM) {
      setBomItems(existingBOM.items);
    } else {
      setBomItems([]);
    }
  };

  const addRMRow = () => {
    setBomItems([...bomItems, { itemCode: '', quantity: 0 }]);
  };

  const removeRMRow = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const updateRMRow = (index: number, field: keyof BOMItem, value: string | number) => {
    const newItems = [...bomItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setBomItems(newItems);
  };

  const handleSave = async () => {
    if (!selectedFG) {
      alert("Please select a Finished Good");
      return;
    }
    if (bomItems.length === 0) {
      alert("Please add at least one Raw Material");
      return;
    }
    if (bomItems.some(i => !i.itemCode || i.quantity <= 0)) {
      alert("Please ensure all items have a code and quantity > 0");
      return;
    }

    setLoading(true);
    try {
      await saveBOM(selectedFG, bomItems);
      alert("BOM saved successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to save BOM");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        // Group by FG Code
        const groupedBOMs: Record<string, BOMItem[]> = {};
        data.forEach(row => {
          const fgCode = row['FG Code'] || row['fgCode'];
          const rmCode = row['RM Code'] || row['rmCode'] || row['Material Code'];
          const quantity = Number(row['Quantity'] || row['quantity'] || row['Qty']);

          if (fgCode && rmCode && !isNaN(quantity)) {
            if (!groupedBOMs[fgCode]) groupedBOMs[fgCode] = [];
            groupedBOMs[fgCode].push({ itemCode: rmCode, quantity });
          }
        });

        const newBoms: BOM[] = Object.entries(groupedBOMs).map(([fgCode, items]) => ({
          fgCode,
          items
        }));

        if (newBoms.length === 0) {
          alert("No valid BOM data found. Ensure columns are 'FG Code', 'RM Code', and 'Quantity'.");
          return;
        }

        if (confirm(`Found ${newBoms.length} BOMs to upload. This will overwrite existing BOMs for these FG codes. Continue?`)) {
          setLoading(true);
          await bulkSaveBOM(newBoms);
          alert("Bulk BOM upload successful!");
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        alert("Error processing file.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const templateData = [
      { 'FG Code': 'FG001', 'RM Code': 'RM001', 'Quantity': 2.5 },
      { 'FG Code': 'FG001', 'RM Code': 'RM002', 'Quantity': 1.0 },
      { 'FG Code': 'FG002', 'RM Code': 'RM003', 'Quantity': 5.0 }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BOM_Template");
    XLSX.writeFile(workbook, "Bulk_BOM_Template.xlsx");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg flex items-center">
            <List className="mr-2" />
            Bill of Materials (BOM) Management
          </h2>
          <div className="flex space-x-2">
            <button 
              onClick={downloadTemplate}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg flex items-center transition-colors"
            >
              <Download size={14} className="mr-1" /> Template
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-white text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center font-bold transition-colors"
            >
              <Upload size={14} className="mr-1" /> Bulk Upload
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleBulkUpload} 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
            />
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Finished Good (FG)</label>
              <select 
                value={selectedFG}
                onChange={(e) => handleFGSelect(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Select FG Item --</option>
                {items.map(item => (
                  <option key={item.code} value={item.code}>
                    {item.code} - {item.name} ({item.category})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Select the item you want to define a recipe for.</p>
            </div>
          </div>

          {selectedFG && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-gray-800">Raw Materials / Components</h3>
                <button 
                  onClick={addRMRow}
                  className="flex items-center space-x-1 text-sm bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Material</span>
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="p-3 font-medium">Material Item</th>
                      <th className="p-3 font-medium w-32">Qty per FG</th>
                      <th className="p-3 font-medium w-20 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bomItems.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-gray-500 italic">
                          No materials added yet. Click "Add Material" to start.
                        </td>
                      </tr>
                    ) : (
                      bomItems.map((bomItem, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="p-3">
                            <select 
                              value={bomItem.itemCode}
                              onChange={(e) => updateRMRow(index, 'itemCode', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                            >
                              <option value="">-- Select Material --</option>
                              {items.filter(i => i.code !== selectedFG).map(item => (
                                <option key={item.code} value={item.code}>
                                  {item.code} - {item.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <input 
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={bomItem.quantity}
                              onChange={(e) => updateRMRow(index, 'quantity', Number(e.target.value))}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => removeRMRow(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? <span>Saving...</span> : (
                    <>
                      <Save size={18} />
                      <span>Save BOM</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Package className="mr-2 text-indigo-600" />
          Existing BOMs
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boms.length === 0 ? (
            <p className="text-gray-500 italic col-span-full">No BOMs defined yet.</p>
          ) : (
            boms.map(bom => {
              const fg = items.find(i => i.code === bom.fgCode);
              return (
                <div 
                  key={bom.fgCode} 
                  onClick={() => handleFGSelect(bom.fgCode)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedFG === bom.fgCode ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-bold text-gray-900">{fg?.name || bom.fgCode}</p>
                  <p className="text-xs text-gray-500 mb-2">Code: {bom.fgCode}</p>
                  <div className="flex items-center text-xs text-indigo-600 font-medium">
                    <List size={12} className="mr-1" />
                    {bom.items.length} Components
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
