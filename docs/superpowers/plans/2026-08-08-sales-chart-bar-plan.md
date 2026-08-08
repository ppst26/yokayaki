# Sales Overview Bar Chart Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement dynamic 7-bar hourly slotting for Today/Yesterday, 7-bar daily slotting for This Week, and horizontal scrollable daily slotting for This Month / Custom range in `SalesChart.tsx`.

**Architecture:** Modify `SalesChart.tsx` fetch logic to pre-generate all slots based on date range duration and date preset, update layout with sticky Y-axis and scrollable bars wrapper.

**Tech Stack:** React 19, Supabase JS client, Lucide React icons, Tailwind CSS `@tailwindcss/postcss`.

---

### Task 1: Update SalesChart.tsx Dynamic Bar Slotting & Scrollable UI

**Files:**
- Modify: `components/dashboard/SalesChart.tsx`

- [ ] **Step 1: Inspect date range calculation and slot generation logic**

Define slot generation functions:
1. Hourly slots (17:00 - 23:00) for range <= 1.5 days.
2. Weekly slots (Monday - Sunday) for range between 2 and 7 days.
3. Daily slots (1 to N days) for range > 7 days.

- [ ] **Step 2: Implement pre-filled slot generation in SalesChart.tsx**

```typescript
const generateSlots = (start: Date, end: Date) => {
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 2) {
    // 7 Hourly slots: 17:00 to 23:00
    const hours = [17, 18, 19, 20, 21, 22, 23];
    return hours.map(h => ({
      key: `${h.toString().padStart(2, '0')}:00`,
      label: `${h.toString().padStart(2, '0')}:00`,
      revenue: 0,
      billCount: 0,
      hour: h,
    }));
  } else if (diffDays <= 7) {
    // 7 Day slots: Mon - Sun
    const days = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
    const slots = [];
    const cur = new Date(start);
    for (let i = 0; i < 7; i++) {
      const dayIdx = (cur.getDay() + 6) % 7; // Mon=0 .. Sun=6
      const key = cur.toISOString().split('T')[0];
      slots.push({
        key,
        label: days[dayIdx] || `${cur.getDate()}/${cur.getMonth() + 1}`,
        revenue: 0,
        billCount: 0,
        dateStr: key,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return slots;
  } else {
    // Monthly / Custom slots: 1 to N days
    const slots = [];
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().split('T')[0];
      const label = `${cur.getDate()}/${cur.getMonth() + 1}`;
      slots.push({
        key,
        label,
        revenue: 0,
        billCount: 0,
        dateStr: key,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return slots;
  }
};
```

- [ ] **Step 3: Map payments data to pre-filled slots**

Accumulate net_amount into matching slots.

- [ ] **Step 4: Update JSX layout for sticky Y-axis & horizontal scrollable bars**

Render sticky Y-axis on left and `overflow-x-auto` container for bars.

- [ ] **Step 5: Verify build & commit**

Run `npx tsc --noEmit` and commit changes.
