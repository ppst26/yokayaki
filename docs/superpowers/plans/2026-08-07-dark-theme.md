# Dark Theme Support & Global Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Theme Toggle (Sun/Moon) in `SidebarNav.tsx` and implement complete Dark Mode styles for `MenuManager.tsx` and `LoyaltyManager.tsx`.

**Architecture:** Manage dark class on `document.documentElement` via `SidebarNav.tsx` theme toggle button and `localStorage` (`yokayaki_theme`). Apply Tailwind `dark:` variants across components for cards, headers, tables, pagination, inputs, dropdowns, and modals.

**Tech Stack:** Next.js 16, React 19, TailwindCSS v4, Lucide React (`Sun`, `Moon`).

## Global Constraints
- Persist theme state in `localStorage.setItem('yokayaki_theme', 'dark' | 'light')`
- Support smooth transitions and proper text contrast in both light and dark modes
- Maintain Yokayaki brand red accents (`bg-red-600`, `text-red-500`) in dark mode

---

### Task 1: Add Theme Toggle Button & State to SidebarNav.tsx

**Files:**
- Modify: `components/SidebarNav.tsx`

**Interfaces:**
- Consumes: `localStorage`, `document.documentElement`
- Produces: Theme switcher button in desktop sidebar & mobile drawer

- [ ] **Step 1: Import Sun and Moon icons in SidebarNav.tsx**

```typescript
import { Sun, Moon } from 'lucide-react';
```

- [ ] **Step 2: Add theme state and toggle handler**

```typescript
const [theme, setTheme] = useState<'light' | 'dark'>('light');

useEffect(() => {
  const saved = localStorage.getItem('yokayaki_theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    setTheme('dark');
    document.documentElement.classList.add('dark');
  } else {
    setTheme('light');
    document.documentElement.classList.remove('dark');
  }
}, []);

const toggleTheme = () => {
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  setTheme(nextTheme);
  localStorage.setItem('yokayaki_theme', nextTheme);
  if (nextTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};
```

- [ ] **Step 3: Render theme toggle button in mobile drawer & desktop sidebar**

Add toggle button beside user profile / logo in `SidebarNav.tsx`:
```tsx
<button
  onClick={toggleTheme}
  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer border border-slate-200 dark:border-slate-700"
  title={theme === 'light' ? 'เปลี่ยนเป็น Dark Mode' : 'เปลี่ยนเป็น Light Mode'}
>
  {theme === 'light' ? (
    <>
      <Moon className="w-4 h-4 text-slate-600" />
      <span>Dark Mode</span>
    </>
  ) : (
    <>
      <Sun className="w-4 h-4 text-amber-400" />
      <span>Light Mode</span>
    </>
  )}
</button>
```

- [ ] **Step 4: Commit Task 1 changes**

```powershell
git add components/SidebarNav.tsx
git commit -m "feat: add global dark theme toggle and state persistence in SidebarNav"
```

---

### Task 2: Add Dark Mode Styling to MenuManager.tsx

**Files:**
- Modify: `components/MenuManager.tsx`

**Interfaces:**
- Consumes: Tailwind `dark:` variants
- Produces: Dark theme compliant MenuManager UI

- [ ] **Step 1: Add dark mode classes to Header, Filter Tabs, and Search Input**

Update header card: `dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100`
Update search input: `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500`
Update filter category buttons: `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700`

- [ ] **Step 2: Add dark mode classes to Menu Table & Pagination Footer**

Update table container: `dark:bg-slate-900 dark:border-slate-800`
Update table header (`<thead>`): `dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-700`
Update table rows (`<tr>`): `dark:border-slate-800 dark:hover:bg-slate-800/50`
Update item title: `dark:text-slate-100`
Update pagination footer: `dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-300`
Update page size dropdown: `dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`
Update pagination buttons: `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700`

- [ ] **Step 3: Add dark mode classes to Form and Delete Modals**

Update modal overlays and containers: `dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100`
Update modal inputs and selects: `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100`

- [ ] **Step 4: Commit Task 2 changes**

```powershell
git add components/MenuManager.tsx
git commit -m "feat: add dark theme styling to MenuManager"
```

---

### Task 3: Add Dark Mode Styling to LoyaltyManager.tsx

**Files:**
- Modify: `components/LoyaltyManager.tsx`

**Interfaces:**
- Consumes: Tailwind `dark:` variants
- Produces: Dark theme compliant LoyaltyManager UI

- [ ] **Step 1: Add dark mode classes to Header, Summary Cards, and Search Input**

Update header card: `dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100`
Update summary cards: `dark:bg-slate-800/90 dark:border-slate-700/60 dark:text-slate-100`
Update search input: `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500`

- [ ] **Step 2: Add dark mode classes to Members Table & Pagination Footer**

Update table container: `dark:bg-slate-900 dark:border-slate-800`
Update table header (`<thead>`): `dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-700`
Update table rows (`<tr>`): `dark:border-slate-800 dark:hover:bg-slate-800/50`
Update member name: `dark:text-slate-100`
Update pagination footer: `dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-300`
Update page size dropdown: `dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`
Update pagination buttons: `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700`

- [ ] **Step 3: Add dark mode classes to Detail View, Bills Table, and Modals**

Update detail view headers & bills table: `dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100`
Update edit, delete, and adjust points modals: `dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100`

- [ ] **Step 4: Commit Task 3 changes**

```powershell
git add components/LoyaltyManager.tsx
git commit -m "feat: add dark theme styling to LoyaltyManager"
```
