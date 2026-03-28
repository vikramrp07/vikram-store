import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Item, LogEntry, TransactionType, InwardEntry, OutwardEntry } from '../types';

// =========================================================================================
// 🚀 CONFIGURATION: PASTE YOUR GOOGLE WEB APP URL BELOW
// =========================================================================================
const HARDCODED_API_URL = ""; // e.g. "https://script.google.com/macros/s/AKfycbx.../exec"
// =========================================================================================

interface InventoryContextType {
  items: Item[];
  logs: LogEntry[];
  loading: boolean;
  isConnected: boolean;
  connectionError: string | null;
  addItem: (item: Item) => Promise<void>;
  updateItem: (code: string, updates: Partial<Item>) => Promise<void>;
  importItems: (newItems: Item[]) => void;
  processInward: (data: { itemCode: string; quantity: number; supplier: string; date?: string; newItemDetails?: Partial<Item> }) => Promise<void>;
  processBulkInward: (entries: InwardEntry[]) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
  processOutward: (data: { itemCode: string; quantity: number; customer: string; date?: string }) => Promise<void>;
  processBulkOutward: (entries: OutwardEntry[]) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
  exportData: () => void;
  exportDailyReport: (date: Date) => void;
  exportWeeklyReport: (date: Date) => void;
  exportMonthlyReport: (date: Date) => void;
  adjustStock: (code: string, newQty: number, reason: string) => Promise<void>;
  setConnectionUrl: (url: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Mock Initial Data (Fallback)
const INITIAL_ITEMS: Item[] = [
  { code: 'DEMO001', name: 'Demo Laptop (Local)', category: 'Electronics', openingStock: 10, currentStock: 8, uom: 'pcs' },
  { code: 'DEMO002', name: 'Demo Chair (Local)', category: 'Furniture', openingStock: 50, currentStock: 45, uom: 'pcs' },
];

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from Hardcoded OR LocalStorage
  const [apiUrl, setApiUrl] = useState<string>(() => {
    return HARDCODED_API_URL || localStorage.getItem('inventory_api_url') || "";
  });

  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Fetch Data on Load or when URL changes
  useEffect(() => {
    if (apiUrl) {
      fetchData();
    } else {
      console.log('Running in Local Demo Mode. Connect Google Sheet via Settings.');
    }
  }, [apiUrl]);

  const setConnectionUrl = (url: string) => {
    const cleanUrl = url.trim();
    localStorage.setItem('inventory_api_url', cleanUrl);
    setApiUrl(cleanUrl);
    setConnectionError(null);
    if (!cleanUrl) {
      setItems(INITIAL_ITEMS);
      setLogs([]);
    }
  };

  const fetchData = async () => {
    if (!apiUrl) return;
    setLoading(true);
    setConnectionError(null);
    try {
      // Helper to handle response parsing with safeguards
      const fetchJson = async (url: string) => {
        // We use credentials: 'omit' to avoid sending Google cookies that might confuse the script if "Anyone" access is not perfect.
        const res = await fetch(url, { redirect: 'follow', credentials: 'omit' });
        
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          // If we got HTML (e.g. Google Error page), throw a clear error
          console.error("Non-JSON response received:", text.substring(0, 150));
          if (text.includes("script.google.com")) {
            throw new Error("Script Error: The Google Sheet script returned an error page. Check the script logs.");
          } else if (text.includes("Google Drive")) {
             throw new Error("Permission Error: Ensure the Web App is deployed as 'Anyone'.");
          }
          throw new Error("Invalid response from server.");
        }
      };

      // Add timestamp to prevent caching
      const ts = new Date().getTime();
      
      // Fetch Items
      const itemsJson = await fetchJson(`${apiUrl}?action=getItems&_t=${ts}`);
      if (itemsJson.status === 'success') {
         setItems(itemsJson.data);
      } else {
         throw new Error(itemsJson.message || "Failed to load items");
      }

      // Fetch Logs
      const logsJson = await fetchJson(`${apiUrl}?action=getLogs&_t=${ts}`);
      if (logsJson.status === 'success') {
         setLogs(logsJson.data);
      }

    } catch (error: any) {
      console.error("Failed to fetch data", error);
      setConnectionError(error.message || "Failed to connect to Google Sheet");
    } finally {
      setLoading(false);
    }
  };

