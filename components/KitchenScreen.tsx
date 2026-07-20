"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, CheckCircle2, Volume2, VolumeX, Loader2, RefreshCw, ChefHat } from 'lucide-react';

interface KdsItem {
  id: number;
  quantity: number;
  status: 'pending' | 'served' | 'voided';
  notes?: string;
  created_at: string;
  menu_items: {
    name: string;
    category: string;
  };
  orders: {
    id: number;
    table_id: number;
  };
}

export const KitchenScreen: React.FC = () => {
  const [items, setItems] = useState<KdsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [muteSound, setMuteSound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Keep a ref of current item IDs to detect new items
  const itemIdsRef = useRef<Set<number>>(new Set());

  // Function to play sound alert
  const playChime = () => {
    if (muteSound) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = ctx.currentTime;
      playNote(523.25, now, 0.25); // C5
      playNote(659.25, now + 0.12, 0.35); // E5
    } catch (err) {
      console.error("Audio error:", err);
    }
  };

  const fetchKdsItems = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setErrorMsg(null);

      // Query active order items with status 'pending' and their order status is 'active'
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          status,
          notes,
          created_at,
          menu_items (
            name,
            category
          ),
          orders!inner (
            id,
            table_id,
            status
          )
        `)
        .eq('status', 'pending')
        .eq('orders.status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data) {
        const fetchedItems = data as unknown as KdsItem[];
        
        // Detect new items to trigger the sound alert
        if (!isInitial && fetchedItems.length > 0) {
          const hasNewItems = fetchedItems.some(item => !itemIdsRef.current.has(item.id));
          if (hasNewItems) {
            playChime();
          }
        }
        
        // Update refs
        itemIdsRef.current = new Set(fetchedItems.map(item => item.id));
        setItems(fetchedItems);
      }
    } catch (err: any) {
      console.error('Error fetching KDS items:', err);
      setErrorMsg('ไม่สามารถดึงข้อมูลรายการออเดอร์ในครัวได้');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchKdsItems(true);

    // Subscribe to order items updates for real-time order notifications in the kitchen
    const channel = supabase
      .channel('realtime:kds_order_items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchKdsItems(false);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [muteSound]);

  // Handle single item serving
  const serveItem = async (itemId: number) => {
    try {
      setErrorMsg(null);
      const { error } = await supabase
        .from('order_items')
        .update({ status: 'served' })
        .eq('id', itemId);

      if (error) throw error;
      
      // Update local state immediately for fast feedback
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error('Error serving item:', err);
      setErrorMsg('ไม่สามารถปรับปรุงสถานะรายการอาหารได้');
    }
  };

  // Handle batch table serving
  const serveAllTableItems = async (tableId: number, itemIds: number[]) => {
    try {
      setErrorMsg(null);
      const { error } = await supabase
        .from('order_items')
        .update({ status: 'served' })
        .in('id', itemIds);

      if (error) throw error;
      
      // Update local state
      setItems(prev => prev.filter(item => !itemIds.includes(item.id)));
    } catch (err) {
      console.error('Error serving all items for table:', err);
      setErrorMsg('ไม่สามารถปรับปรุงสถานะออเดอร์ทั้งหมดของโต๊ะได้');
    }
  };

  // Group items by table
  const groupedByTable = items.reduce((acc, item) => {
    const tableId = item.orders.table_id;
    if (!acc[tableId]) {
      acc[tableId] = [];
    }
    acc[tableId].push(item);
    return acc;
  }, {} as Record<number, KdsItem[]>);

  // Helper to calculate wait time string
  const getWaitTime = (createdAt: string) => {
    const minutes = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    if (minutes <= 0) return 'เพิ่งสั่ง';
    return `${minutes} นาทีที่แล้ว`;
  };

  const getWaitTimeColorClass = (createdAt: string) => {
    const minutes = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    if (minutes >= 15) return 'text-red-400 bg-red-950/30 border-red-900/30 animate-pulse';
    if (minutes >= 8) return 'text-orange-400 bg-orange-950/30 border-orange-900/30';
    return 'text-stone-400 bg-stone-900/80 border-stone-800';
  };

  return (
    <div className="space-y-6">
      {/* KDS Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-900/20 border border-stone-850 p-4 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-100">รายการรับงานในครัว (KDS)</h2>
            <p className="text-xs text-stone-400 mt-0.5">จัดการออเดอร์เรียลไทม์ที่รอปรุงในครัว</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mute Button */}
          <button
            onClick={() => setMuteSound(!muteSound)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition ${
              muteSound
                ? 'bg-red-950/20 border-red-900/30 text-red-400 hover:bg-red-950/30'
                : 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400 hover:bg-emerald-950/30'
            }`}
          >
            {muteSound ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>ปิดเสียงแจ้งเตือน</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>เปิดเสียงแจ้งเตือน</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchKdsItems(true)}
            className="p-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white rounded-xl transition active:scale-95 cursor-pointer"
            title="รีเฟรชคิวครัว"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/30 border border-red-900/50 text-red-400 rounded-2xl text-sm font-semibold">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
          <p className="text-stone-500 text-sm">กำลังอัปเดตออเดอร์ในครัว...</p>
        </div>
      ) : Object.keys(groupedByTable).length === 0 ? (
        <div className="text-center py-32 bg-stone-900/20 border border-stone-850/80 border-dashed rounded-3xl">
          <ChefHat className="w-16 h-16 text-stone-700 mx-auto mb-4 stroke-[1.2]" />
          <h3 className="text-lg font-bold text-stone-400">ยังไม่มีรายการออเดอร์รอปรุง</h3>
          <p className="text-stone-500 text-xs mt-1">เมื่อลูกค้าสั่งอาหารหรือพนักงานคีย์เข้าระบบ รายการจะปรากฏที่นี่ทันที</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Object.entries(groupedByTable).map(([tableId, tableItems]) => {
            const itemIds = tableItems.map(item => item.id);
            // Find the oldest order time for this table card
            const oldestOrderTime = tableItems.reduce((oldest, current) => {
              return new Date(current.created_at) < new Date(oldest) ? current.created_at : oldest;
            }, tableItems[0].created_at);

            return (
              <div
                key={tableId}
                className="bg-stone-900/30 border border-stone-800 rounded-3xl overflow-hidden flex flex-col justify-between"
              >
                {/* Table Card Header */}
                <div className="p-4 bg-stone-900/70 border-b border-stone-850 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white">โต๊ะ {tableId}</h3>
                    <p className="text-[10px] text-stone-500 mt-0.5">มีทั้งหมด {tableItems.length} รายการ</p>
                  </div>
                  {/* Timer widget */}
                  <div className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold border rounded-lg ${getWaitTimeColorClass(oldestOrderTime)}`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{getWaitTime(oldestOrderTime)}</span>
                  </div>
                </div>

                {/* Table Card Food Queue */}
                <div className="p-4 space-y-3 flex-1">
                  {tableItems.map(item => (
                    <div
                      key={item.id}
                      className="p-3 bg-stone-950/60 border border-stone-850 rounded-2xl flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-100 text-base">{item.menu_items?.name}</span>
                          <span className="text-xs font-extrabold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg whitespace-nowrap">
                            x{item.quantity} จาน
                          </span>
                        </div>
                        {/* Note badge */}
                        {item.notes && (
                          <div className="text-xs text-orange-400 font-extrabold bg-orange-950/20 border border-orange-900/30 px-2.5 py-1 rounded-lg mt-1 select-none">
                            โน้ต: {item.notes}
                          </div>
                        )}
                        <div className="text-[10px] text-stone-500">
                          {item.menu_items?.category || 'เมนู'} • สั่งตอน {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </div>
                      </div>

                      {/* Individual serve button */}
                      <button
                        onClick={() => serveItem(item.id)}
                        className="p-2 bg-stone-900 hover:bg-emerald-500/10 border border-stone-800 hover:border-emerald-500/20 text-stone-400 hover:text-emerald-400 rounded-xl active:scale-95 transition cursor-pointer"
                        title="เสิร์ฟจานนี้"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Table Card Footer / Serve All */}
                <div className="p-4 bg-stone-900/10 border-t border-stone-850">
                  <button
                    onClick={() => serveAllTableItems(Number(tableId), itemIds)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-black text-xs font-extrabold rounded-xl active:scale-97 transition shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>เสิร์ฟทั้งหมดของโต๊ะ {tableId}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
