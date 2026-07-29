# Marketing & Loyalty Insights Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Card 2 in `OwnerDashboard.tsx` with a Hybrid Marketing & Loyalty Analytics Card featuring tabbed switching between Top Promotions usage and Member Loyalty & Points analytics (including THB discount value from point redemptions).

**Architecture:** Fetch promotion usage data from `payment_promotions` table joined by date range in `fetchDashboardData()`. Aggregate statistics for top promotions. Render a tabbed UI card in `OwnerDashboard.tsx` with seamless tab switching between "โปรโมชั่นยอดฮิต" (Top Promotions) and "พฤติกรรมสมาชิก & แต้ม" (Loyalty & Points).

**Tech Stack:** Next.js 16 (React 19), Supabase JS Client, TailwindCSS v4, Lucide React icons.

## Global Constraints

- Tech Stack: Next.js 16.2.10, React 19.2.4, TypeScript strict mode, Supabase JS v2, TailwindCSS v4.
- Naming & Design: Match existing card styles, rounded-2xl, border-slate-200/80, shadow-sm, badge tabs styling in `OwnerDashboard.tsx`.
- Language: Thai for UI labels and docstrings as per project rules.

---

### Task 1: Add Data Types, States, and Data Fetching for Payment Promotions

**Files:**
- Modify: `components/OwnerDashboard.tsx:40-70` (Interface additions)
- Modify: `components/OwnerDashboard.tsx:280-320` (State declarations)
- Modify: `components/OwnerDashboard.tsx:323-515` (`fetchDashboardData` function)

**Interfaces:**
- Consumes: Supabase `payment_promotions` table (`promotion_name`, `promotion_type`, `discount_value`, `created_at`)
- Produces: `PromotionStat` interface, `promotionStats`, `totalPromoDiscount`, `promoOrderCount` states.

- [ ] **Step 1: Define `PromotionStat` interface in `OwnerDashboard.tsx`**

```typescript
interface PromotionStat {
  promotion_name: string;
  promotion_type: string;
  usage_count: number;
  total_discount_value: number;
}
```

- [ ] **Step 2: Add component states for Marketing Tab & Promotions**

```typescript
const [marketingTab, setMarketingTab] = useState<'promotions' | 'loyalty'>('promotions');
const [promotionStats, setPromotionStats] = useState<PromotionStat[]>([]);
const [totalPromoDiscount, setTotalPromoDiscount] = useState<number>(0);
const [promoOrderCount, setPromoOrderCount] = useState<number>(0);
```

- [ ] **Step 3: Update `fetchDashboardData` to fetch and aggregate `payment_promotions`**

Inside `fetchDashboardData()`:
```typescript
// 1.5. ดึงประวัติการใช้โปรโมชั่นตามช่วงเวลา
const { data: promoData, error: promoError } = await supabase
  .from('payment_promotions')
  .select('promotion_name, promotion_type, discount_value')
  .gte('created_at', startISO)
  .lte('created_at', endISO);

if (promoError) {
  console.error('Error fetching payment promotions:', promoError);
} else {
  const promoMap: Record<string, { promotion_type: string; usage_count: number; total_discount_value: number }> = {};
  let totalDisc = 0;

  promoData?.forEach((p: any) => {
    const name = p.promotion_name || 'ไม่ระบุชื่อโปรโมชั่น';
    const disc = parseFloat(p.discount_value as string) || 0;
    const type = p.promotion_type || 'percentage';

    totalDisc += disc;

    if (promoMap[name]) {
      promoMap[name].usage_count += 1;
      promoMap[name].total_discount_value += disc;
    } else {
      promoMap[name] = {
        promotion_type: type,
        usage_count: 1,
        total_discount_value: disc,
      };
    }
  });

  const sortedPromos: PromotionStat[] = Object.entries(promoMap)
    .map(([name, data]) => ({
      promotion_name: name,
      promotion_type: data.promotion_type,
      usage_count: data.usage_count,
      total_discount_value: data.total_discount_value,
    }))
    .sort((a, b) => b.usage_count - a.usage_count || b.total_discount_value - a.total_discount_value);

  setPromotionStats(sortedPromos);
  setTotalPromoDiscount(totalDisc);
  setPromoOrderCount(promoData?.length || 0);
}
```

- [ ] **Step 4: Build project to verify no TypeScript compilation errors**

Run: `pnpm build`
Expected: Build passes with no TypeScript or lint errors.

- [ ] **Step 5: Commit changes**

```bash
git add components/OwnerDashboard.tsx
git commit -m "feat(dashboard): add promotion data fetching and aggregation state"
```

---

### Task 2: Implement Hybrid Marketing & Loyalty Insights Card UI

**Files:**
- Modify: `components/OwnerDashboard.tsx:825-882` (Card 2 UI replacement)

**Interfaces:**
- Consumes: `marketingTab`, `promotionStats`, `totalPromoDiscount`, `promoOrderCount`, `memberStats`, `payments`
- Produces: Updated JSX card in `OwnerDashboard.tsx`