  const postToApi = async (payload: any) => {
    if (!apiUrl) return; 
    setConnectionError(null);
    
    // Use text/plain to avoid CORS Preflight (OPTIONS)
    const response = await fetch(apiUrl, {
      method: 'POST',
      credentials: 'omit',
      redirect: 'follow',
      headers: {
        "Content-Type": "text/plain;charset=utf-8", 
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API Request Failed: ${response.status}`);
    }
    
    const text = await response.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch(e) {
        console.warn("Could not parse POST response", e);
        // Sometimes a redirect happens and we get HTML, but action succeeded. 
        // We throw if we can't confirm success, to be safe.
        throw new Error("Invalid response from server during save.");
    }

    if(json.status === 'error') throw new Error(json.message);
    return json;
  };

  const addItem = async (newItem: Item) => {
    if (apiUrl) {
      await postToApi({ action: 'addItem', item: newItem });
      await fetchData(); 
    } else {
      setItems(prev => [...prev, newItem]);
    }
  };

  const updateItem = async (code: string, updates: Partial<Item>) => {
    if (apiUrl) {
      await postToApi({ action: 'updateItem', code, updates });
      await fetchData();
    } else {
      setItems(prev => prev.map(item => item.code === code ? { ...item, ...updates } : item));
    }
  };

  const adjustStock = async (code: string, newQty: number, reason: string) => {
     const currentItem = items.find(i => i.code === code);
     if (!currentItem) return;
     const diff = newQty - currentItem.currentStock;
     
     if (apiUrl) {
       await postToApi({ action: 'updateItem', code, updates: { currentStock: newQty } });
       await fetchData();
     } else {
        updateItem(code, { currentStock: newQty });
        const newLog: LogEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          itemCode: code,
          itemName: currentItem.name,
          type: TransactionType.INWARD, 
          quantity: Math.abs(diff),
          partyName: `Adjustment: ${reason}`,
          stockAfter: newQty
        };
        setLogs(prev => [newLog, ...prev]);
     }
  };

  const importItems = (newItems: Item[]) => {
    setItems(prevItems => {
      // Correctly type the Map to avoid inference issues with .map returning (string | Item)[]
      const itemMap = new Map<string, Item>();
      prevItems.forEach(i => itemMap.set(i.code, i));

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
    
    if(apiUrl) alert("Note: Imported items are currently local only. Use 'Inward' to save to Sheet.");
  };

  const processInward = async ({ itemCode, quantity, supplier, date, newItemDetails }: { itemCode: string; quantity: number; supplier: string; date?: string; newItemDetails?: Partial<Item> }) => {
    if (apiUrl) {
      await postToApi({ 
        action: 'inward', 
        itemCode, 
        quantity, 
        supplier, 
        date,
        newItemDetails 
      });
      await fetchData();
    } else {
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
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
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
    if (apiUrl) {
      const result = await postToApi({ action: 'bulkInward', entries });
      await fetchData();
      return { 
        successCount: result?.successCount || 0, 
        errorCount: result?.errorCount || 0, 
        errors: result?.errors || [] 
      };
    } else {
      await new Promise(resolve => setTimeout(resolve, 1500));
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const newLogs: LogEntry[] = [];
      
      // Correctly type the Map to avoid inference issues
      const currentItemsMap = new Map<string, Item>();
      items.forEach(i => currentItemsMap.set(i.code, i));

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
            date: entry.date ? new Date(entry.date).toISOString() : new Date().toISOString(),
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

  const processOutward = async ({ itemCode, quantity, customer, date }: { itemCode: string; quantity: number; customer: string; date?: string }) => {
    if (apiUrl) {
      await postToApi({ action: 'outward', itemCode, quantity, customer, date });
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
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
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

  const processBulkOutward = async (entries: OutwardEntry[]) => {
    if (apiUrl) {
      const result = await postToApi({ action: 'bulkOutward', entries });
      await fetchData();
      return { 
        successCount: result?.successCount || 0, 
        errorCount: result?.errorCount || 0, 
        errors: result?.errors || [] 
      };
    } else {
      await new Promise(resolve => setTimeout(resolve, 1500));
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const newLogs: LogEntry[] = [];
      
      const currentItemsMap = new Map<string, Item>();
      items.forEach(i => currentItemsMap.set(i.code, i));

      entries.forEach((entry, index) => {
        try {
          if (!entry.itemCode || !entry.quantity || !entry.customer) throw new Error(`Row ${index + 1}: Missing fields`);
          
          const existingItem = currentItemsMap.get(entry.itemCode);
          if (!existingItem) throw new Error(`Row ${index + 1}: Item not found`);
          if (existingItem.currentStock < entry.quantity) throw new Error(`Row ${index + 1}: Insufficient stock`);

          const stockAfter = existingItem.currentStock - entry.quantity;
          currentItemsMap.set(entry.itemCode, { ...existingItem, currentStock: stockAfter });

          newLogs.push({
            id: Date.now().toString() + Math.random(),
            date: entry.date ? new Date(entry.date).toISOString() : new Date().toISOString(),
            itemCode: entry.itemCode,
            itemName: existingItem.name,
            type: TransactionType.OUTWARD,
            quantity: entry.quantity,
            partyName: entry.customer,
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

  const exportDailyReport = (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dailyLogs = logs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= startOfDay && logDate <= endOfDay;
    });

    if (dailyLogs.length === 0) {
      alert("No transactions found for the selected date.");
      return;
    }

    const headers = ["Date", "Type", "Item Code", "Name", "Quantity", "Party", "Stock After"];
    const rows = dailyLogs.map(log => [
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
    const dateString = date.toISOString().split('T')[0];
    link.setAttribute("download", `daily_report_${dateString}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportWeeklyReport = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    const weeklyLogs = logs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= startOfWeek && logDate <= endOfWeek;
    });

    if (weeklyLogs.length === 0) {
      alert("No transactions found for the selected week.");
      return;
    }

    const headers = ["Date", "Type", "Item Code", "Name", "Quantity", "Party", "Stock After"];
    const rows = weeklyLogs.map(log => [
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
    const dateString = startOfWeek.toISOString().split('T')[0];
    link.setAttribute("download", `weekly_report_week_of_${dateString}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMonthlyReport = (date: Date) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const monthlyLogs = logs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= startOfMonth && logDate <= endOfMonth;
    });

    if (monthlyLogs.length === 0) {
      alert("No transactions found for the selected month.");
      return;
    }

    const headers = ["Date", "Type", "Item Code", "Name", "Quantity", "Party", "Stock After"];
    const rows = monthlyLogs.map(log => [
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
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    link.setAttribute("download", `monthly_report_${dateString}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <InventoryContext.Provider value={{ 
      items, 
      logs, 
      loading, 
      isConnected: !!apiUrl,
      connectionError,
      addItem, 
      updateItem, 
      importItems, 
      processInward, 
      processBulkInward, 
      processOutward, 
      processBulkOutward,
      exportData, 
      exportDailyReport,
      exportWeeklyReport,
      exportMonthlyReport,
      adjustStock,
      setConnectionUrl 
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within InventoryProvider");
  return context;
};