import React, { useState, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Calculator, Package, AlertTriangle, CheckCircle, ArrowRight, Download, Upload, FileSpreadsheet, X } from 'lucide-react';
import { BOMItem, Item } from '../types';
import * as XLSX from 'xlsx';

export const RequirementCalculator: React.FC = () => {
  const { items, boms } = useInventory();
  const [selectedFG, setSelectedFG] = useState('');
  const [requirement, setRequirement] = useState<number>(0);
  const [results, setResults] = useState<{ item: Item; needed: number; available: number; shortfall: number }[]>([]);
  const [bulkData, setBulkData] = useState<{ fgCode: string; quantity: number; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCalculate = () => {
    if (!selectedFG || requirement <= 0) {
      alert("Please select an FG and enter a valid requirement quantity");
      return;
    }
    setBulkData([]); // Clear bulk data if single calculation is triggered
    calculateRequirements([{ fgCode: selectedFG, quantity: requirement }]);
  };

  const calculateRequirements = (fgRequirements: { fgCode: string; quantity: number }[]) => {
    const aggregatedNeeded: Record<string, number> = {};

    fgRequirements.forEach(req => {
      const bom = boms.find(b => b.fgCode === req.fgCode);
      if (!bom) return;

      bom.items.forEach(bomItem => {
        aggregatedNeeded[bomItem.itemCode] = (aggregatedNeeded[bomItem.itemCode] || 0) + (bomItem.quantity * req.quantity);
      });
    });

    const calculatedResults = Object.entries(aggregatedNeeded).map(([itemCode, totalNeeded]) => {
      const item = items.find(i => i.code === itemCode);
      if (!item) return null;

      const shortfall = Math.max(0, totalNeeded - item.currentStock);

      return {
        item,
        needed: totalNeeded,
        available: item.currentStock,
        shortfall
      };
    }).filter(r => r !== null) as { item: Item; needed: number; available: number; shortfall: number }[];

    setResults(calculatedResults);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const fgRequirements = data.map(row => {
          const fgCode = row['FG Code'] || row['fgCode'] || row['Item Code'];
          const quantity = Number(row['Quantity'] || row['quantity'] || row['Qty']);
          
          if (!fgCode || isNaN(quantity)) return null;
          
          const item = items.find(i => i.code === fgCode);
          return { fgCode, quantity, name: item?.name || 'Unknown' };
        }).filter(r => r !== null) as { fgCode: string; quantity: number; name: string }[];

        if (fgRequirements.length === 0) {
          alert("No valid data found in the file. Ensure columns are 'FG Code' and 'Quantity'.");
          return;
        }

        setBulkData(fgRequirements);
        setSelectedFG(''); // Clear single selection
        setRequirement(0);
        calculateRequirements(fgRequirements);
      } catch (err) {
        console.error(err);
        alert("Error reading file. Please use a valid Excel/CSV file.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const templateData = [
      { 'FG Code': 'FG001', 'Quantity': 100 },
      { 'FG Code': 'FG002', 'Quantity': 50 }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Bulk_Requirement_Template.xlsx");
  };

  const exportToExcel = () => {
    if (results.length === 0) return;

    // Sheet 1: All Requirements
    const allData = results.map(r => ({
      'Material Code': r.item.code,
      'Material Name': r.item.name,
      'Total Needed': r.needed,
      'Available Stock': r.available,
      'Shortfall': r.shortfall,
      'UOM': r.item.uom,
      'Status': r.shortfall > 0 ? 'Insufficient' : 'Available'
    }));

    // Sheet 2: Procurement List (Shortfall Only)
    const shortfallData = results
      .filter(r => r.shortfall > 0)
      .map(r => ({
        'Material Code': r.item.code,
        'Material Name': r.item.name,
        'Quantity to Order': r.shortfall,
        'UOM': r.item.uom,
        'Current Stock': r.available
      }));

    // Sheet 3: Input Summary (FGs used)
    const summaryData = bulkData.length > 0 
      ? bulkData.map(d => ({ 'FG Code': d.fgCode, 'FG Name': d.name, 'Planned Qty': d.quantity }))
      : [{ 'FG Code': selectedFG, 'FG Name': items.find(i => i.code === selectedFG)?.name || 'Unknown', 'Planned Qty': requirement }];

    const workbook = XLSX.utils.book_new();
    
    const wsAll = XLSX.utils.json_to_sheet(allData);
    XLSX.utils.book_append_sheet(workbook, wsAll, "All Requirements");

    if (shortfallData.length > 0) {
      const wsShortfall = XLSX.utils.json_to_sheet(shortfallData);
      XLSX.utils.book_append_sheet(workbook, wsShortfall, "Procurement List");
    }

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Production Plan");
    
    const fileName = bulkData.length > 0 
      ? `Bulk_Requirement_Report_${new Date().toISOString().split('T')[0]}.xlsx` 
      : `Requirement_Report_${selectedFG}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg flex items-center">
            <Calculator className="mr-2" />
            Requirement Calculator (BOM Based)
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
              className="text-xs bg-white text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center font-bold transition-colors"
            >
              <Upload size={14} className="mr-1" /> Bulk Upload
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
            />
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Finished Good (FG)</label>
              <select 
                value={selectedFG}
                onChange={(e) => {
                  setSelectedFG(e.target.value);
                  setBulkData([]);
                }}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- Select FG Item --</option>
                {boms.map(bom => {
                  const item = items.find(i => i.code === bom.fgCode);
                  return (
                    <option key={bom.fgCode} value={bom.fgCode}>
                      {bom.fgCode} - {item?.name || 'Unknown'}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Requirement Quantity</label>
              <div className="flex space-x-2">
                <input 
                  type="number"
                  min="1"
                  value={requirement || ''}
                  onChange={(e) => setRequirement(Number(e.target.value))}
                  placeholder="Enter Qty"
                  className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button 
                  onClick={handleCalculate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                >
                  Calculate
                </button>
              </div>
            </div>
          </div>

          {bulkData.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-emerald-800 flex items-center">
                  <FileSpreadsheet className="mr-2" size={16} />
                  Bulk Requirement List ({bulkData.length} items)
                </h4>
                <button onClick={() => { setBulkData([]); setResults([]); }} className="text-emerald-600 hover:text-emerald-800">
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {bulkData.map((d, i) => (
                  <div key={i} className="text-xs flex justify-between bg-white/50 p-1.5 rounded">
                    <span>{d.fgCode} - {d.name}</span>
                    <span className="font-bold">Qty: {d.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-lg font-semibold text-gray-800">Calculation Results</h3>
                <button 
                  onClick={exportToExcel}
                  className="flex items-center space-x-2 text-sm bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-100"
                >
                  <Download size={16} />
                  <span>Export Results</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Calculation Mode</p>
                  <p className="text-lg font-bold text-gray-900">{bulkData.length > 0 ? 'Bulk Upload' : 'Single Item'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Total Components</p>
                  <p className="text-lg font-bold text-gray-900">{results.length} Items</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Status</p>
                  <div className="flex items-center mt-1">
                    {results.some(r => r.shortfall > 0) ? (
                      <span className="flex items-center text-red-600 font-bold">
                        <AlertTriangle size={18} className="mr-1" /> Shortfall Detected
                      </span>
                    ) : (
                      <span className="flex items-center text-emerald-600 font-bold">
                        <CheckCircle size={18} className="mr-1" /> Stock Ready
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="p-4 font-semibold">Material / Component</th>
                      <th className="p-4 font-semibold text-right">Needed</th>
                      <th className="p-4 font-semibold text-right">Available</th>
                      <th className="p-4 font-semibold text-right">Shortfall</th>
                      <th className="p-4 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((res, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{res.item.name}</p>
                          <p className="text-xs text-gray-500">Code: {res.item.code}</p>
                        </td>
                        <td className="p-4 text-right font-medium">
                          {res.needed} {res.item.uom}
                        </td>
                        <td className="p-4 text-right font-medium text-blue-600">
                          {res.available} {res.item.uom}
                        </td>
                        <td className="p-4 text-right">
                          {res.shortfall > 0 ? (
                            <span className="font-bold text-red-600">-{res.shortfall} {res.item.uom}</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">0</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {res.shortfall > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Insufficient
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Available
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
