import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface OrderItem {
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
  };
}

interface TableGroup {
  table_id: number;
  order_id: number;
  oldest_created_at: string;
  items: OrderItem[];
}

interface KitchenOrderCardProps {
  group: TableGroup;
  getWaitTimeMinutes: (createdAtStr: string) => number;
  markItemAsServed: (itemId: number) => void;
  markAllTableItemsAsServed: (items: OrderItem[]) => void;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({
  group,
  getWaitTimeMinutes,
  markItemAsServed,
  markAllTableItemsAsServed,
}) => {
  const waitMinutes = getWaitTimeMinutes(group.oldest_created_at);

  let cardHeaderStyle = 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white';
  let badgeStyle = 'bg-white/20 backdrop-blur-xs text-white border border-white/30';

  if (waitMinutes >= 15) {
    cardHeaderStyle = 'bg-gradient-to-r from-rose-600 via-red-700 to-rose-800 text-white animate-pulse';
    badgeStyle = 'bg-white/25 backdrop-blur-xs text-white border border-white/40';
  } else if (waitMinutes >= 8) {
    cardHeaderStyle = 'bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 text-white';
    badgeStyle = 'bg-white/20 backdrop-blur-xs text-white border border-white/30';
  }

  return (
    <Card className="overflow-hidden flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className={`p-4 flex items-center justify-between transition ${cardHeaderStyle}`}>
          <div>
            <h3 className="text-h2 text-white">โต๊ะ {group.table_id}</h3>
            <span className="text-caption text-red-100 block">
              รวม {group.items.reduce((s, i) => s + i.quantity, 0)} รายการ
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-bold shadow-xs ${badgeStyle}`}>
            <Clock className="w-3.5 h-3.5" />
            <span className="text-price">{waitMinutes} นาทีที่แล้ว</span>
          </div>
        </div>

        {/* Item Rows */}
        <div className="px-4 divide-y divide-slate-100 dark:divide-neutral-800">
          {group.items.map(item => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-h3 text-slate-900 dark:text-neutral-100">
                    {item.menu_items?.name}
                  </span>
                  <span className="text-xs font-black text-slate-700 dark:text-neutral-300 ml-1">
                    x{item.quantity} จาน
                  </span>
                </div>
                {item.notes && (
                  <p className="text-caption text-red-600 dark:text-red-400 font-medium">
                    📝 {item.notes}
                  </p>
                )}
              </div>

              <button
                onClick={() => markItemAsServed(item.id)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-600 text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border-none cursor-pointer shrink-0"
                title="กดเสิร์ฟรายการนี้"
              >
                <CheckCircle className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Serve All Button */}
      <div className="p-4 pt-0">
        <button
          onClick={() => markAllTableItemsAsServed(group.items)}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-body font-bold rounded-xl shadow-md shadow-red-600/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
          <span>เสิร์ฟทั้งหมดของโต๊ะ {group.table_id}</span>
        </button>
      </div>
    </Card>
  );
};
