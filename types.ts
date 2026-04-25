export interface Item {
  code: string;
  name: string;
  category: string;
  openingStock: number;
  currentStock: number;
  uom: string; // Unit of Measure
  minStock?: number | null;
  maxStock?: number | null;
  location?: string;
}

export enum TransactionType {
  INWARD = 'INWARD',
  OUTWARD = 'OUTWARD',
  ADJUSTMENT = 'ADJUSTMENT'
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

export interface InwardEntry {
  itemCode: string;
  quantity: number;
  supplier: string;
  date?: string; // Optional manual date
  newItemDetails?: {
    name?: string;
    category?: string;
    uom?: string;
    minStock?: number | null;
    maxStock?: number | null;
    location?: string;
  };
}

export interface OutwardEntry {
  itemCode: string;
  quantity: number;
  customer: string;
  date?: string; // Optional manual date
}

export interface AdjustmentEntry {
  itemCode: string;
  newQuantity: number;
  reason: string;
  date?: string; // Optional manual date
}

export interface MinMaxEntry {
  itemCode: string;
  minStock?: number | null;
  maxStock?: number | null;
}

export interface LocationEntry {
  itemCode: string;
  location: string;
}

export interface BOMItem {
  itemCode: string;
  quantity: number; // Quantity required for 1 unit of FG
}

export interface BOM {
  fgCode: string;
  items: BOMItem[];
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