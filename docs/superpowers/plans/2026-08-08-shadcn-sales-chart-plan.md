# Shadcn Chart Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `SalesChart.tsx` to use Shadcn Chart components (`ChartContainer`, `ChartTooltip`, `ChartTooltipContent`) backed by Recharts.

**Architecture:** Update `SalesChart.tsx` imports, configure `chartConfig`, replace custom SVG bar logic with Recharts `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, and Shadcn `ChartTooltip`.

**Tech Stack:** React 19, Recharts 3.8.0, `@/components/ui/chart`, TailwindCSS.

---

### Task 1: Refactor SalesChart.tsx to use Shadcn Chart Primitives & Recharts

**Files:**
- Modify: `components/dashboard/SalesChart.tsx`

- [ ] **Step 1: Update imports in SalesChart.tsx**

```typescript
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts';
```

- [ ] **Step 2: Define ChartConfig**

```typescript
const chartConfig = {
  revenue: {
    label: "ยอดขายสุทธิ",
    color: "#dc2626",
  },
} satisfies ChartConfig;
```

- [ ] **Step 3: Implement Recharts BarChart with Shadcn ChartContainer**

Render `BarChart` inside `ChartContainer` with custom Shadcn Tooltip content formatting.

- [ ] **Step 4: Verify build and commit**

Run `npx tsc --noEmit` and commit changes.
