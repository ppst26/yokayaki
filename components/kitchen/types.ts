export interface KitchenOrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  status: 'pending' | 'served' | 'voided';
  created_at: string;
  notes?: string;
  menu_items: {
    id: number;
    name: string;
    category?: string;
    unit?: string;
  };
  orders?: {
    table_id: string;
    status: string;
    tables?: {
      table_number: number;
    } | null;
  };
}

export interface KitchenTableGroup {
  table_id: string;
  table_number: number;
  order_id: number;
  oldest_created_at: string;
  items: KitchenOrderItem[];
}

export type KitchenPrintLine = {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
};
