export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ExtractedReceiptData {
  merchantName: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  totalDiscount: number;
  deliveryFee: number;
  serviceFee: number; // Platform fee, packaging, etc.
  tax: number;
}

export interface Person {
  id: string;
  name: string;
}

export interface Assignment {
  itemId: string;
  personId: string;
}

export type AppStep = 'upload' | 'verify' | 'assign' | 'result';