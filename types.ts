export interface Item {
  code: string;
  name: string;
  category: string;
  openingStock: number;
  currentStock: number;
  uom: string; // Unit of Measure
}

export enum TransactionType {
  INWARD = 'INWARD',
  OUTWARD = 'OUTWARD'
}

export interface LogEntry {
  id: string;
  date: string; // ISO String
  itemCode: string;
  itemName: string;
  type: TransactionType;
  quantity: number;
  partyName: string; // Supplier for Inward, Customer for Outward
  stockAfter: number;
}

export interface DashboardStats {
  totalItems: number;
  totalStock: number;
  lowStockItems: number;
  recentActivityCount: number;
}

export const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Stationery',
  'Groceries',
  'Clothing',
  'Raw Materials',
  'Others'
];

export const UNITS = ['pcs', 'kg', 'ltr', 'box', 'm', 'set'];