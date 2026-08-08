# Noto Sans Thai & Typography Hierarchy Standardization — Design Spec

**Date:** 2026-08-08  
**Status:** Approved  
**Scope:** Font Engine Setup, Typography Hierarchy System, Component Standardization

---

## 1. Overview & Objective

To elevate the Yokayaki POS application to a state-of-the-art, highly professional aesthetic, we are standardizing the entire typography system across all screens using **Noto Sans Thai** as the primary font family for both Thai and Latin text.

### Key Goals:
1. **Unified Font Engine**: Ensure `Noto Sans Thai` is assigned to `--font-sans` in Next.js App Router and Tailwind CSS v4 `@theme inline`, eliminating discrepancies where some components render Geist instead of Noto Sans Thai.
2. **Clear Typography Hierarchy**: Define a rigid 8-level scale for font sizes, font weights, leading (line-height), and tracking across the system.
3. **Thai Tone Mark & Readability Optimization**: Apply tailored line-heights (`leading-relaxed` / `leading-snug`) so Thai tone marks (วรรณยุกต์) do not overlap or feel cramped.
4. **Monospace & Tabular Numeric Formatting**: Enforce `Geist Mono` with `tabular-nums` for prices (`฿`), item quantities (`x2`), table timers, and phone numbers to ensure numeric alignment across tables and POS receipts.

---

## 2. Font Engine & CSS Configuration

### 2.1 Next.js Font Setup (`app/layout.tsx`)
- Load `Noto_Sans_Thai` with weights `["300", "400", "500", "600", "700"]` and CSS variable `--font-noto-sans-thai`.
- Inject `notoSansThai.variable` into `<html>` class list along with `geistMono.variable`.
- Set HTML `lang="th"` and add `antialiased` for smooth sub-pixel rendering.

```tsx
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});
```

### 2.2 CSS Theme Configuration (`app/globals.css`)
- In `@theme inline`, map:
  - `--font-sans`: `var(--font-noto-sans-thai), system-ui, sans-serif;`
  - `--font-heading`: `var(--font-noto-sans-thai), system-ui, sans-serif;`
- In `@layer base`:
  - `body`: `@apply bg-background text-foreground font-sans leading-relaxed;`

---

## 3. Typography Hierarchy Scale

| Level | Token / Utility | Font Size | Weight | Line Height & Letter Spacing | Target Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | `.text-display` | `30px - 36px` (`text-3xl / text-4xl`) | `font-bold` / `font-black` | `leading-tight tracking-tight` | Grand POS Totals, Key metrics, PinPad key values |
| **Heading 1** | `.text-h1` | `24px` (`text-2xl`) | `font-bold` | `leading-snug tracking-tight` | Screen titles (ผังโต๊ะ, สต็อกสินค้า, KDS, Dashboard) |
| **Heading 2** | `.text-h2` | `18px - 20px` (`text-lg / text-xl`) | `font-bold` / `font-semibold` | `leading-snug` | Modal & Drawer titles, Card headers, Table names |
| **Heading 3** | `.text-h3` | `16px` (`text-base`) | `font-semibold` | `leading-normal` | Menu item titles, Table headers, Category tab labels |
| **Body Primary** | `.text-body` | `14px` (`text-sm`) | `font-normal` / `font-medium` | `leading-relaxed` | Cart item descriptions, Form inputs, Standard text |
| **Caption / Meta** | `.text-caption` | `12px` (`text-xs`) | `font-normal` / `font-medium` | `leading-normal text-muted-foreground` | Special notes, Order timestamps, Help text, Subtitles |
| **Micro Tag** | `.text-micro` | `10px - 11px` (`text-[10px] / text-[11px]`) | `font-semibold` / `font-bold` | `tracking-wider uppercase` | Status badges (โต๊ะว่าง, โต๊ะมีลูกค้า, low stock, pending) |
| **Numeric / Price** | `.text-price` | Variable size | `font-mono` | `tabular-nums` | All currency values (`฿150`), quantities (`x2`), order numbers |

---

## 4. Component Scope & Standardization Strategy

1. **`app/layout.tsx` & `app/globals.css`**: Standardize root fonts, CSS theme variables, and global utility classes.
2. **`components/POSOrderScreen.tsx`**: Align product menu titles, price tags, category navigation, cart items, special notes.
3. **`components/TableMap.tsx`**: Standardize table cards (table name `text-h2`, seating `text-caption`, status badge `text-micro`).
4. **`components/CheckoutScreen.tsx`**: Standardize checkout breakdown (subtotal, discount, net amount `text-display`, promptpay details, receipt layout).
5. **`components/KitchenScreen.tsx`**: Align order card headers, timer text (`font-mono tabular-nums`), item status buttons.
6. **`components/StockManager.tsx` & `components/MenuManager.tsx`**: Standardize management data tables, filter bars, stock status badges.
7. **`components/OwnerDashboard.tsx`**: Standardize analytics KPI cards, chart labels, transaction history tables.
8. **`app/customer/[session_id]/page.tsx`**: Standardize mobile-first customer ordering portal typography.

---

## 5. Verification Plan

1. **Visual Consistency Check**: Inspect typography rendering across key screens (POS, Kitchen, Checkout, Customer QR, Dashboard).
2. **Thai Character Clearance Check**: Verify no clipping or overlapping of Thai tone marks (วรรณยุกต์) and vowels.
3. **Numeric Alignment Check**: Confirm currency figures and quantities align cleanly using tabular numbers.
4. **Build & Type Checking**: Run `pnpm build` or Next.js build check to confirm no CSS compilation errors.
