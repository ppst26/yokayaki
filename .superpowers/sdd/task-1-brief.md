## Task 1: Foundation - Tailwind Config & Custom Media Queries

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css:1-50` (after `@theme inline`)

**Interfaces:**
- Consumes: Existing Tailwind config
- Produces: 
  - `tablet` breakpoint (834px) for Tailwind classes
  - `@custom-media` queries: `--mobile`, `--tablet`, `--tablet-xl`, `--tablet-all`, `--desktop`

**Duration:** 15 minutes

---

- [ ] **Step 1: Add tablet breakpoint to Tailwind config**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'tablet': '834px',  // 🆕 iPad Pro 11" breakpoint
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Add custom media queries to globals.css**

```css
/* app/globals.css - add after @theme inline block */

/* Custom Media Queries for iPad Responsive Design */
@custom-media --mobile (width < 768px);
@custom-media --tablet (768px <= width < 834px);
@custom-media --tablet-xl (834px <= width < 1024px);
@custom-media --tablet-all (768px <= width < 1024px);
@custom-media --desktop (width >= 1024px);
```

- [ ] **Step 3: Verify Tailwind compilation**

Run: `pnpm dev`
Expected: No errors, `tablet:` prefix available in components

- [ ] **Step 4: Test custom media queries**

Add temporary test in any component:
```css
@media (--tablet) {
  .test { background: red; }
}
```
Open DevTools → Resize to 768-833px → Verify `.test` is red

- [ ] **Step 5: Commit foundation**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat(tokens): add iPad breakpoint and custom media queries

- Add tablet:834px breakpoint for Tailwind
- Add 5 custom media queries for precise iPad targeting
- Foundation for token-based responsive system"
```

---

