"use client";

import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

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

  let cardHeaderStyle = 'bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 border-slate-200 dark:border-neutral-700';
  let badgeStyle = 'bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300';

  if (waitMinutes >= 15) {
    cardHeaderStyle = 'bg-rose-500 text-white border-rose-600 animate-pulse';
    badgeStyle = 'bg-rose-700 text-white';
  } else if (waitMinutes >= 8) {
    cardHeaderStyle = 'bg-amber-500 text-white border-amber-600';
    badgeStyle = 'bg-amber-700 text-white';
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className={`p-4 border-b flex items-center justify-between transition ${cardHeaderStyle}`}>
          <div>
            <h3 className="text-xl font-black tracking-tight">โต๊ะ {group.table_id}</h3>
            <span className="text-[11px] font-extrabold opacity-90 block">
              รวม {group.items.reduce((s, i) => s + i.quantity, 0)} รายการ
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-xs ${badgeStyle}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{waitMinutes} นาทีที่แล้ว</span>
          </div>
        </div>

        {/* Item Rows */}
        <div className="p-4 space-y-3">
          {group.items.map(item => (
            <div
              key={item.id}
              className="p-3 bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700/60 rounded-2xl flex items-center justify-between gap-3"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-neutral-100">
                    {item.menu_items?.name}
                  </span>
                  <span className="text-xs font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded-full">
                    x{item.quantity} จาน
                  </span>
                </div>
                {item.notes && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-bold">
                    {item.menu_items?.category ? `ของหวาน • ` : ''}สั่งเมื่อ {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                  </p>
                )}
              </div>

              <button
                onClick={() => markItemAsServed(item.id)}
                className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
                title="กดเสิร์ฟรายการนี้"
              >
                <CheckCircle className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Serve All Button */}
      <div className="p-4 pt-0">
        <button
          onClick={() => markAllTableItemsAsServed(group.items)}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-red-600/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
          <span>เสิร์ฟทั้งหมดของโต๊ะ {group.table_id}</span>
        </button>
      </div>
    </div>
  );
};
