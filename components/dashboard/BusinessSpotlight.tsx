"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CreditCard, Banknote, Smartphone, ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BusinessSpotlightProps {
  startDate: Date;
  endDate: Date;
  refreshKey: number;
}

interface PaymentBreakdown {
  cash: number;
  promptpay: number;
  mixed: number;
  total: number;
  cashAmount: number;
  promptpayAmount: number;
  mixedAmount: number;
}

interface IngredientCostEntry {
  name: string;
  cost: number;
  purchase_date: string;
}

export const BusinessSpotlight: React.FC<BusinessSpotlightProps> = ({ startDate, endDate, refreshKey }) => {
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown>({ cash: 0, promptpay: 0, mixed: 0, total: 0, cashAmount: 0, promptpayAmount: 0, mixedAmount: 0 });
  const [totalIngredientCost, setTotalIngredientCost] = useState(0);
  const [topIngredients, setTopIngredients] = useState<IngredientCostEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();

        // Payment Method Breakdown — fetch actual split amounts
        const { data: payments } = await supabase
          .from('payments')
          .select('payment_method, net_amount, cash_amount, promptpay_amount')
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        const breakdown = { cash: 0, promptpay: 0, mixed: 0, total: 0, cashAmount: 0, promptpayAmount: 0, mixedAmount: 0 };
        (payments || []).forEach((p: any) => {
          breakdown.total++;
          const netAmt = parseFloat(p.net_amount) || 0;
          // Sum actual split amounts across ALL payment types (including mixed)
          breakdown.cashAmount += parseFloat(p.cash_amount) || 0;
          breakdown.promptpayAmount += parseFloat(p.promptpay_amount) || 0;
          if (p.payment_method === 'cash') breakdown.cash++;
          else if (p.payment_method === 'promptpay') breakdown.promptpay++;
          else if (p.payment_method === 'mixed') { breakdown.mixed++; breakdown.mixedAmount += netAmt; }
        });
        setPaymentBreakdown(breakdown);

        // Ingredient Cost — filter by purchase_date (DATE type)
        const startDateStr = startDate.toISOString().slice(0, 10);
        const endDateStr = endDate.toISOString().slice(0, 10);

        const { data: ingredients } = await supabase
          .from('item_ingredients')
          .select('name, cost, purchase_date')
          .gte('purchase_date', startDateStr)
          .lte('purchase_date', endDateStr)
          .order('cost', { ascending: false });

        const totalCost = (ingredients || []).reduce((s, i) => s + parseFloat(i.cost as any), 0);
        setTotalIngredientCost(totalCost);

        // Top 3 most expensive ingredient purchases
        setTopIngredients((ingredients || []).slice(0, 3));
      } catch (err) {
        console.error('BusinessSpotlight fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [startDate, endDate, refreshKey]);

  const getPercent = (count: number) => {
    if (paymentBreakdown.total === 0) return 0;
    return Math.round((count / paymentBreakdown.total) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Ingredient Cost Card */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-emerald-500" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            ยอดต้นทุนวัตถุดิบ
          </span>
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-6 w-3/4 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            <div className="h-4 w-1/2 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Total cost */}
            <div>
              <p className="text-xl font-black text-slate-900 dark:text-neutral-100">
                {totalIngredientCost.toLocaleString()}
                <span className="text-xs font-bold text-slate-400 dark:text-neutral-500 ml-1">฿</span>
              </p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 mt-0.5">ต้นทุนจัดซื้อในช่วงนี้</p>
            </div>
            {/* Top ingredients */}
            {topIngredients.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-neutral-800">
                {topIngredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300 truncate max-w-[120px]">
                      {ing.name}
                    </span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {parseFloat(ing.cost as any).toLocaleString()}฿
                    </span>
                  </div>
                ))}
              </div>
            )}
            {topIngredients.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-neutral-500">ยังไม่มีข้อมูลการจัดซื้อ</p>
            )}
          </div>
        )}
      </Card>

      {/* Payment Method Breakdown */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-500" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            สัดส่วนวิธีชำระเงิน
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 bg-slate-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
              <div className="h-16 bg-slate-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
            </div>
            <div className="h-3 bg-slate-100 dark:bg-neutral-800 rounded-full animate-pulse" />
          </div>
        ) : paymentBreakdown.total === 0 ? (
          <p className="text-xs text-slate-400 dark:text-neutral-500 py-2 text-center">ยังไม่มีข้อมูลการชำระเงิน</p>
        ) : (
          <div className="space-y-3">
            {/* 2 Summary Boxes: เงินสด vs QR */}
            <div className="grid grid-cols-2 gap-2">
              {/* เงินสด */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    เงินสด
                  </span>
                </div>
                <p className="text-base font-black text-emerald-700 dark:text-emerald-300 leading-tight">
                  {(paymentBreakdown.cashAmount + paymentBreakdown.mixedAmount * 0).toLocaleString()}
                  <span className="text-[10px] font-bold ml-0.5">฿</span>
                </p>
                <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-500">
                  {paymentBreakdown.cash} บิล · {getPercent(paymentBreakdown.cash)}%
                </p>
              </div>

              {/* QR PromptPay */}
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                    QR / โอน
                  </span>
                </div>
                <p className="text-base font-black text-blue-700 dark:text-blue-300 leading-tight">
                  {paymentBreakdown.promptpayAmount.toLocaleString()}
                  <span className="text-[10px] font-bold ml-0.5">฿</span>
                </p>
                <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-500">
                  {paymentBreakdown.promptpay} บิล · {getPercent(paymentBreakdown.promptpay)}%
                </p>
              </div>
            </div>

            {/* Stacked proportion bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-neutral-800">
                {/* Cash */}
                {getPercent(paymentBreakdown.cash) > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
                    style={{ width: `${getPercent(paymentBreakdown.cash)}%` }}
                  />
                )}
                {/* Mixed */}
                {getPercent(paymentBreakdown.mixed) > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
                    style={{ width: `${getPercent(paymentBreakdown.mixed)}%` }}
                  />
                )}
                {/* PromptPay */}
                {getPercent(paymentBreakdown.promptpay) > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700"
                    style={{ width: `${getPercent(paymentBreakdown.promptpay)}%` }}
                  />
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-neutral-400">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    เงินสด
                  </span>
                  {paymentBreakdown.mixed > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      ผสม ({paymentBreakdown.mixed})
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    QR/โอน
                  </span>
                </div>
                <span className="text-slate-400 dark:text-neutral-500">
                  รวม {paymentBreakdown.total} บิล
                </span>
              </div>
            </div>

            {/* Mixed note */}
            {paymentBreakdown.mixed > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  ชำระแบบผสม (เงินสด + QR)
                </span>
                <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                  {paymentBreakdown.mixedAmount.toLocaleString()} ฿
                </span>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
