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
          const net = parseFloat(p.net_amount) || 0;
          const cash = parseFloat(p.cash_amount) || 0;
          const prompt = parseFloat(p.promptpay_amount) || 0;

          let cashVal = 0;
          let promptVal = 0;

          if (p.payment_method === 'cash') {
            cashVal = cash > 0 ? cash : net;
            promptVal = 0;
            breakdown.cash++;
          } else if (p.payment_method === 'promptpay') {
            promptVal = prompt > 0 ? prompt : net;
            cashVal = 0;
            breakdown.promptpay++;
          } else {
            // Mixed or legacy payment method
            if (cash > 0 && prompt > 0) {
              cashVal = cash;
              promptVal = prompt;
            } else if (cash > 0) {
              cashVal = cash;
              promptVal = Math.max(0, net - cash);
            } else if (prompt > 0) {
              promptVal = prompt;
              cashVal = Math.max(0, net - prompt);
            } else {
              // Default fallback: split equally or allocate to cash
              cashVal = net;
              promptVal = 0;
            }
            breakdown.mixed++;
            breakdown.mixedAmount += net;
          }

          breakdown.cashAmount += cashVal;
          breakdown.promptpayAmount += promptVal;
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

  const totalMoney = paymentBreakdown.cashAmount + paymentBreakdown.promptpayAmount;
  const cashPercent = totalMoney > 0 ? Math.round((paymentBreakdown.cashAmount / totalMoney) * 100) : 0;
  const promptpayPercent = totalMoney > 0 ? 100 - cashPercent : 0;

  return (
    <div className="h-full flex flex-col justify-between gap-3 sm:gap-4">
      {/* Account Total / Payment Breakdown */}
      <Card className="p-5 space-y-3.5 flex-[1.4] flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-500" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            ยอดบัญชี
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-12 bg-slate-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
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
            {/* Combined Cash + QR Total Display */}
            <div className="bg-slate-50 dark:bg-neutral-800/60 border border-slate-200/70 dark:border-neutral-700/60 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-neutral-500 uppercase tracking-wider block">
                  ยอดรวม 2 ช่องทาง (เงินสด + QR)
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-neutral-100 leading-tight mt-0.5">
                  {totalMoney.toLocaleString()}
                  <span className="text-xs font-bold ml-1 text-slate-500 dark:text-neutral-400">฿</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 block">
                  จำนวนบิล
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {paymentBreakdown.total} บิล
                </span>
              </div>
            </div>

            {/* 2 Summary Boxes: เงินสด vs QR */}
            <div className="grid grid-cols-2 gap-2">
              {/* เงินสด */}
              <div className="border border-slate-200/80 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    เงินสด
                  </span>
                </div>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                  {paymentBreakdown.cashAmount.toLocaleString()}
                  <span className="text-[10px] font-bold ml-0.5">฿</span>
                </p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500">
                  สัดส่วน {cashPercent}% ของยอดขาย
                </p>
              </div>

              {/* QR PromptPay */}
              <div className="border border-slate-200/80 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                    QR / โอน
                  </span>
                </div>
                <p className="text-base font-black text-blue-600 dark:text-blue-400 leading-tight">
                  {paymentBreakdown.promptpayAmount.toLocaleString()}
                  <span className="text-[10px] font-bold ml-0.5">฿</span>
                </p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500">
                  สัดส่วน {promptpayPercent}% ของยอดขาย
                </p>
              </div>
            </div>

            {/* Stacked proportion bar based on monetary percentage */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-neutral-800">
                {/* Cash */}
                {cashPercent > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
                    style={{ width: `${cashPercent}%` }}
                  />
                )}
                {/* PromptPay */}
                {promptpayPercent > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700"
                    style={{ width: `${promptpayPercent}%` }}
                  />
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-neutral-400">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    เงินสด ({cashPercent}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    QR/โอน ({promptpayPercent}%)
                  </span>
                </div>
                <span className="text-slate-400 dark:text-neutral-500">
                  รวม {paymentBreakdown.total} บิล
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Ingredient Cost Card */}
      <Card className="p-4 sm:p-5 flex-[0.6] flex flex-col items-center justify-center text-center space-y-1">
        <div className="flex items-center gap-2 justify-center">
          <ShoppingCart className="w-4 h-4 text-rose-500" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            ยอดต้นทุนวัตถุดิบ
          </span>
        </div>
        {loading ? (
          <div className="space-y-1.5 flex flex-col items-center">
            <div className="h-6 w-24 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            <div className="h-3 w-36 bg-slate-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 leading-tight">
              {totalIngredientCost.toLocaleString()}
              <span className="text-sm font-bold ml-1">฿</span>
            </p>
            <p className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 mt-0.5">
              ต้นทุนจัดซื้อในช่วงนี้ (ค่าใช้จ่าย)
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
