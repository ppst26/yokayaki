# Customer QR Portal Light Theme & Bottom Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Customer QR Order Portal (`app/customer/[session_id]/page.tsx`) into a modern, mobile-first Light Theme interface featuring a 4-Tab Bottom Navigation Bar (Home, Order, Ordered, Promotions).

**Architecture:** Maintain a single-page Client Component layout in Next.js App Router with persistent `activeTab` state (`'home' | 'order' | 'ordered' | 'promotions'`). Preserves cart state, menu items, table ID, and real-time order subscriptions in memory across tab switches.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Supabase JS v2, TailwindCSS v4 (`bg-slate-50`, `bg-white`, `text-slate-900`, `bg-red-600`), Lucide React Icons.

## Global Constraints
- Target File: `app/customer/[session_id]/page.tsx`
- Tailwind Classes: Use light theme palette (`bg-slate-50`, `bg-white`, `border-slate-200`, `text-slate-900`, `text-slate-500`, `bg-red-600`)
- Icons: Lucide React (`Home`, `UtensilsCrossed`, `ClipboardList`, `Tag`, `ShoppingBag`, `Plus`, `Minus`, `Clock`, `Sparkles`, `CheckCircle2`)
- Package Manager: `pnpm` only (do not use npm or yarn)

---

### Task 1: Light Theme Page Shell & Bottom Navigation Bar

**Files:**
- Modify: `app/customer/[session_id]/page.tsx`

**Interfaces:**
- Produces: `activeTab` state (`'home' | 'order' | 'ordered' | 'promotions'`), fixed Bottom Navigation Bar component, Light Theme wrapper layout.

- [ ] **Step 1: Define `activeTab` state and nav item structure**

Add state for active tab and helper tabs list in `app/customer/[session_id]/page.tsx`:
```tsx
type CustomerTab = 'home' | 'order' | 'ordered' | 'promotions';

const [activeTab, setActiveTab] = useState<CustomerTab>('home');
```

- [ ] **Step 2: Update top wrapper to Light Theme**

Replace dark theme background classes (`bg-stone-950 text-stone-100`) with Light Theme classes (`bg-slate-50 text-slate-900 min-h-screen pb-24`):
```tsx
<div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
```

- [ ] **Step 3: Render sticky Bottom Navigation Bar**

Add fixed bottom nav bar at the end of the portal component:
```tsx
{/* Bottom Navigation Bar */}
<nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-3 py-2 shadow-lg">
  <div className="max-w-md mx-auto flex items-center justify-around">
    {[
      { id: 'home', label: 'หน้าหลัก', icon: Home },
      { id: 'order', label: 'สั่งอาหาร', icon: UtensilsCrossed, badge: cart.reduce((sum, i) => sum + i.quantity, 0) },
      { id: 'ordered', label: 'สั่งแล้ว', icon: ClipboardList, badge: orderedItems.length },
      { id: 'promotions', label: 'โปรโมชั่น', icon: Tag },
    ].map(tab => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as CustomerTab)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
            isActive ? 'text-red-600 font-bold' : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
            {tab.badge ? tab.badge > 0 ? (
              <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {tab.badge}
              </span>
            ) : null : null}
          </div>
          <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
        </button>
      );
    })}
  </div>
</nav>
```

- [ ] **Step 4: Commit Changes**

```bash
git add app/customer/\[session_id\]/page.tsx
git commit -m "feat(customer): add Light Theme shell and 4-tab bottom navigation bar"
```

---

### Task 2: Tab 1 (Home) & Tab 4 (Promotions) Views

**Files:**
- Modify: `app/customer/[session_id]/page.tsx`

**Interfaces:**
- Consumes: `promotions` table data, `activeTab` state, `tableId`, `orderedItems`, `cart`.
- Produces: `fetchPromotions` function, Tab 1 (Home View), Tab 4 (Promotions View).

- [ ] **Step 1: Fetch active promotions from Supabase**

Add `promotions` state and fetch function in `page.tsx`:
```tsx
interface Promotion {
  id: number;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_percent: number | null;
  discount_amount: number | null;
  min_order_amount: number;
  is_active: boolean;
  image_url: string | null;
  start_time: string | null;
  end_time: string | null;
}

const [promotions, setPromotions] = useState<Promotion[]>([]);

const fetchPromotions = async () => {
  try {
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (data) setPromotions(data as Promotion[]);
  } catch (err) {
    console.error('Error fetching promotions:', err);
  }
};
```

- [ ] **Step 2: Render Tab 1 (Home View)**

When `activeTab === 'home'`, render:
- Table greeting card (`โต๊ะ {tableId}`).
- Active promotion banner carousel.
- Active orders status summary card (e.g. `"มี {pendingCount} รายการกำลังปรุงในครัว"`).
- Primary CTA button: `"เลือกสั่งอาหารทันที 🍲"` (`onClick={() => setActiveTab('order')}`).

- [ ] **Step 3: Render Tab 4 (Promotions View)**

