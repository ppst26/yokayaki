# Design Spec: Dashboard Top Profit & Sales KPI Cards

## Goal
Implement two top-level KPI cards on the Owner Dashboard ([`TopKPICards.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/dashboard/TopKPICards.tsx)):
1. **ยอดขายสุทธิ (Net Sales)**: Total revenue collected after deducting promotion discounts, with subtotal & discount breakdown.
2. **กำไรประมาณการ (Estimated Profit)**: Net sales minus ingredient purchase costs within the filtered date range.

## Data Calculation Logic

### 1. ยอดขายสุทธิ (Net Sales)
- **Net Sales**: $\sum \text{payments.net\_amount}$ for payments created within `startDate` to `endDate`.
- **Gross Sales (ราคาเต็ม)**: $\sum \text{payments.subtotal}$ (or Net Sales + Discounts).
- **Total Discounts (ส่วนลด)**: $\sum \text{payments.discount\_amount}$.

### 2. กำไรประมาณการ (Estimated Profit)
- **Total Ingredient Cost**: $\sum \text{item\_ingredients.cost}$ where `purchase_date` is between `startDate` and `endDate`.
- **Estimated Profit**: $\text{Net Sales} - \text{Total Ingredient Cost}$.

## UI Component Design

- **Layout**: 2-column grid (`grid grid-cols-1 sm:grid-cols-2 gap-4`) in [`TopKPICards.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/dashboard/TopKPICards.tsx).
- **Card 1: ยอดขายสุทธิ (Net Sales)**
  - Value: `netRevenue.toLocaleString()` ฿
  - Subtitle: `(ก่อนหักโปร ฿grossSales • หักโปร ฿totalDiscounts)`
  - Icon: `DollarSign` (Emerald background & icon color)
- **Card 2: กำไรประมาณการ (Estimated Profit)**
  - Value: `estimatedProfit.toLocaleString()` ฿
  - Subtitle: `(ยอดขายสุทธิ ฿netRevenue • ต้นทุนจัดซื้อ ฿totalIngredientCost)`
  - Icon: `TrendingUp` (Violet background & icon color)

## Files Modified
- [`components/dashboard/TopKPICards.tsx`](file:///c:/Users/PP/Desktop/React/yokayaki/components/dashboard/TopKPICards.tsx)
