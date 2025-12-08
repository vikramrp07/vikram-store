import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Search, Edit2, Save, X } from 'lucide-react';
import { Item } from '../types';

export const MasterList: React.FC = () => {
  const { items, updateItem } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Item>>({});

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Item) => {
    setEditForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
        <h3 className="text-lg font-semibold text-gray-800">Master Inventory List</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search item..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
                <td colSpan={6} className="p-8 text-center text-gray-400">No items found.</td>
              </tr>
            ) : (
              filteredItems.map(item => (
                <tr key={item.code} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{item.code}</td>
                  
                  {/* Name */}
                  <td className="p-4">
                    {editingId === item.code ? (
                      <input 
                        className="border p-1 rounded w-full" 
                        value={editForm.name || ''} 
                        onChange={(e) => handleChange(e, 'name')}
                      />
                    ) : item.name}
                  </td>

                  {/* Category */}
                  <td className="p-4">
                     {editingId === item.code ? (
                      <input 
                        className="border p-1 rounded w-full" 
                        value={editForm.category || ''} 
                        onChange={(e) => handleChange(e, 'category')}
                      />
                    ) : (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{item.category}</span>
                    )}
                  </td>

                  {/* UoM */}
                   <td className="p-4">
                    {item.uom}
                  </td>

                  {/* Stock (Read Only) */}
                  <td className={`p-4 text-right font-bold ${item.currentStock < 10 ? 'text-red-500' : 'text-gray-800'}`}>
                    {item.currentStock}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-center">
                    {editingId === item.code ? (
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => saveEdit(item.code)} className="text-green-600 hover:bg-green-100 p-1 rounded"><Save size={16} /></button>
                        <button onClick={cancelEdit} className="text-red-600 hover:bg-red-100 p-1 rounded"><X size={16} /></button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(item)} className="text-blue-600 hover:bg-blue-100 p-1 rounded">
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};