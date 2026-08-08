# Noto Sans Thai & Typography Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the font engine to Noto Sans Thai across Yokayaki POS and implement a professional 8-level typography hierarchy system.

**Architecture:** Map `--font-sans` in Next.js layout and `@theme inline` in Tailwind CSS v4 to `Noto Sans Thai`. Define utility hierarchy classes (`.text-display`, `.text-h1`, `.text-h2`, `.text-h3`, `.text-body`, `.text-caption`, `.text-micro`, `.text-price`) in `globals.css` and audit/standardize all core POS screens.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, Lucide React, TypeScript, pnpm.

## Global Constraints

- **Font Family:** Noto Sans Thai (`--font-noto-sans-thai`) as primary for English & Thai.
- **Monospace Numbers:** Geist Mono (`--font-geist-mono`) with `font-mono tabular-nums` for currency, quantities, order IDs, timers, and phone numbers.
- **Line Heights:** `leading-relaxed` for Thai body text, `leading-snug` / `leading-tight` for headings.
- **Strict Hierarchy Utility Scale:**
  - `.text-display`: `text-3xl md:text-4xl font-bold tracking-tight leading-tight`
  - `.text-h1`: `text-2xl font-bold tracking-tight leading-snug`
  - `.text-h2`: `text-lg md:text-xl font-bold leading-snug`
  - `.text-h3`: `text-base font-semibold leading-normal`
  - `.text-body`: `text-sm font-normal md:font-medium leading-relaxed`
  - `.text-caption`: `text-xs font-normal text-muted-foreground leading-normal`
  - `.text-micro`: `text-[10px] md:text-[11px] font-semibold uppercase tracking-wider`
  - `.text-price`: `font-mono tabular-nums`

---

### Task 1: Root Layout & Global CSS Theme Configuration

**Files:**
- Modify: `app/layout.tsx:1-41`
- Modify: `app/globals.css:1-55`

**Interfaces:**
- Consumes: Noto Sans Thai Google Font from `next/font/google`
- Produces: CSS variables `--font-sans`, `--font-heading` pointing to Noto Sans Thai, and global typography utility classes.

- [ ] **Step 1: Update `app/layout.tsx` font variables**

Configure `Noto_Sans_Thai` as `--font-noto-sans-thai` and map Geist font variable to `--font-geist` so `--font-sans` can be used exclusively by Noto Sans Thai in `globals.css`:

```tsx
import type { Metadata } from "next";
import { Noto_Sans_Thai, Geist_Mono, Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yokayaki Izakaya POS",
  description: "ระบบบริหารจัดการร้านอาหารญี่ปุ่นและระบบสั่งอาหารไฮบริด Yokayaki Izakaya Point of Sale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={cn("h-full", "antialiased", notoSansThai.variable, geistMono.variable, geist.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground antialiased leading-relaxed">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update `app/globals.css` with `@theme inline` and typography utility scale**

Add Noto Sans Thai mapping in `@theme inline` and define `.text-display`, `.text-h1`, `.text-h2`, `.text-h3`, `.text-body`, `.text-caption`, `.text-micro`, and `.text-price` utility classes in `@layer utilities`:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-noto-sans-thai), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-noto-sans-thai), system-ui, sans-serif;
  /* rest of theme variables */
}

@layer utilities {
  .text-display {
    @apply text-3xl md:text-4xl font-bold tracking-tight leading-tight;
  }
  .text-h1 {
    @apply text-2xl font-bold tracking-tight leading-snug;
  }
  .text-h2 {
    @apply text-lg md:text-xl font-bold leading-snug;
  }
  .text-h3 {
    @apply text-base font-semibold leading-normal;
  }
  .text-body {
    @apply text-sm font-normal md:font-medium leading-relaxed;
  }
  .text-caption {
    @apply text-xs font-normal text-muted-foreground leading-normal;
  }
  .text-micro {
    @apply text-[10px] md:text-[11px] font-semibold uppercase tracking-wider;
  }
  .text-price {
    @apply font-mono tabular-nums;
  }
}
```

- [ ] **Step 3: Verify build / dev server compilation**

Run: `pnpm build`
Expected: Successful Next.js build without CSS or TypeScript errors.

