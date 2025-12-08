import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Item, LogEntry, TransactionType } from '../types';

interface InventoryContextType {
  items: Item[];
  logs: LogEntry[];
  addItem: (item: Item) => void;
  updateItem: (code: string, updates: Partial<Item>) => void;
  processInward: (data: { itemCode: string; quantity: number; supplier: string; newItemDetails?: Partial<Item> }) => Promise<void>;
  processOutward: (data: { itemCode: string; quantity: number; customer: string }) => Promise<void>;
  exportData: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Mock Initial Data
const INITIAL_ITEMS: Item[] = [
  { code: 'IT001', name: 'Laptop Dell XPS', category: 'Electronics', openingStock: 10, currentStock: 8, uom: 'pcs' },
  { code: 'IT002', name: 'Office Chair', category: 'Furniture', openingStock: 50, currentStock: 45, uom: 'pcs' },
  { code: 'IT003', name: 'A4 Paper Rim', category: 'Stationery', openingStock: 100, currentStock: 12, uom: 'box' },
];

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Simulate loading from Google Sheets
  useEffect(() => {
    // In a real app, this would fetch from the Google Apps Script Web App URL
    console.log('Inventory System Initialized');
  }, []);

  const addItem = (newItem: Item) => {
    setItems(prev => [...prev, newItem]);
  };

  const updateItem = (code: string, updates: Partial<Item>) => {
    setItems(prev => prev.map(item => item.code === code ? { ...item, ...updates } : item));
  };

  const processInward = async ({ itemCode, quantity, supplier, newItemDetails }: { itemCode: string; quantity: number; supplier: string; newItemDetails?: Partial<Item> }) => {
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let currentItem = items.find(i => i.code === itemCode);
    let stockAfter = quantity;

    if (currentItem) {
      stockAfter = currentItem.currentStock + quantity;
      updateItem(itemCode, { currentStock: stockAfter });
    } else if (newItemDetails && newItemDetails.name && newItemDetails.category) {
      // New Item Logic
      const newItem: Item = {
        code: itemCode,
        name: newItemDetails.name,
        category: newItemDetails.category,
        uom: newItemDetails.uom || 'pcs',
        openingStock: 0,
        currentStock: quantity
      };
      addItem(newItem);
      currentItem = newItem;
      stockAfter = quantity;
    } else {
      throw new Error("Item not found and no new item details provided.");
    }

    const newLog: LogEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      itemCode,
      itemName: currentItem ? currentItem.name : newItemDetails?.name || 'Unknown',
      type: TransactionType.INWARD,
      quantity,
      partyName: supplier,
      stockAfter
    };

    setLogs(prev => [newLog, ...prev]);
  };

  const processOutward = async ({ itemCode, quantity, customer }: { itemCode: string; quantity: number; customer: string }) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const currentItem = items.find(i => i.code === itemCode);
    if (!currentItem) throw new Error("Item not found.");

    if (currentItem.currentStock < quantity) {
      throw new Error(`Insufficient stock! Available: ${currentItem.currentStock}`);
    }

    const stockAfter = currentItem.currentStock - quantity;
    updateItem(itemCode, { currentStock: stockAfter });

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
  };

  const exportData = () => {
    // Simple CSV export implementation
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

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <InventoryContext.Provider value={{ items, logs, addItem, updateItem, processInward, processOutward, exportData }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within InventoryProvider");
  return context;
};