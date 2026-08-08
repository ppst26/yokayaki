# Daily Sales & Audit History Range Filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Today / Yesterday date range toggle in `SalesHistory.tsx` to allow audit view for today or yesterday.

**Architecture:** Add `auditDateRange` state (`'today' | 'yesterday'`) to `SalesHistory.tsx`, calculate start/end ISO strings dynamically, update Supabase `.gte()` and `.lte()` queries for completed orders and void logs, and render a toggle pill bar in the header.

**Tech Stack:** React 19, Supabase JS client, Lucide React.

## Global Constraints
- React 19.2.4 Client Component (`"use client"`)

---

### Task 1: Update SalesHistory.tsx State, Queries, and Toggle Controls

**Files:**
- Modify: `components/sales/SalesHistory.tsx`

**Interfaces:**
- Consumes: Supabase `orders`, `payments`, `void_logs` tables.
- Produces: Updated `SalesHistory` component with Today/Yesterday filter.

- [ ] **Step 1: Inspect SalesHistory.tsx fetch functions**

Review `fetchTodayOrders` and `fetchVoidLogs` in `components/sales/SalesHistory.tsx`.

- [ ] **Step 2: Add auditDateRange state and dynamic date range helper**

```tsx
const [auditDateRange, setAuditDateRange] = useState<'today' | 'yesterday'>('today');

const getDateRange = (range: 'today' | 'yesterday') => {
  const start = new Date();
  const end = new Date();

  if (range === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { startISO: start.toISOString(), endISO: end.toISOString() };
};
```

- [ ] **Step 3: Update fetchTodayOrders and fetchVoidLogs to filter by startISO & endISO**

Update `fetchTodayOrders` and `fetchVoidLogs` to use `getDateRange(auditDateRange)`.

- [ ] **Step 4: Add Today/Yesterday Toggle Buttons to SalesHistory Header**

Add toggle buttons next to "รีเฟรชข้อมูล":
```tsx
<div className="flex items-center gap-1.5 bg-slate-100 dark:bg-neutral-800/80 p-1 rounded-2xl">
  <button
    type="button"
    onClick={() => setAuditDateRange('today')}
    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
      auditDateRange === 'today'
        ? 'bg-red-600 text-white shadow-xs'
        : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900'
    }`}
  >
    วันนี้ (Today)
  </button>
  <button
    type="button"
    onClick={() => setAuditDateRange('yesterday')}
    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
      auditDateRange === 'yesterday'
        ? 'bg-red-600 text-white shadow-xs'
        : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900'
    }`}
  >
    เมื่อวาน (Yesterday)
  </button>
</div>
```

- [ ] **Step 5: Verify and Commit**

Run git status and commit changes.