- [ ] **Step 1: Replace Card 2 JSX with the new Hybrid Card containing Badge Tabs**

Replace Card 2 container with:
```tsx
{/* Card 2: วิเคราะห์การตลาด & โปรโมชั่น (Hybrid Marketing & Loyalty Card) */}
<div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
  <div>
    {/* Card Header & Badge Tabs */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-2">
        {marketingTab === 'promotions' ? (
          <Tag className="w-4 h-4 text-purple-600" />
        ) : (
          <Users className="w-4 h-4 text-sky-600" />
        )}
        <h3 className="text-xs font-extrabold text-slate-800">
          วิเคราะห์การตลาด & โปรโมชั่น (Marketing & Loyalty Insights)
        </h3>
      </div>

      {/* Badge Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
        <button
          onClick={() => setMarketingTab('promotions')}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            marketingTab === 'promotions'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🏷️ โปรโมชั่นยอดฮิต
        </button>
        <button
          onClick={() => setMarketingTab('loyalty')}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            marketingTab === 'loyalty'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          👑 พฤติกรรมสมาชิก & แต้ม
        </button>
      </div>
    </div>

    {/* Tab 1: Promotions Analytics */}
    {marketingTab === 'promotions' ? (
      <div className="space-y-4">
        {promotionStats.slice(0, 5).map((promo, idx) => (
          <div key={promo.promotion_name} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                idx === 0 ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                idx === 1 ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                'bg-slate-50 text-slate-500 border border-slate-200'
              }`}>
                {idx + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 truncate">{promo.promotion_name}</span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border shrink-0 ${
                    promo.promotion_type === 'percentage' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    promo.promotion_type === 'fixed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {promo.promotion_type === 'percentage' ? '% ส่วนลด' : promo.promotion_type === 'fixed' ? 'ลดคงที่' : 'แถมสินค้า'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-black text-slate-900">{promo.usage_count} บิล</div>
              <div className="text-[10px] text-purple-600 font-bold">-{promo.total_discount_value.toLocaleString()} ฿</div>
            </div>
          </div>
        ))}

        {promotionStats.length > 0 ? (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-purple-50/50 p-3 rounded-xl border border-purple-100">
            <span className="font-semibold text-purple-900">ส่วนลดโปรโมชั่นรวม ({promoOrderCount} บิล):</span>
            <span className="font-black text-purple-700">
              -{totalPromoDiscount.toLocaleString()} ฿
            </span>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400 text-xs font-medium">
            ยังไม่มีรายการใช้งานโปรโมชั่นในช่วงเวลานี้
          </div>
        )}
      </div>
    ) : (
      /* Tab 2: Loyalty & Points Analytics */
      <div className="space-y-5">
        {/* Visual Revenue Bar Comparison */}
        <div className="space-y-2 bg-slate-50 border border-slate-100 p-4 rounded-xl">
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

        {/* Points Discount Highlight */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-amber-900">มูลค่าส่วนลดจากการใช้แต้มสะสม</p>
            <p className="text-[10px] font-semibold text-amber-700 mt-0.5">
              ลูกค้าแลกแต้มรวม {memberStats.pointsRedeemed.toLocaleString()} แต้ม
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-amber-600">-{memberStats.pointsRedeemed.toLocaleString()} ฿</p>
            <p className="text-[10px] font-bold text-slate-500">
              {detailedPayments.totalDiscount > 0
                ? `คิดเป็น ${Math.round((memberStats.pointsRedeemed / detailedPayments.totalDiscount) * 100)}% ของส่วนลดรวม`
                : 'ส่วนลดแลกแต้ม'}
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 2: Build project to verify compilation**

Run: `pnpm build`
Expected: Build passes cleanly.

- [ ] **Step 3: Test local dev server rendering**

Verify Dashboard renders without errors on `http://localhost:3000`.

- [ ] **Step 4: Commit changes**

```bash
git add components/OwnerDashboard.tsx
git commit -m "feat(dashboard): implement hybrid marketing & loyalty insights card with tabs"
```

---

### Task 3: Verification & Walkthrough Documentation

**Files:**
- Create: `docs/superpowers/plans/2026-07-30-marketing-loyalty-card-walkthrough.md`

- [ ] **Step 1: Verify all manual test cases from spec**
  - Verify switching tabs between "โปรโมชั่นยอดฮิต" and "พฤติกรรมสมาชิก & แต้ม".
  - Verify THB discount calculation for points redeemed (`-X ฿`).
  - Verify date filter changes update promotion stats properly.

- [ ] **Step 2: Document completion in walkthrough artifact**

Write walkthrough file detailing changes, verification steps, and screenshot details.

- [ ] **Step 3: Commit walkthrough**

```bash
git add docs/superpowers/plans/2026-07-30-marketing-loyalty-card-walkthrough.md
git commit -m "docs: add walkthrough for marketing & loyalty insights card"
```
