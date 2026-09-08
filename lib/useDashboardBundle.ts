"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { storeTimestampRange } from '@/lib/storeDateRange';

export interface DashboardPaymentRow {
  id: number;
  payment_method: string;
  subtotal: number | string;
  discount_amount: number | string;
  net_amount: number | string;
  cash_amount: number | string | null;
  promptpay_amount: number | string | null;
  created_at: string | null;
}

export interface DashboardIngredientRow {
  name: string;
  cost: number | string;
  purchase_date: string;
}

export interface DashboardOrderItemRow {
  quantity: number;
  unit_price: number | string;
  menu_items: { name: string } | null;
}

export interface DashboardPromoRow {
  promotion_name: string;
  discount_value: number | string;
}

export interface DashboardBundle {
  payments: DashboardPaymentRow[];
  ingredients: DashboardIngredientRow[];
  orderItems: DashboardOrderItemRow[];
  memberCount: number;
  promos: DashboardPromoRow[];
  loading: boolean;
}

/** ดึงข้อมูล dashboard ชุดเดียว ขนานกัน — ลด ~9 round-trip ที่ซ้ำ */
export function useDashboardBundle(
  startDate: Date,
  endDate: Date,
  refreshKey: number,
): DashboardBundle {
  const [payments, setPayments] = useState<DashboardPaymentRow[]>([]);
  const [ingredients, setIngredients] = useState<DashboardIngredientRow[]>([]);
  const [orderItems, setOrderItems] = useState<DashboardOrderItemRow[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [promos, setPromos] = useState<DashboardPromoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { startISO, endISO, startDateStr, endDateStr } = storeTimestampRange(
          startDate,
          endDate,
        );

        const [payRes, ingRes, itemRes, memberRes, promoRes] = await Promise.all([
          supabase
            .from('payments')
            .select(
              'id, payment_method, subtotal, discount_amount, net_amount, cash_amount, promptpay_amount, created_at'
            )
            .gte('created_at', startISO)
            .lte('created_at', endISO)
            .order('created_at', { ascending: true }),
          supabase
            .from('item_ingredients')
            .select('name, cost, purchase_date')
            .gte('purchase_date', startDateStr)
            .lte('purchase_date', endDateStr)
            .order('cost', { ascending: false }),
          supabase
            .from('order_items')
            .select('quantity, unit_price, menu_items(name)')
            .neq('status', 'voided')
            .gte('created_at', startISO)
            .lte('created_at', endISO),
          supabase
            .from('loyalty_members')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startISO)
            .lte('created_at', endISO),
          supabase
            .from('payment_promotions')
            .select('promotion_name, discount_value')
            .gte('created_at', startISO)
            .lte('created_at', endISO),
        ]);

        if (cancelled) return;

        if (payRes.error) throw payRes.error;
        if (ingRes.error) throw ingRes.error;
        if (itemRes.error) throw itemRes.error;
        if (promoRes.error) throw promoRes.error;

        setPayments((payRes.data ?? []) as DashboardPaymentRow[]);
        setIngredients((ingRes.data ?? []) as DashboardIngredientRow[]);
        setOrderItems((itemRes.data ?? []) as unknown as DashboardOrderItemRow[]);
        setMemberCount(memberRes.count ?? 0);
        setPromos((promoRes.data ?? []) as DashboardPromoRow[]);
      } catch (err) {
        console.error('useDashboardBundle fetch error:', err);
        if (!cancelled) {
          setPayments([]);
          setIngredients([]);
          setOrderItems([]);
          setMemberCount(0);
          setPromos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, refreshKey]);

  return { payments, ingredients, orderItems, memberCount, promos, loading };
}