When `activeTab === 'promotions'`, render:
- Header `"โปรโมชั่นพิเศษสำหรับคุณ"`.
- Grid/List of active promotions featuring cover image (`image_url` or default food picture), promotion title, type tag badge, dynamically generated short description string, and Happy Hour time window.

- [ ] **Step 4: Commit Changes**

```bash
git add app/customer/\[session_id\]/page.tsx
git commit -m "feat(customer): implement Home tab and Promotions tab"
```

---

### Task 3: Tab 2 (Order Food) & Floating Cart Drawer Light Theme Polish

**Files:**
- Modify: `app/customer/[session_id]/page.tsx`

**Interfaces:**
- Consumes: `menuItems`, `selectedCategory`, `cart`, `addToCart`, `removeFromCart`.
- Produces: Light Theme Order view, sticky floating cart bar, Light Theme Cart Drawer.

- [ ] **Step 1: Polish Category filter chips & Menu Item cards**

Update menu grid styling to Light Theme:
- Active category chip: `bg-red-600 text-white shadow-xs shadow-red-600/20`
- Inactive category chip: `bg-white text-slate-600 border-slate-200 hover:bg-slate-50`
- Menu item card: `bg-white border border-slate-200 shadow-xs rounded-2xl`
- Quantity modifier buttons (`-` / `+`): Light theme styling (`bg-slate-100 hover:bg-slate-200 text-slate-800` & `bg-red-600 text-white`).

- [ ] **Step 2: Position Floating Cart Summary Bar**

Ensure Floating Cart Bar rests cleanly above the Bottom Navigation Bar:
```tsx
{/* Floating Cart Bar */}
{cart.length > 0 && (
  <div className="fixed bottom-16 inset-x-0 z-30 px-4 max-w-md mx-auto animate-bounce-short">
    <button
      onClick={() => setShowCartDrawer(true)}
      className="w-full bg-red-600 text-white py-3.5 px-5 rounded-2xl shadow-lg flex items-center justify-between font-bold text-sm hover:bg-red-700 transition active:scale-98 cursor-pointer"
    >
      <div className="flex items-center gap-2.5">
        <div className="bg-white/20 p-1.5 rounded-xl">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <span>ดูรายการในตะกร้า ({cart.reduce((sum, i) => sum + i.quantity, 0)} ชิ้น)</span>
      </div>
      <span className="text-base font-extrabold">฿{cart.reduce((sum, i) => sum + i.price * i.quantity, 0).toLocaleString()}</span>
    </button>
  </div>
)}
```

- [ ] **Step 3: Update Cart Drawer & Note Editor modal to Light Theme**

Update overlay background (`bg-slate-900/40 backdrop-blur-xs`) and modal cards (`bg-white border border-slate-200 text-slate-900`).

- [ ] **Step 4: Commit Changes**

```bash
git add app/customer/\[session_id\]/page.tsx
git commit -m "feat(customer): polish Order tab and Cart Drawer with Light Theme"
```

---

### Task 4: Tab 3 (Ordered History) Light Theme Polish

**Files:**
- Modify: `app/customer/[session_id]/page.tsx`

**Interfaces:**
- Consumes: `orderedItems`, `tableId`.
- Produces: Light Theme Ordered History tab with status badges and bill summary.

- [ ] **Step 1: Polish Ordered History View**

When `activeTab === 'ordered'`, render:
- Top summary header showing `โต๊ะ {tableId}` and total items ordered.
- Itemized order list cards:
  - 🟡 **กำลังปรุง** (`pending`): `bg-amber-50 border-amber-200 text-amber-800`
  - 🟢 **เสิร์ฟแล้ว** (`served`): `bg-emerald-50 border-emerald-200 text-emerald-800`
  - 🔴 **ยกเลิกแล้ว** (`voided`): `bg-rose-50 border-rose-200 text-rose-800`
- Display item notes if present.
- Total accumulative bill footer: `bg-white border border-slate-200 p-4 rounded-2xl shadow-xs`.

- [ ] **Step 2: Commit Changes**

```bash
git add app/customer/\[session_id\]/page.tsx
git commit -m "feat(customer): polish Ordered History tab with status badges and bill breakdown"
```

---

### Task 5: End-to-End Verification & LAN Testing

**Files:**
- Test: `app/customer/[session_id]/page.tsx`

- [ ] **Step 1: Run Next.js build check**

Run: `pnpm build`
Expected: Successful compilation with zero TypeScript or syntax errors.

- [ ] **Step 2: Verify Customer QR Order flow in dev server**

Check dev server output at `http://localhost:3000` or local LAN IP.
Verify:
1. Session verification & Light Theme rendering.
2. Tab switching between Home, Order, Ordered, and Promotions.
3. Adding items to cart, editing notes, submitting order.
4. Real-time updates in Tab 3 (Ordered History).
5. Viewing active promotions in Tab 4.

- [ ] **Step 3: Final Commit**

```bash
git add .
git commit -m "chore(customer): complete verification for customer QR portal light theme redesign"
```
