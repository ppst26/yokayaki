"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ChefHat, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { KitchenOrderCard } from './KitchenOrderCard';
import { Card } from '@/components/ui/card';
import { playNewOrderSound, playCheckBillSound } from '@/lib/audioNotifier';
import type { KitchenOrderItem, KitchenPrintLine, KitchenTableGroup } from './types';

type OrderItem = KitchenOrderItem;
type TableGroup = KitchenTableGroup;
const PRINT_CLASS = 'print-kitchen-ticket';

type KitchenPrintPayload = {
  tableLabel: string;
  printedAt: string;
  lines: KitchenPrintLine[];
};

function formatKitchenPrintTime(d = new Date()): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export const KitchenScreen: React.FC = () => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const [now, setNow] = useState<Date>(new Date());
  const prevPendingCountRef = useRef<number>(0);
  const [printPayload, setPrintPayload] = useState<KitchenPrintPayload | null>(null);

  const cleanupPrintClass = useCallback(() => {
    document.documentElement.classList.remove(PRINT_CLASS);
  }, []);

  useEffect(() => {
    window.addEventListener('afterprint', cleanupPrintClass);
    return () => {
      window.removeEventListener('afterprint', cleanupPrintClass);
      cleanupPrintClass();
    };
  }, [cleanupPrintClass]);

  // PERF/4 — silent = ไม่โชว์ spinner เต็มจอ
  const fetchKitchenItems = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          menu_item_id,
          quantity,
          unit_price,
          status,
          created_at,
          notes,
          menu_items (id, name, category, unit),
          orders!inner (
            table_id,
            status,
            tables (table_number)
          )
        `)
        .in('status', ['pending', 'served'])
        .eq('orders.status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const fetchedItems = data as unknown as OrderItem[];
        prevPendingCountRef.current = fetchedItems.filter(i => i.status === 'pending').length;
        setItems(fetchedItems);
      }
    } catch (err) {
      console.error('Error fetching kitchen items:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const markItemAsServed = async (itemId: number) => {
    try {
      setItems(prev =>
        prev.map(i => (i.id === itemId ? { ...i, status: 'served' as const } : i)),
      );

      const res = await fetch(`/api/kitchen/items/${itemId}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('serve failed');
    } catch (err) {
      console.error('Error marking item as served:', err);
      fetchKitchenItems();
    }
  };

  const voidOrderItem = async (
    itemId: number,
    reasonCode: string,
    note: string | null,
    quantity: number
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/orders/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: itemId,
          voidQuantity: quantity,
          reasonCode,
          reasonNote: note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);

      fetchKitchenItems(true);
      return true;
    } catch (err) {
      console.error('Error voiding item from kitchen:', err);
      return false;
    }
  };

  const markAllTableItemsAsServed = async (itemsToServe: OrderItem[]) => {
    const pending = itemsToServe.filter(i => i.status === 'pending');
    if (pending.length === 0) return;

    const itemIds = pending.map(i => i.id);
    try {
      setItems(prev =>
        prev.map(i =>
          itemIds.includes(i.id) ? { ...i, status: 'served' as const } : i,
        ),
      );

      const res = await fetch('/api/kitchen/serve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      });
      if (!res.ok) throw new Error('batch serve failed');
    } catch (err) {
      console.error('Error serving all table items:', err);
      fetchKitchenItems();
    }
  };

  const printPayloadRef = useRef<KitchenPrintPayload | null>(null);

  const printTableTicket = (group: TableGroup) => {
    const pending = group.items
      .filter(i => i.status === 'pending')
      .slice()
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

    if (pending.length === 0) return;

    const payload: KitchenPrintPayload = {
      tableLabel: String(group.table_number || group.table_id),
      printedAt: formatKitchenPrintTime(),
      lines: pending.map(i => ({
        name: i.menu_items?.name || '—',
        quantity: i.quantity,
        unit: i.menu_items?.unit || 'จาน',
        notes: i.notes || undefined,
      })),
    };

    printPayloadRef.current = payload;
    setPrintPayload(payload);
  };

  useEffect(() => {
    if (!printPayload || printPayloadRef.current !== printPayload) return;
    printPayloadRef.current = null;
    document.documentElement.classList.add(PRINT_CLASS);
    const id = requestAnimationFrame(() => {
      window.print();
    });
    return () => cancelAnimationFrame(id);
  }, [printPayload]);

  useEffect(() => {
    fetchKitchenItems();

    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);

    let refetchTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      refetchTimer = setTimeout(() => {
        refetchTimer = null;
        fetchKitchenItems(true);
      }, 400);
    };

    const channel = supabase
      .channel('realtime:kitchen_items')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items' },
        (payload: any) => {
          if (soundEnabledRef.current && payload.new && payload.new.status === 'pending') {
            playNewOrderSound();
          }
          scheduleRefetch();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_items' },
        scheduleRefetch
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tables' },
        (payload: any) => {
          if (
            soundEnabledRef.current &&
            payload.new &&
            payload.new.status === 'checking_out' &&
            payload.old?.status !== 'checking_out'
          ) {
            playCheckBillSound();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      if (refetchTimer) clearTimeout(refetchTimer);
      channel.unsubscribe();
    };
  }, []);

  const groupMap: Record<string, TableGroup> = {};
  for (const item of items) {
    const tableId = item.orders?.table_id || 'unknown';
    const tableNumber = item.orders?.tables?.table_number ?? 0;
    if (!groupMap[tableId]) {
      groupMap[tableId] = {
        table_id: tableId,
        table_number: tableNumber,
        order_id: item.order_id,
        oldest_created_at: item.created_at,
        items: [],
      };
    }
    groupMap[tableId].items.push(item);
  }

  for (const group of Object.values(groupMap)) {
    group.items.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const pending = group.items.filter(i => i.status === 'pending');
    const anchor = pending[0] ?? group.items[0];
    group.oldest_created_at = anchor?.created_at ?? group.oldest_created_at;
  }

  const tableGroups = Object.values(groupMap).sort(
    (a, b) =>
      new Date(a.oldest_created_at).getTime() -
      new Date(b.oldest_created_at).getTime()
  );

  const getWaitTimeMinutes = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime();
    const diffMs = now.getTime() - created;
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  };

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-6">
      {/* โซนพิมพ์สลิปครัว 48mm */}
      <div
        id="kitchen-ticket-print"
        className="pointer-events-none absolute left-[-9999px] top-0 w-[48mm] bg-white text-black"
        aria-hidden="true"
      >
        {printPayload && (
          <>
            <p className="kitchen-ticket-title">โต๊ะ {printPayload.tableLabel}</p>
            <p className="kitchen-ticket-time">{printPayload.printedAt}</p>
            <div className="kitchen-ticket-rule" />
            {printPayload.lines.map((line, idx) => (
              <div key={idx} className="kitchen-ticket-line">
                <p className="kitchen-ticket-item">
                  ×{line.quantity} {line.name}
                </p>
                {line.notes ? (
                  <p className="kitchen-ticket-note">โน้ต: {line.notes}</p>
                ) : null}
              </div>
            ))}
            <div className="kitchen-ticket-rule" />
            <p className="kitchen-ticket-footer">
              รายการค้าง {printPayload.lines.length} รายการ
            </p>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
            <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400 shrink-0" />
            <span>ห้องครัว</span>
          </h1>
          <p className="text-caption mt-0.5">
            รายการออเดอร์ทีต้องทำเสริ์ฟ
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-neutral-400'
            }`}
            title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'เปิดเสียงแจ้งเตือน' : 'ปิดเสียง'}</span>
          </button>

          <button
            onClick={() => fetchKitchenItems()}
            className="p-2 sm:p-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 rounded-xl transition active:scale-95 shadow-xs cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tableGroups.length === 0 ? (
        <Card className="text-center py-20 p-8 space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <ChefHat className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
            ยังไม่มีออเดอร์ในครัว
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold max-w-sm mx-auto">
            เมื่อมีออเดอร์ใหม่จากพนักงาน POS หรือลูกค้าระบบจะแสดงการ์ดรายการอาหารให้ที่นี่โดยอัตโนมัติ
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-start">
          {tableGroups.map(group => (
            <KitchenOrderCard
              key={group.table_id}
              group={group}
              getWaitTimeMinutes={getWaitTimeMinutes}
              markItemAsServed={markItemAsServed}
              markAllTableItemsAsServed={markAllTableItemsAsServed}
              voidOrderItem={voidOrderItem}
              onPrintTicket={printTableTicket}
            />
          ))}
        </div>
      )}
    </div>
  );
};
