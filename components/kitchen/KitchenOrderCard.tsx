import React, { useState } from 'react';
import { Clock, CheckCircle, Trash2, X, Loader2, ChevronDown } from 'lucide-react';
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
  voidOrderItem: (itemId: number, reason: string, quantity: number) => Promise<boolean>;
}

const VOID_REASONS = ['คีย์ผิด', 'ลูกค้าเปลี่ยนใจ', 'วัตถุดิบหมด', 'อื่นๆ (ระบุ)'];

/** Inline void dialog ที่แสดงใต้รายการ */
const VoidDialog: React.FC<{
  item: OrderItem;
  onConfirm: (reason: string, qty: number) => Promise<void>;
  onCancel: () => void;
}> = ({ item, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('คีย์ผิด');
  const [customReason, setCustomReason] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const finalReason = reason === 'อื่นๆ (ระบุ)' ? customReason.trim() : reason;

  const handleSubmit = async () => {
    if (!finalReason) return;
    setLoading(true);
    await onConfirm(finalReason, qty);
    setLoading(false);
  };

  return (
    <div className="mt-2 mb-1 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-3 space-y-3 text-xs">
      <p className="font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
        <Trash2 className="w-3.5 h-3.5" />
        Void: <span className="font-bold text-slate-800 dark:text-neutral-200">{item.menu_items?.name}</span>
      </p>

      {/* จำนวน */}
      {item.quantity > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-neutral-400 font-semibold shrink-0">จำนวน Void:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-6 h-6 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-700 transition"
            >−</button>
            <span className="w-6 text-center font-black text-slate-800 dark:text-neutral-100">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(q => Math.min(item.quantity, q + 1))}
              className="w-6 h-6 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-700 transition"
            >+</button>
            <span className="text-slate-400 dark:text-neutral-500 ml-1">/ {item.quantity}</span>
          </div>
        </div>
      )}

      {/* เหตุผล */}
      <div className="space-y-1.5">
        <span className="text-slate-500 dark:text-neutral-400 font-semibold block">เหตุผล:</span>
        <div className="grid grid-cols-2 gap-1">
          {VOID_REASONS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                reason === r
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700 hover:border-rose-300 dark:hover:border-rose-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {reason === 'อื่นๆ (ระบุ)' && (
          <input
            type="text"
            autoFocus
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            placeholder="ระบุเหตุผล..."
            className="w-full bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-neutral-100 focus:border-rose-400 focus:outline-none"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 font-bold transition hover:bg-slate-50 dark:hover:bg-neutral-700 cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !finalReason}
          className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold transition cursor-pointer flex items-center justify-center gap-1"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Void
        </button>
      </div>
    </div>
  );
};

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({
  group,
  getWaitTimeMinutes,
  markItemAsServed,
  markAllTableItemsAsServed,
  voidOrderItem,
}) => {
  const [openVoidId, setOpenVoidId] = useState<number | null>(null);
  const waitMinutes = getWaitTimeMinutes(group.oldest_created_at);

  let cardHeaderStyle = 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white';
  let badgeStyle = 'bg-white text-slate-900 dark:text-slate-900 font-black shadow-xs';

  if (waitMinutes >= 15) {
    cardHeaderStyle = 'bg-gradient-to-r from-rose-600 via-red-700 to-rose-800 text-white animate-pulse';
    badgeStyle = 'bg-amber-300 text-slate-950 dark:text-slate-950 font-black shadow-md animate-bounce';
  } else if (waitMinutes >= 8) {
    cardHeaderStyle = 'bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 text-white';
    badgeStyle = 'bg-amber-100 text-amber-950 dark:text-amber-950 font-black shadow-xs';
  }

  return (
    <Card className="overflow-hidden flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className={`p-4 flex items-center justify-between transition ${cardHeaderStyle}`}>
          <div>
            <h3 className="text-h2 text-white">โต๊ะ {group.table_id}</h3>
            <span className="text-xs text-white font-extrabold block mt-0.5 opacity-95">
              รวม {group.items.reduce((s, i) => s + i.quantity, 0)} รายการ
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-xs ${badgeStyle}`}>
            <Clock className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span className="text-price">{waitMinutes} นาทีที่แล้ว</span>
          </div>
        </div>

        {/* Item Rows */}
        <div className="px-4 divide-y divide-slate-100 dark:divide-neutral-800">
          {group.items.map(item => (
            <div key={item.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
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

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Void button */}
                  <button
                    onClick={() => setOpenVoidId(openVoidId === item.id ? null : item.id)}
                    className={`p-1.5 transition-all duration-200 cursor-pointer ${
                      openVoidId === item.id
                        ? 'text-rose-600 dark:text-rose-400 scale-110'
                        : 'text-rose-400 hover:text-rose-600 dark:text-rose-500/80 dark:hover:text-rose-400 hover:scale-110 active:scale-95'
                    }`}
                    title="Void รายการนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Serve button */}
                  <button
                    onClick={() => markItemAsServed(item.id)}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-600 text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border-none cursor-pointer shrink-0"
                    title="กดเสิร์ฟรายการนี้"
                  >
                    <CheckCircle className="w-5 h-5 stroke-[2.2]" />
                  </button>
                </div>
              </div>

              {/* Inline void dialog */}
              {openVoidId === item.id && (
                <VoidDialog
                  item={item}
                  onConfirm={async (reason, qty) => {
                    const ok = await voidOrderItem(item.id, reason, qty);
                    if (ok) setOpenVoidId(null);
                  }}
                  onCancel={() => setOpenVoidId(null)}
                />
              )}
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
