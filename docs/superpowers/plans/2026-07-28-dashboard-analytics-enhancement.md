# Dashboard Analytics Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ยกระดับ Owner Dashboard (`components/OwnerDashboard.tsx`) ให้เพิ่มการ์ดวิเคราะห์หมวดหมู่ขายดี (Category Breakdown), สถิติสมาชิก vs ลูกค้าทั่วไป (Member Insights), และสรุปช่องทางชำระเงิน & ส่วนลด (Payment & Discounts)

**Architecture:** ขยาย state และ query ใน `OwnerDashboard.tsx` โดยดึงฟิลด์เพิ่มเติมจาก `payments` (`subtotal`, `discount_amount`, `points_redeemed`, `phone_number`) และ `order_items` (`menu_items(name, category)`), แล้วแสดงผลด้วย UI Cards และ Badge Tabs ใหม่ในโครงสร้าง 2-Row Grid Layout

**Tech Stack:** React 19, TypeScript, Supabase, TailwindCSS 4, Lucide Icons, Recharts

## Global Constraints

- Package manager: `pnpm` เท่านั้น
- Import paths ใช้ `@/` alias เสมอ
- Component เป็น `'use client'`
- Comment ภาษาไทย, ตัวแปร/ฟังก์ชัน/interface ภาษาอังกฤษ
- Spec Reference: [`docs/superpowers/specs/2026-07-28-dashboard-analytics-enhancement-design.md`](file:///c:/Users/PP/Desktop/React/yokayaki/docs/superpowers/specs/2026-07-28-dashboard-analytics-enhancement-design.md)

---

### Task 1: Data State & Fetching Enhancements ใน `OwnerDashboard.tsx`

**Files:**
- Modify: `components/OwnerDashboard.tsx:20-390`

**Interfaces:**
- Consumes:
  - Table `payments`: `payment_method, subtotal, discount_amount, net_amount, points_earned, points_redeemed, phone_number, created_at`
  - Table `order_items`: `quantity, unit_price, discount_applied, status, created_at, menu_items(name, category)`
- Produces:
  - `categoryBreakdown`: `{ category: string; quantity: number; revenue: number; percentage: number }[]`
  - `memberStats`: `{ memberRevenue: number; nonMemberRevenue: number; memberOrderCount: number; nonMemberOrderCount: number; avgMemberSpend: number; avgNonMemberSpend: number; pointsRedeemed: number }`
  - `paymentBreakdown`: `{ cashTotal: number; cashCount: number; promptpayTotal: number; promptpayCount: number; mixedTotal: number; mixedCount: number; totalSubtotal: number; totalDiscount: number; netTotal: number }`
  - State `topSellerTab`: `'sellers' | 'categories'`

- [ ] **Step 1: เพิ่ม Interfaces ใหม่และอัปเดต State**

ใน `components/OwnerDashboard.tsx`:

1. เพิ่ม Interfaces:
```typescript
interface CategorySalesCount {
  category: string;
  quantity: number;
  revenue: number;
  percentage: number;
}

interface MemberStats {
  memberRevenue: number;
  nonMemberRevenue: number;
  memberOrderCount: number;
  nonMemberOrderCount: number;
  avgMemberSpend: number;
  avgNonMemberSpend: number;
  pointsRedeemed: number;
}

interface DetailedPaymentSummary {
  cashTotal: number;
  cashCount: number;
  promptpayTotal: number;
  promptpayCount: number;
  mixedTotal: number;
  mixedCount: number;
  totalSubtotal: number;
  totalDiscount: number;
  netTotal: number;
  orderCount: number;
}
```

2. เพิ่ม State ตัวใหม่ใน `OwnerDashboard`:
```typescript
const [topSellerTab, setTopSellerTab] = useState<'sellers' | 'categories'>('sellers');
const [categorySellers, setCategorySellers] = useState<CategorySalesCount[]>([]);
const [memberStats, setMemberStats] = useState<MemberStats>({
  memberRevenue: 0,
  nonMemberRevenue: 0,
  memberOrderCount: 0,
  nonMemberOrderCount: 0,
  avgMemberSpend: 0,
  avgNonMemberSpend: 0,
  pointsRedeemed: 0,
});
const [detailedPayments, setDetailedPayments] = useState<DetailedPaymentSummary>({
  cashTotal: 0,
  cashCount: 0,
  promptpayTotal: 0,
  promptpayCount: 0,
  mixedTotal: 0,
  mixedCount: 0,
  totalSubtotal: 0,
  totalDiscount: 0,
  netTotal: 0,
  orderCount: 0,
});
```

- [ ] **Step 2: อัปเดต `fetchDashboardData` เพื่อดึงและประมวลผลข้อมูลใหม่**

อัปเดต Query 1 (`payments`):
```typescript
const { data: payData, error: payError } = await supabase
  .from('payments')
  .select('payment_method, subtotal, discount_amount, net_amount, points_redeemed, phone_number')
  .gte('created_at', startISO)
  .lte('created_at', endISO);

if (payError) throw payError;

let cashTotal = 0, cashCount = 0;
let promptpayTotal = 0, promptpayCount = 0;
let mixedTotal = 0, mixedCount = 0;
let netTotal = 0, totalSubtotal = 0, totalDiscount = 0;

let memberRevenue = 0, memberOrderCount = 0;
let nonMemberRevenue = 0, nonMemberOrderCount = 0;
let totalPointsRedeemed = 0;

payData?.forEach((p: any) => {
  const net = parseFloat(p.net_amount as string) || 0;
  const sub = parseFloat(p.subtotal as string) || 0;
  const disc = parseFloat(p.discount_amount as string) || 0;
  const pts = parseInt(p.points_redeemed as string) || 0;

  netTotal += net;
  totalSubtotal += sub;
  totalDiscount += disc;
  totalPointsRedeemed += pts;

  if (p.payment_method === 'cash') {
    cashTotal += net;
    cashCount++;
  } else if (p.payment_method === 'promptpay') {
    promptpayTotal += net;
    promptpayCount++;
  } else if (p.payment_method === 'mixed') {
    mixedTotal += net;
    mixedCount++;
    cashTotal += net * 0.5;
    promptpayTotal += net * 0.5;
  }

  // Member vs Non-Member
  if (p.phone_number && p.phone_number.trim() !== '') {
    memberRevenue += net;
    memberOrderCount++;
  } else {
    nonMemberRevenue += net;
    nonMemberOrderCount++;
  }
});

setPayments({
  cashTotal,
  promptpayTotal,
  netTotal,
  orderCount: payData?.length || 0
});

setDetailedPayments({
  cashTotal, cashCount,
  promptpayTotal, promptpayCount,
  mixedTotal, mixedCount,
  totalSubtotal, totalDiscount,
  netTotal,
  orderCount: payData?.length || 0
});

setMemberStats({
  memberRevenue,
  nonMemberRevenue,
  memberOrderCount,
  nonMemberOrderCount,
  avgMemberSpend: memberOrderCount > 0 ? Math.round(memberRevenue / memberOrderCount) : 0,
  avgNonMemberSpend: nonMemberOrderCount > 0 ? Math.round(nonMemberRevenue / nonMemberOrderCount) : 0,
  pointsRedeemed: totalPointsRedeemed,
});
```

อัปเดต Query 3 (`order_items`):
```typescript
const { data: salesData, error: salesError } = await supabase
  .from('order_items')
  .select(`
    quantity,
    unit_price,
    discount_applied,
    status,
    created_at,
    menu_items (
      name,
      category
    )
  `)
  .eq('status', 'served')
  .gte('created_at', startISO)
  .lte('created_at', endISO);

if (salesError) throw salesError;

const itemMap: { [key: string]: { quantity: number; revenue: number } } = {};
const categoryMap: { [key: string]: { quantity: number; revenue: number } } = {};
const rawSalesForChart: { created_at: string; revenue: number }[] = [];
let totalSalesNet = 0;

salesData?.forEach((item: any) => {
  const mi = item.menu_items;
  const name = Array.isArray(mi) ? mi[0]?.name : mi?.name || 'ไม่ทราบชื่อ';
  const category = Array.isArray(mi) ? mi[0]?.category : mi?.category || 'อื่นๆ';
  const qty = item.quantity;
  const rev = (item.unit_price * qty) - item.discount_applied;

  totalSalesNet += rev;

  // Item aggregation
  if (itemMap[name]) {
    itemMap[name].quantity += qty;
    itemMap[name].revenue += rev;
  } else {
    itemMap[name] = { quantity: qty, revenue: rev };
  }

  // Category aggregation
  if (categoryMap[category]) {
    categoryMap[category].quantity += qty;
    categoryMap[category].revenue += rev;
  } else {
    categoryMap[category] = { quantity: qty, revenue: rev };
  }

  rawSalesForChart.push({ created_at: item.created_at, revenue: rev });
});

const topList = Object.keys(itemMap).map(name => ({
  name,
  quantity: itemMap[name].quantity,
  revenue: itemMap[name].revenue
})).sort((a, b) => b.quantity - a.quantity);

setTopSellers(topList);

const categoryList = Object.keys(categoryMap).map(cat => ({
  category: cat,
  quantity: categoryMap[cat].quantity,
  revenue: categoryMap[cat].revenue,
  percentage: totalSalesNet > 0 ? Math.round((categoryMap[cat].revenue / totalSalesNet) * 100) : 0
})).sort((a, b) => b.revenue - a.revenue);

setCategorySellers(categoryList);
```

- [ ] **Step 3: Commit**

```bash
git add components/OwnerDashboard.tsx
git commit -m "feat(dashboard): enhance data state and queries for category, member, and payment analytics"
```

---

### Task 2: UI Layout & Card Rendering ใน `OwnerDashboard.tsx`

**Files:**
- Modify: `components/OwnerDashboard.tsx:600-769`

**Interfaces:**
- Consumes: Data states จาก Task 1 (`topSellers`, `categorySellers`, `memberStats`, `detailedPayments`, `topSellerTab`)
- Produces: 2-Row Grid Layout แสดงผล Card 1 (Top Sellers / Categories tab), Card 2 (Member Insights), Card 3 (Payment Methods & Discounts), Card 4 (Void Summary Compact)

- [ ] **Step 1: เพิ่ม Lucide Icons ที่จำเป็น**

ใน `OwnerDashboard.tsx` (บรรทัด 5-8):
```typescript
import {
  TrendingUp, Trash2, Award,
  DollarSign, Clock, ClipboardList, Package, X, CalendarDays, BarChart3,
  Users, CreditCard, Tag, PieChart, Wallet, ArrowUpRight
} from 'lucide-react';
```

- [ ] **Step 2: ปรับแต่งการ์ดในส่วนล่างของ Dashboard**

เปลี่ยน JSX บริเวณ lines 600-690:

```tsx
{/* ========== Row 1: เมนูขายดี&หมวดหมู่ (Card 1) + สมาชิก vs ทั่วไป (Card 2) ========== */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Card 1: การจัดอันดับสินค้าขายดี & สัดส่วนหมวดหมู่ */}
  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
    <div>
      {/* Card 1 Header + Badge Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          {topSellerTab === 'sellers' ? (
            <Award className="w-4 h-4 text-amber-500" />
          ) : (
            <PieChart className="w-4 h-4 text-purple-600" />
          )}
          <h3 className="text-xs font-extrabold text-slate-800">
            {topSellerTab === 'sellers' ? 'จัดอันดับเมนูขายดี' : 'สัดส่วนยอดขายตามหมวดหมู่'}
          </h3>
        </div>

        {/* Badge Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <button
            onClick={() => setTopSellerTab('sellers')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              topSellerTab === 'sellers'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🏆 รายการขายดี
          </button>
          <button
            onClick={() => setTopSellerTab('categories')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              topSellerTab === 'categories'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📊 หมวดหมู่
          </button>
        </div>
      </div>

      {/* Tab 1: Top Sellers */}
      {topSellerTab === 'sellers' ? (
        <div className="space-y-4">
          {topSellers.slice(0, 5).map((item, idx) => (
            <div key={item.name} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  idx === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                  idx === 1 ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                  'bg-slate-50 text-slate-500 border border-slate-200'
                }`}>
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-slate-800">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-slate-900">{item.quantity} จาน</div>
                <div className="text-[10px] text-slate-400 font-semibold">{item.revenue.toLocaleString()} ฿</div>
              </div>
            </div>
          ))}
          {topSellers.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              ยังไม่มีรายการจำหน่ายในช่วงเวลานี้
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Category Breakdown */
        <div className="space-y-4">
          {categorySellers.map((cat) => (
            <div key={cat.category} className="space-y-1.5 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">{cat.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-semibold text-[11px]">{cat.quantity} จาน</span>
                  <span className="font-black text-slate-900">{cat.revenue.toLocaleString()} ฿ ({cat.percentage}%)</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                />
              </div>
            </div>
          ))}
          {categorySellers.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              ยังไม่มีข้อมูลหมวดหมู่ในช่วงเวลานี้
            </div>
          )}
        </div>
      )}
    </div>
  </div>

  {/* Card 2: สถิติลูกค้าสมาชิก vs ทั่วไป */}
  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-4 h-4 text-sky-600" />
        <h3 className="text-xs font-extrabold text-slate-800">สถิติลูกค้าสมาชิก vs ทั่วไป (Member Insights)</h3>
      </div>

      {/* Visual Revenue Bar Comparison */}
      <div className="space-y-2 mb-6 bg-slate-50 border border-slate-100 p-4 rounded-xl">
        <div className="flex justify-between text-xs font-bold mb-1">
          <span className="text-amber-600 flex items-center gap-1">
            👑 สมาชิก: {memberStats.memberRevenue.toLocaleString()} ฿ (
            {payments.netTotal > 0 ? Math.round((memberStats.memberRevenue / payments.netTotal) * 100) : 0}%)
          </span>
          <span className="text-sky-600 flex items-center gap-1">
            👤 ทั่วไป: {memberStats.nonMemberRevenue.toLocaleString()} ฿ (
            {payments.netTotal > 0 ? Math.round((memberStats.nonMemberRevenue / payments.netTotal) * 100) : 0}%)
          </span>
        </div>
        {/* Split Bar */}
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
          <div
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${payments.netTotal > 0 ? Math.round((memberStats.memberRevenue / payments.netTotal) * 100) : 50}%` }}
          />
          <div
            className="bg-sky-500 h-full transition-all duration-300"
            style={{ width: `${payments.netTotal > 0 ? Math.round((memberStats.nonMemberRevenue / payments.netTotal) * 100) : 50}%` }}
          />
        </div>
      </div>

      {/* Stats Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">ยอดซื้อเฉลี่ย / บิลสมาชิก</p>
          <p className="text-lg font-black text-amber-800">{memberStats.avgMemberSpend.toLocaleString()} ฿</p>
          <p className="text-[10px] text-amber-600 font-semibold">{memberStats.memberOrderCount} บิล</p>
        </div>

        <div className="p-3.5 bg-sky-50/60 border border-sky-200/80 rounded-xl space-y-1">
          <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">ยอดซื้อเฉลี่ย / บิลทั่วไป</p>
          <p className="text-lg font-black text-sky-800">{memberStats.avgNonMemberSpend.toLocaleString()} ฿</p>
          <p className="text-[10px] text-sky-600 font-semibold">{memberStats.nonMemberOrderCount} บิล</p>
        </div>
      </div>

      {/* Points Redeemed Metric */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-500">แต้มสมาชิกที่ถูกแลกในบิล:</span>
        <span className="font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
          {memberStats.pointsRedeemed.toLocaleString()} แต้ม ({memberStats.pointsRedeemed.toLocaleString()} ฿)
        </span>
      </div>
    </div>
  </div>
</div>

{/* ========== Row 2: ช่องทางชำระเงิน & ส่วนลด (Card 3) + สรุป Void Logs (Card 4) ========== */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Card 3: สรุปช่องทางชำระเงิน & ส่วนลด */}
  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="w-4 h-4 text-emerald-600" />
        <h3 className="text-xs font-extrabold text-slate-800">สรุปช่องทางชำระเงิน & ส่วนลด (Payment & Discounts)</h3>
      </div>

      {/* Payment methods breakdown */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">💵 เงินสด</span>
          <p className="text-sm font-black text-slate-900">{detailedPayments.cashTotal.toLocaleString()} ฿</p>
          <span className="text-[10px] text-slate-400 font-semibold">{detailedPayments.cashCount} บิล</span>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">📱 PromptPay</span>
          <p className="text-sm font-black text-slate-900">{detailedPayments.promptpayTotal.toLocaleString()} ฿</p>
          <span className="text-[10px] text-slate-400 font-semibold">{detailedPayments.promptpayCount} บิล</span>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">🔀 ชำระผสม</span>
          <p className="text-sm font-black text-slate-900">{detailedPayments.mixedTotal.toLocaleString()} ฿</p>
          <span className="text-[10px] text-slate-400 font-semibold">{detailedPayments.mixedCount} บิล</span>
        </div>
      </div>

      {/* Discounts Summary */}
      <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold text-rose-800">ส่วนลดการตลาดรวมที่ให้ลูกค้า</p>
          <p className="text-[10px] font-medium text-rose-600">จากโปรโมชั่นและส่วนลดแต้มสมาชิก</p>
        </div>
        <div className="text-right">
          <p className="text-base font-black text-rose-700">-{detailedPayments.totalDiscount.toLocaleString()} ฿</p>
          <p className="text-[10px] font-semibold text-slate-500">จากยอดก่อนลด {detailedPayments.totalSubtotal.toLocaleString()} ฿</p>
        </div>
      </div>
    </div>
  </div>

  {/* Card 4: Void Logs Summary Card (Compact) */}
  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-600" />
          <h3 className="text-xs font-extrabold text-slate-800">สรุปการยกเลิกรายการอาหาร (Void Summary)</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl">
            สูญเสีย {totalWaste.toLocaleString()} ฿
          </span>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
            {voidCount} ครั้ง
          </span>
        </div>
      </div>

      {voidCount > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topVoidItems.map(([menuName, qty], idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={menuName} className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  <span className="text-base">{medals[idx]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">{menuName}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">{qty} ครั้ง</div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowVoidModal(true)}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 hover:text-slate-900 transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <ClipboardList className="w-3.5 h-3.5 text-red-600" />
            ดูรายละเอียดทั้งหมด ({voidCount} รายการ)
          </button>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-400 text-xs font-medium">
          ไม่มีการยกเลิกรายการอาหารในช่วงเวลานี้
        </div>
      )}
    </div>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add components/OwnerDashboard.tsx
git commit -m "feat(dashboard): render 4 analytics cards with category tabs, member insights, and payment discounts breakdown"
```

---

## Verification Plan

- [ ] Run `pnpm build` — no TypeScript or Next.js build errors
- [ ] Test in dev server `pnpm dev`:
  - Open Owner Dashboard
  - Verify Card 1 tabs: switch between `[ 🏆 รายการขายดี ]` and `[ 📊 หมวดหมู่ ]` and verify % progress bars
  - Verify Card 2 (Member Insights): check member vs non-member split bar & average spending per bill
  - Verify Card 3 (Payment Methods & Discounts): check cash / promptpay / mixed totals & discount amount
  - Verify Card 4 (Void Summary): check void count, waste total, and modal view
- [ ] Final git commit complete
