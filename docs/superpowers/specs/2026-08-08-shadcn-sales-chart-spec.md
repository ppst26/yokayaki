# Shadcn Chart Integration for Sales Overview — Design Spec

> **ตำแหน่งไฟล์สเปก:** `docs/superpowers/specs/2026-08-08-shadcn-sales-chart-spec.md`  
> **วันอัปเดตล่าสุด:** 8 สิงหาคม 2569  
> **สถานะ:** ใช้งานบน Production (Active)

---

## 🎯 Overview
Migrate `SalesChart.tsx` in Owner Dashboard to use **Shadcn Chart UI Primitives** (`components/ui/chart.tsx`) built on top of **Recharts 3.8.0** and TailwindCSS.

---

## 📐 Technical Architecture

### 1. Primitives & Components
- **`ChartContainer`** from `@/components/ui/chart`
- **`ChartTooltip`** & **`ChartTooltipContent`** from `@/components/ui/chart`
- **`BarChart`**, **`Bar`**, **`XAxis`**, **`YAxis`**, **`CartesianGrid`**, **`Cell`** from `recharts`

### 2. Chart Configuration (`ChartConfig`)
```typescript
const chartConfig = {
  revenue: {
    label: "ยอดขายสุทธิ",
    color: "#dc2626", // Red-600
  },
} satisfies ChartConfig;
```

### 3. Features & UX
- **Dynamic Slotting:**
  - `Today` / `Yesterday`: 7 Hourly slots (`17:00` - `23:00`)
  - `This Week`: 7 Daily slots (`จ.` - `อา.`)
  - `This Month` / `Custom`: Daily slots (`1` - `31`) with `overflow-x-auto` horizontal scroll when bars exceed card width.
- **Bar Styling:** Rounded top corners (`radius={[6, 6, 0, 0]}`), peak revenue bar highlighted with a distinct gradient or amber color.
- **Custom Tooltip:** Shadcn `ChartTooltipContent` formatted with Thai baht currency (`฿`) and bill count.

---

## 📁 Files Affected
- `components/dashboard/SalesChart.tsx`
