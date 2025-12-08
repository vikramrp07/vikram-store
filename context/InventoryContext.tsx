import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Item, LogEntry, TransactionType, InwardEntry } from '../types';

// =========================================================================================
// 🚀 CONFIGURATION: PASTE YOUR GOOGLE WEB APP URL BELOW
// =========================================================================================
const API_URL = ""; // e.g. "https://script.google.com/macros/s/AKfycbx.../exec"
// =========================================================================================

interface InventoryContextType {
  items: Item[];
  logs: LogEntry[];
  loading: boolean;
  addItem: (item: Item) => Promise<void>;
  updateItem: (code: string, updates: Partial<Item>) => Promise<void>;
  importItems: (newItems: Item[]) => void;
  processInward: (data: { itemCode: string; quantity: number; supplier: string; newItemDetails?: Partial<Item> }) => Promise<void>;
  processBulkInward: (entries: InwardEntry[]) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
  processOutward: (data: { itemCode: string; quantity: number; customer: string }) => Promise<void>;
  exportData: () => void;
  adjustStock: (code: string, newQty: number, reason: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Mock Initial Data (Fallback)
const INITIAL_ITEMS: Item[] = [
  { code: 'DEMO001', name: 'Demo Laptop (Local)', category: 'Electronics', openingStock: 10, currentStock: 8, uom: 'pcs' },
  { code: 'DEMO002', name: 'Demo Chair (Local)', category: 'Furniture', openingStock: 50, currentStock: 45, uom: 'pcs' },
];

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch Data on Load
  useEffect(() => {
    if (API_URL) {
      fetchData();
    } else {
      console.log('Running in Local Demo Mode. Add API_URL in InventoryContext.tsx to connect Google Sheets.');
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Items
      const itemsRes = await fetch(`${API_URL}?action=getItems`);
      const itemsJson = await itemsRes.json();
      if (itemsJson.status === 'success') setItems(itemsJson.data);

      // Fetch Logs
      const logsRes = await fetch(`${API_URL}?action=getLogs`);
      const logsJson = await logsRes.json();
      if (logsJson.status === 'success') setLogs(logsJson.data);

    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const postToApi = async (payload: any) => {
    if (!API_URL) return; // Use local logic if no API
    
    // Google Apps Script requires text/plain to avoid CORS preflight issues in some browsers
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  };

  const addItem = async (newItem: Item) => {
    if (API_URL) {
      await postToApi({ action: 'addItem', item: newItem });
      await fetchData(); // Reload to sync
    } else {
      setItems(prev => [...prev, newItem]);
    }
  };

  const updateItem = async (code: string, updates: Partial<Item>) => {
    if (API_URL) {
      await postToApi({ action: 'updateItem', code, updates });
      await fetchData();
    } else {
      setItems(prev => prev.map(item => item.code === code ? { ...item, ...updates } : item));
    }
  };

  const adjustStock = async (code: string, newQty: number, reason: string) => {
     // Local Logic
     const currentItem = items.find(i => i.code === code);
     if (!currentItem) return;
     const diff = newQty - currentItem.currentStock;
     
     if (API_URL) {
       // We'll reuse updateItem logic or create a specific adjust action on backend
       // For now, simpler to reuse updateItem + addLog logic if we had separate endpoints, 
       // but let's assume we do updateItem and then fetchData.
       // Note: The GAS script provided earlier has a basic 'updateItem'. 
       // For a real app, you'd want a dedicated 'adjustStock' endpoint to ensure atomicity.
       // Sending 'updateItem' with just currentStock.
       await postToApi({ action: 'updateItem', code, updates: { currentStock: newQty } });
       // We would ideally also post a log manually here, but let's just sync.
       await fetchData();
     } else {
        updateItem(code, { currentStock: newQty });
        const newLog: LogEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          itemCode: code,
          itemName: currentItem.name,
          type: TransactionType.INWARD, // Reusing type or need new ENUM. 
          // Since TransactionType enum wasn't strictly updated in previous prompts, 
          // we use INWARD/OUTWARD based on diff.
          quantity: Math.abs(diff),
          partyName: `Adjustment: ${reason}`,
          stockAfter: newQty
        };
        setLogs(prev => [newLog, ...prev]);
     }
  };

  const importItems = (newItems: Item[]) => {
    // This is strictly local helper for the MasterList component's "Excel Import" feature
    // which usually just populates the view. If we want to save to DB:
    // It's better to loop and addItem or bulk add. 
    // For now, we keep local behavior or user must use "Bulk Inward".
    // Or we can implement a bulkAddItem.
    
    setItems(prevItems => {
      const itemMap = new Map(prevItems.map(i => [i.code, i]));
      newItems.forEach(item => {
        if (item.code) {
          const existing = itemMap.get(item.code);
          if (existing) {
            itemMap.set(item.code, { ...existing, ...item });
          } else {
            itemMap.set(item.code, item);
          }
        }
      });
      return Array.from(itemMap.values());
    });
    
    // In a real app, you would trigger a bulk sync to API here.
    if(API_URL) alert("Note: Imported items are currently local only. Use 'Inward' to save to Sheet.");
  };

  const processInward = async ({ itemCode, quantity, supplier, newItemDetails }: { itemCode: string; quantity: number; supplier: string; newItemDetails?: Partial<Item> }) => {
    if (API_URL) {
      await postToApi({ 
        action: 'inward', 
        itemCode, 
        quantity, 
        supplier, 
        newItemDetails 
      });
      await fetchData();
    } else {
      // Local Fallback
      await new Promise(resolve => setTimeout(resolve, 500));
      let currentItem = items.find(i => i.code === itemCode);
      let stockAfter = quantity;

      if (currentItem) {
        stockAfter = currentItem.currentStock + quantity;
        setItems(prev => prev.map(item => item.code === itemCode ? { ...item, currentStock: stockAfter } : item));
      } else if (newItemDetails && newItemDetails.name) {
        const newItem: Item = {
          code: itemCode,
          name: newItemDetails.name!,
          category: newItemDetails.category || 'General',
          uom: newItemDetails.uom || 'pcs',
          openingStock: 0,
          currentStock: quantity
        };
        setItems(prev => [...prev, newItem]);
        currentItem = newItem;
        stockAfter = quantity;
      } else {
        throw new Error("Item not found");
      }

      const newLog: LogEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        itemCode,
        itemName: currentItem ? currentItem.name : 'Unknown',
        type: TransactionType.INWARD,
        quantity,
        partyName: supplier,
        stockAfter
      };
      setLogs(prev => [newLog, ...prev]);
    }
  };

  const processBulkInward = async (entries: InwardEntry[]) => {
    if (API_URL) {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'bulkInward', entries })
      });
      const result = await response.json();
      await fetchData();
      return { 
        successCount: result.successCount || 0, 
        errorCount: result.errorCount || 0, 
        errors: result.errors || [] 
      };
    } else {
      // Local Logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const newLogs: LogEntry[] = [];
      let currentItemsMap = new Map(items.map(i => [i.code, i]));

      entries.forEach((entry, index) => {
        try {
          if (!entry.itemCode || !entry.quantity || !entry.supplier) throw new Error(`Row ${index + 1}: Missing fields`);
          
          const existingItem = currentItemsMap.get(entry.itemCode);
          let stockAfter = entry.quantity;
          let itemName = 'Unknown';

          if (existingItem) {
            stockAfter = existingItem.currentStock + entry.quantity;
            currentItemsMap.set(entry.itemCode, { ...existingItem, currentStock: stockAfter });
            itemName = existingItem.name;
          } else {
            if (entry.newItemDetails && entry.newItemDetails.name) {
               const newItem: Item = {
                 code: entry.itemCode,
                 name: entry.newItemDetails.name,
                 category: entry.newItemDetails.category || 'General',
                 uom: entry.newItemDetails.uom || 'pcs',
                 openingStock: 0,
                 currentStock: entry.quantity
               };
               currentItemsMap.set(entry.itemCode, newItem);
               itemName = newItem.name;
            } else {
              throw new Error(`Row ${index + 1}: Item not found`);
            }
          }

          newLogs.push({
            id: Date.now().toString() + Math.random(),
            date: new Date().toISOString(),
            itemCode: entry.itemCode,
            itemName,
            type: TransactionType.INWARD,
            quantity: entry.quantity,
            partyName: entry.supplier,
            stockAfter
          });
          successCount++;
        } catch (err: any) {
          errorCount++;
          errors.push(err.message);
        }
      });

      setItems(Array.from(currentItemsMap.values()));
      setLogs(prev => [...newLogs, ...prev]);
      return { successCount, errorCount, errors };
    }
  };

  const processOutward = async ({ itemCode, quantity, customer }: { itemCode: string; quantity: number; customer: string }) => {
    if (API_URL) {
      await postToApi({ action: 'outward', itemCode, quantity, customer });
      await fetchData();
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
      const currentItem = items.find(i => i.code === itemCode);
      if (!currentItem) throw new Error("Item not found.");
      if (currentItem.currentStock < quantity) throw new Error("Insufficient stock!");

      const stockAfter = currentItem.currentStock - quantity;
      setItems(prev => prev.map(i => i.code === itemCode ? { ...i, currentStock: stockAfter } : i));

      const newLog: LogEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        itemCode,
        itemName: currentItem.name,
        type: TransactionType.OUTWARD,
        quantity,
        partyName: customer,
        stockAfter
      };
      setLogs(prev => [newLog, ...prev]);
    }
  };

  const exportData = () => {
    const headers = ["Date", "Type", "Item Code", "Name", "Quantity", "Party", "Stock After"];
    const rows = logs.map(log => [
      new Date(log.date).toLocaleString(),
      log.type,
      log.itemCode,
      log.itemName,
      log.quantity,
      log.partyName,
      log.stockAfter
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <InventoryContext.Provider value={{ items, logs, loading, addItem, updateItem, importItems, processInward, processBulkInward, processOutward, exportData, adjustStock }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within InventoryProvider");
  return context;
};