- [ ] **Step 4: Commit Task 1 changes**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat(typography): configure Noto Sans Thai root font engine and global hierarchy scale"
```

---

### Task 2: Standardize Core POS Navigation & Ordering Screens

**Files:**
- Modify: `components/TableMap.tsx`
- Modify: `components/POSOrderScreen.tsx`

**Interfaces:**
- Consumes: `.text-h1`, `.text-h2`, `.text-h3`, `.text-body`, `.text-caption`, `.text-micro`, `.text-price` from `globals.css`
- Produces: Standardized typography across floor map and staff POS ordering flow.

- [ ] **Step 1: Standardize `components/TableMap.tsx` typography**

Update headers to use `text-h1`, table cards to use `text-h2` for table names, `text-caption` for customer capacity/status details, and `text-micro` for status badges (`ว่าง`, `มีลูกค้า`, `กำลังเช็คบิล`). Ensure numbers use `font-mono tabular-nums`.

- [ ] **Step 2: Standardize `components/POSOrderScreen.tsx` typography**

Update category tabs to use `text-h3`, menu titles to use `text-h3`, menu prices to use `text-price text-body font-semibold`, cart items to use `text-body`, cart item note text to `text-caption`, and total price display to `text-display text-price`.

- [ ] **Step 3: Test POS order screen layout**

Run: `pnpm build`
Expected: PASS with 0 build warnings/errors.

- [ ] **Step 4: Commit Task 2 changes**

```bash
git add components/TableMap.tsx components/POSOrderScreen.tsx
git commit -m "style(pos): standardize typography hierarchy in TableMap and POSOrderScreen"
```

---

### Task 3: Standardize Checkout & Kitchen Display System (KDS) Screens

**Files:**
- Modify: `components/CheckoutScreen.tsx`
- Modify: `components/KitchenScreen.tsx`

**Interfaces:**
- Consumes: Global typography scale utilities
- Produces: Professional checkout summary breakdown and realtime KDS display cards.

- [ ] **Step 1: Standardize `components/CheckoutScreen.tsx` typography**

Update payment screen title to `text-h1`, breakdown labels (ยอดรวม, ส่วนลด, สมาชิก) to `text-body`, total payment net amount to `text-display text-price text-red-600 dark:text-red-400`, phone search input to `font-mono`, and thermal receipt layout to crisp `text-xs font-mono`.

- [ ] **Step 2: Standardize `components/KitchenScreen.tsx` typography**

Update KDS header to `text-h1`, table card headers to `text-h2`, wait timers to `text-price text-sm font-bold`, order item names to `text-h3`, item special notes to `text-caption text-amber-600 dark:text-amber-400 font-medium`, and serve buttons to `text-body font-semibold`.

- [ ] **Step 3: Test Checkout and Kitchen display builds**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Commit Task 3 changes**

```bash
git add components/CheckoutScreen.tsx components/KitchenScreen.tsx
git commit -m "style(checkout-kds): standardize typography in CheckoutScreen and KitchenScreen"
```

---

### Task 4: Standardize Management & Customer Portal Screens

**Files:**
- Modify: `components/StockManager.tsx`
- Modify: `components/OwnerDashboard.tsx`
- Modify: `app/customer/[session_id]/page.tsx`

**Interfaces:**
- Consumes: Global typography scale utilities
- Produces: Clean typography across owner dashboard analytics, stock data tables, and customer mobile ordering portal.

- [ ] **Step 1: Standardize `components/StockManager.tsx` and `components/OwnerDashboard.tsx`**

Apply `text-h1` to page headers, `text-h2` to card titles/KDS metrics, `text-h3` to table column headers, `text-body` to row contents, `text-price` to stock counts and revenue figures, and `text-caption` to filter labels and subtitle hints.

- [ ] **Step 2: Standardize `app/customer/[session_id]/page.tsx`**

Apply `text-h2` for Mobile Header ("Yokayaki Izakaya โต๊ะ X"), `text-h3` for Menu item names, `text-price text-body` for prices, `text-caption` for item notes/descriptions, `text-display text-price` for Sticky Cart Summary button, and `text-micro` for order status badges.

- [ ] **Step 3: Run final verification build**

Run: `pnpm build`
Expected: Complete build success.

- [ ] **Step 4: Commit Task 4 changes**

```bash
git add components/StockManager.tsx components/OwnerDashboard.tsx app/customer/[session_id]/page.tsx
git commit -m "style(management-customer): apply typography hierarchy to stock, owner dashboard, and customer portal"
```
