import React, { useState } from 'react';
import { Clock, CheckCircle, Check, Trash2, X, Loader2 } from 'lucide-react';
import { VOID_REASONS, VOID_REASON_OTHER } from '@/lib/voidReasons';
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
    unit?: string;
  };
}

interface TableGroup {
  table_id: string;
  table_number: number;
  order_id: number;
  oldest_created_at: string;
  items: OrderItem[];
}

interface KitchenOrderCardProps {
  group: TableGroup;
  getWaitTimeMinutes: (createdAtStr: string) => number;
  markItemAsServed: (itemId: number) => void;
  markAllTableItemsAsServed: (items: OrderItem[]) => void;
  voidOrderItem: (itemId: number, reasonCode: string, note: string | null, quantity: number) => Promise<boolean>;
}

// รายการเหตุผลใช้ร่วมกับหน้า POS แล้ว — เดิมสองหน้าจอมีคนละชุด (L15)

/** Inline void dialog ที่แสดงใต้รายการ */
const VoidDialog: React.FC<{
  item: OrderItem;
  onConfirm: (reasonCode: string, note: string | null, qty: number) => Promise<void>;
  onCancel: () => void;
}> = ({ item, onConfirm, onCancel }) => {
  const [reasonCode, setReasonCode] = useState(VOID_REASONS[0].code);
  const [customReason, setCustomReason] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const note = customReason.trim();
  // "อื่นๆ" ต้องระบุเหตุผล — ที่เหลือกดได้เลย
  const canSubmit = reasonCode !== VOID_REASON_OTHER || note.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    await onConfirm(reasonCode, note || null, qty);
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
              key={r.code}
              type="button"
              onClick={() => setReasonCode(r.code)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                reasonCode === r.code
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700 hover:border-rose-300 dark:hover:border-rose-700'
              }`}
            >
              {r.label}
              {r.restoresStock ? ' ↩' : ''}
            </button>
          ))}
        </div>
        {reasonCode === VOID_REASON_OTHER && (
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
          disabled={loading || !canSubmit}
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

  let barAccentStyle = 'bg-red-600 dark:bg-red-500';
  let badgeStyle = 'bg-slate-100 dark:bg-neutral-800/90 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700/60';

  if (waitMinutes >= 15) {
    barAccentStyle = 'bg-rose-500 animate-pulse';
    badgeStyle = 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 animate-pulse';
  } else if (waitMinutes >= 8) {
    barAccentStyle = 'bg-amber-500';
    badgeStyle = 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60';
  }

  return (
    <Card className="overflow-hidden flex flex-col justify-between border border-slate-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/90 shadow-sm rounded-2xl">
      <div>
        {/* Card Header */}
        <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            {/* Red accent bar */}
            <div className={`w-1 h-6 sm:h-7 rounded-full shrink-0 ${barAccentStyle}`} />
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-neutral-100 leading-tight">
                โต๊ะ {group.table_number || group.table_id}
              </h3>
              <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium block mt-0.5">
                รวม {group.items.reduce((s, i) => s + i.quantity, 0)} รายการ
              </span>
            </div>
          </div>

          {/* Dark Time Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${badgeStyle}`}>
            <Clock className="w-3.5 h-3.5 stroke-[2.2] shrink-0 opacity-80" />
            <span>{waitMinutes} นาทีที่แล้ว</span>
          </div>
        </div>

        {/* Item Rows */}
        <div className="px-4 divide-y divide-slate-100 dark:divide-neutral-800/70">
          {group.items.map(item => (
            <div key={item.id} className="py-3">
              <div className="flex items-center justify-between gap-2">
                {/* Item Name & Notes */}
                <div className="min-w-0 flex-1 pr-2">
                  <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-neutral-100 block truncate">
                    {item.menu_items?.name}
                  </span>
                  {item.notes && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                      📝 {item.notes}
                    </p>
                  )}
                </div>

                {/* Quantity & Unit (Separated, centered) */}
                <div className="shrink-0 text-center px-2 min-w-[72px] sm:min-w-[84px]">
                  <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-neutral-400 tabular-nums">
                    ×{item.quantity} {item.menu_items?.unit || 'จาน'}
                  </span>
                </div>

                {/* Action Buttons (Aligned, reduced shadow/glow) */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Void button */}
                  <button
                    type="button"
                    onClick={() => setOpenVoidId(openVoidId === item.id ? null : item.id)}
                    className={`p-1.5 transition-colors duration-150 rounded-lg cursor-pointer focus:outline-none focus-visible:outline-none ${
                      openVoidId === item.id
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                        : 'text-rose-400/80 hover:text-rose-500 dark:text-rose-500/70 dark:hover:text-rose-400 hover:bg-rose-500/10 active:scale-95'
                    }`}
                    title="Void รายการนี้"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>

                  {/* Serve button (Clean emerald rounded square, no heavy glow) */}
                  <button
                    type="button"
                    onClick={() => markItemAsServed(item.id)}
                    className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white transition-colors duration-150 flex items-center justify-center cursor-pointer shrink-0 focus:outline-none focus-visible:outline-none shadow-xs"
                    title="กดเสิร์ฟรายการนี้"
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Inline void dialog */}
              {openVoidId === item.id && (
                <VoidDialog
                  item={item}
                  onConfirm={async (reasonCode, note, qty) => {
                    const ok = await voidOrderItem(item.id, reasonCode, note, qty);
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
      <div className="p-4 pt-3">
        <button
          type="button"
          onClick={() => markAllTableItemsAsServed(group.items)}
          className="w-full py-3 bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold text-sm sm:text-base rounded-xl transition-all duration-150 active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-xs focus:outline-none focus-visible:outline-none select-none"
        >
          <CheckCircle className="w-4.5 h-4.5" />
          <span>เสิร์ฟทั้งหมดของโต๊ะ {group.table_number || group.table_id}</span>
        </button>
      </div>
    </Card>
  );
};
