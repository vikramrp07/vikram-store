import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { CATEGORIES, UNITS } from '../types';
import { Save, PlusCircle, CheckCircle } from 'lucide-react';

export const InwardForm: React.FC = () => {
  const { items, processInward } = useInventory();
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

  // Auto-fill logic
  useEffect(() => {
    const foundItem = items.find(i => i.code === itemCode);
    if (foundItem) {
      setItemName(foundItem.name);
      setCategory(foundItem.category);
      setUom(foundItem.uom);
      setExistingStock(foundItem.currentStock);
      setIsNewItem(false);
    } else {
      // If code has length but not found, assumes potential new item
      if (itemCode.length > 2) {
        setIsNewItem(true);
        setExistingStock(null);
        // Don't clear name/category immediately to allow typing
      }
    }
  }, [itemCode, items]);

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
      // Reset form
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

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg flex items-center">
          <PlusCircle className="mr-2" /> Inward Stock Entry
        </h2>
        <span className="text-emerald-100 text-sm bg-emerald-700 px-2 py-1 rounded">
          {new Date().toLocaleDateString()}
        </span>
      </div>

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
    </div>
  );
};