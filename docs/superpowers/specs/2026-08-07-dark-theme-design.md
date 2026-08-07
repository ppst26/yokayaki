# Dark Theme Support & Global Switcher Design Spec

## 1. Overview
Add complete Dark Theme support to YOKAYAKI POS, focusing on `MenuManager.tsx`, `LoyaltyManager.tsx`, and `SidebarNav.tsx`. Introduce a persistent Theme Switcher toggle (Sun/Moon icons) in `SidebarNav.tsx` that controls the `.dark` class on `document.documentElement` and persists user preference in `localStorage` (`yokayaki_theme`).

## 2. Key Requirements
- **Global Theme Toggle**:
  - Located in `SidebarNav.tsx` (both desktop sidebar and mobile slide-over drawer).
  - Toggles `.dark` class on `document.documentElement`.
  - Saved in `localStorage` (`yokayaki_theme`).
  - Auto-initializes on app load according to `localStorage` or `prefers-color-scheme`.
- **MenuManager Dark Styling**:
  - Header & Cards: `dark:bg-slate-800/90 dark:border-slate-700/60 dark:text-slate-100`.
  - Table: `dark:bg-slate-900 dark:border-slate-700/60`, headers `dark:bg-slate-800 dark:text-slate-300`, row hover `dark:hover:bg-slate-800/60`.
  - Pagination Footer & Dropdown: `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300`, select dropdown `dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`.
  - Modals: `dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`.
- **LoyaltyManager Dark Styling**:
  - Summary Cards: `dark:bg-slate-800/90 dark:border-slate-700/60 dark:text-slate-100`.
  - Table & Detail Views: `dark:bg-slate-900 dark:border-slate-700/60`, headers `dark:bg-slate-800 dark:text-slate-300`, row hover `dark:hover:bg-slate-800/60`.
  - Pagination Footer & Dropdown: `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300`, select dropdown `dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`.
  - Modals: `dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100`.

## 3. Implementation Details

### Theme Toggle Hook / Handler in SidebarNav.tsx
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

## 4. Verification Plan
- Toggle Light/Dark mode via Sidebar button.
- Verify `document.documentElement` receives/removes `.dark` class.
- Verify `MenuManager` and `LoyaltyManager` text contrast, table backgrounds, inputs, dropdowns, pagination buttons, and modals look crisp and readable in both light and dark modes.
- Refresh page (`F5`) to confirm theme preference is retained from `localStorage`.
- Run `npm run build` to confirm 0 compilation errors.
