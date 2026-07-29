# Real-Time Customer Check Bill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real-time "เรียกเช็คบิล" (Request Bill) button in the Customer QR Ordering Portal (`app/customer/[session_id]/page.tsx`), synchronizing table status to `'checking_out'` in Supabase so the Staff POS Floor Map (`TableMap.tsx`) turns the table card RED instantly in real-time.

**Architecture:** Add table status fetching and real-time Supabase channel listener to Customer Portal. When customer requests or cancels check bill, update `tables.status` in Supabase. `TableMap.tsx` receives the WebSocket update and updates table card UI to red (`checking_out`).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Supabase JS Realtime (Postgres Changes), TailwindCSS v4, Lucide React (`BellRing`, `Clock`, `CheckCircle2`, `XCircle`).

## Global Constraints
- Target Files: `app/customer/[session_id]/page.tsx`, `components/TableMap.tsx`
- Database: Supabase table `tables` column `status` (`'vacant' | 'occupied' | 'checking_out'`)
- Package Manager: `pnpm` only

---

### Task 1: Customer Portal Table Status Fetch & Real-Time Sync

**Files:**
- Modify: `app/customer/[session_id]/page.tsx`

**Interfaces:**
- Produces: `tableStatus` state (`'vacant' | 'occupied' | 'checking_out'`), real-time subscription for table status changes.

- [ ] **Step 1: Add `tableStatus` state and fetch logic**

Add `tableStatus` state in `app/customer/[session_id]/page.tsx`:
```tsx
const [tableStatus, setTableStatus] = useState<'vacant' | 'occupied' | 'checking_out'>('occupied');
```

In `verifySessionAndFetchData()`, fetch current table status:
```tsx
const { data: tableData } = await supabase
  .from('tables')
  .select('status')
  .eq('id', sessionData.table_id)
  .single();

if (tableData) setTableStatus(tableData.status as 'vacant' | 'occupied' | 'checking_out');
```

- [ ] **Step 2: Add Real-Time subscription for `tables` table**

In `useEffect`, subscribe to table status updates for `tableId`:
```tsx
useEffect(() => {
  if (!tableId) return;

  const channel = supabase
    .channel(`realtime:table_${tableId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'tables', filter: `id=eq.${tableId}` },
      (payload) => {
        if (payload.new && payload.new.status) {
          setTableStatus(payload.new.status as 'vacant' | 'occupied' | 'checking_out');
        }
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, [tableId]);
```

- [ ] **Step 3: Commit Changes**

```bash
git add app/customer/\[session_id\]/page.tsx
git commit -m "feat(customer): add real-time table status state & subscription"
```

---

### Task 2: "เรียกเช็คบิล" Button & Confirmation Modal UI

**Files:**
- Modify: `app/customer/[session_id]/page.tsx`

**Interfaces:**
- Produces: `requestCheckBill` function, `cancelCheckBill` function, Check Bill button/banner in Tab 3, confirmation modal.

- [ ] **Step 1: Implement `requestCheckBill` and `cancelCheckBill` handler functions**

```tsx
const [showCheckBillConfirm, setShowCheckBillConfirm] = useState(false);
const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

const handleRequestCheckBill = async () => {
  if (!tableId) return;
  try {
    setIsUpdatingStatus(true);
    const { error } = await supabase
      .from('tables')
      .update({ status: 'checking_out', updated_at: new Date().toISOString() })
      .eq('id', tableId);

    if (error) throw error;
    setTableStatus('checking_out');
    setShowCheckBillConfirm(false);
  } catch (err) {
    console.error('Error requesting check bill:', err);
    alert('เกิดข้อผิดพลาดในการเรียกเช็คบิล');
  } font-bold finally {
    setIsUpdatingStatus(false);
  }
};

const handleCancelCheckBill = async () => {
  if (!tableId) return;
  try {
    setIsUpdatingStatus(true);
    const { error } = await supabase
      .from('tables')
      .update({ status: 'occupied', updated_at: new Date().toISOString() })
      .eq('id', tableId);

    if (error) throw error;
    setTableStatus('occupied');
  } catch (err) {
    console.error('Error cancelling check bill:', err);
  } finally {
    setIsUpdatingStatus(false);
  }
};
```

- [ ] **Step 2: Render Check Bill button or banner in Tab 3 (Ordered History)**

Under the Total Bill summary card in Tab 3:
```tsx
{/* Check Bill Action Button / Status Banner */}
<div className="mt-4 pt-2">
  {tableStatus === 'checking_out' ? (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs text-center space-y-3 animate-fade-in">
      <div className="flex items-center justify-center gap-2 text-rose-600 font-extrabold text-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
        <span>⏳ แจ้งเรียกพนักงานเช็คบิลแล้ว</span>
      </div>
      <p className="text-slate-500 text-xs font-semibold">
        พนักงานกำลังจัดเตรียมใบเสร็จและเดินทางมาที่ <span className="font-extrabold text-rose-600">โต๊ะ {tableId}</span>
      </p>
      <button
        onClick={handleCancelCheckBill}
        disabled={isUpdatingStatus}
        className="px-4 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
      >
        ยกเลิกการเรียกเช็คบิล
      </button>
    </div>
  ) : (
    <button
      onClick={() => setShowCheckBillConfirm(true)}
      className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-red-600/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
    >
      <BellRing className="w-5 h-5 animate-bounce" />
      <span>เรียกเช็คบิล / ชำระเงิน</span>
    </button>
  )}
</div>
```

- [ ] **Step 3: Render Check Bill Confirmation Modal**

```tsx
{/* Check Bill Confirmation Modal */}
{showCheckBillConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
    <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
      <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200">
        <BellRing className="w-7 h-7" />
      </div>
      <div>
        <h3 className="text-base font-black text-slate-900">เรียกพนักงานเช็คบิล?</h3>
        <p className="text-slate-500 text-xs mt-1">
          โต๊ะ {tableId} • ยอดรวมยอดสั่งอาหารทั้งสิ้น <span className="font-extrabold text-red-600">฿{totalAmt.toLocaleString()}</span>
        </p>
      </div>
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => setShowCheckBillConfirm(false)}
          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
        >
          ยังก่อน
        </button>
        <button
          onClick={handleRequestCheckBill}
          disabled={isUpdatingStatus}
          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-xs"
        >
          {isUpdatingStatus ? 'กำลังส่งสัญญาณ...' : 'ยืนยันเรียกเช็คบิล'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Commit Changes**

```bash
git add app/customer/\[session_id\]/page.tsx
git commit -m "feat(customer): add Check Bill button, modal, and status banner"
```

---

### Task 3: Real-Time Verification & Build Check

**Files:**
- Test: `app/customer/[session_id]/page.tsx`, `components/TableMap.tsx`

- [ ] **Step 1: Run TypeScript verification**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Test Real-Time Synchronization**

Open Staff POS (`http://localhost:3000`) and Customer Portal in two windows/devices.
1. Click "เรียกเช็คบิล" on Customer Portal.
2. Confirm modal.
3. Verify POS Table 1 card turns **RED (รอเช็คบิล / Checking Out)** in real-time under ~100ms.
4. Verify Customer Portal shows pulsing red banner "⏳ แจ้งเรียกพนักงานเช็คบิลแล้ว".

- [ ] **Step 3: Final Commit**

```bash
git add .
git commit -m "chore(customer): verify real-time customer check bill synchronization"
```
