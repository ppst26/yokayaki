## Task 2: Design Tokens - Layout & Grid

**Files:**
- Modify: `app/globals.css` (after custom media queries)

**Interfaces:**
- Consumes: Custom media queries from Task 1
- Produces:
  - Layout tokens: `--sidebar-width`, `--content-padding`, `--page-margin`
  - Grid tokens: `--grid-cols-menu`, `--grid-cols-table`, `--grid-cols-cards`, `--grid-gap`, `--grid-gap-lg`

**Duration:** 30 minutes

---

- [ ] **Step 1: Add base layer with mobile defaults**

```css
/* app/globals.css - after custom media queries */

@layer base {
  /* ===================================
     DESIGN TOKENS - iPad Responsive System
     =================================== */
  
  :root {
    /* Layout Tokens - Mobile (< 768px) */
    --sidebar-width: 0;
    --sidebar-padding: 1.25rem;
    --content-padding: 1rem;
    --content-max-width: 100%;
    --page-margin: 1rem;
    
    /* Grid Tokens - Mobile */
    --grid-cols-menu: 2;
    --grid-cols-table: 2;
    --grid-cols-cards: 1;
    --grid-gap: 0.75rem;
    --grid-gap-lg: 1rem;
  }
}
```

- [ ] **Step 2: Add tablet breakpoint tokens (768-833px)**

```css
  /* Tablet (768-833px) - iPad standard, iPad Mini */
  @media (--tablet) {
    :root {
      /* Layout */
      --sidebar-width: 240px;
      --content-padding: 1.5rem;
      --content-max-width: calc(100vw - 240px);
      --page-margin: 1.5rem;
      
      /* Grid */
      --grid-cols-menu: 2;        /* Keep 2 (sidebar takes space) */
      --grid-cols-table: 3;       /* 3 table cards fit well */
      --grid-cols-cards: 2;       /* 2-column stat cards */
      --grid-gap: 1rem;
      --grid-gap-lg: 1.25rem;
    }
  }
```

- [ ] **Step 3: Add tablet-xl breakpoint tokens (834-1023px)**

```css
  /* Tablet XL (834-1023px) - iPad Pro 11", iPad Air */
  @media (--tablet-xl) {
    :root {
      /* Layout */
      --sidebar-width: 256px;
      --content-padding: 1.75rem;
      --content-max-width: calc(100vw - 256px);
      
      /* Grid */
      --grid-cols-menu: 3;        /* 3 menu items per row */
      --grid-cols-table: 3;       /* Keep 3 (good balance) */
      --grid-cols-cards: 2;       /* Keep 2 (card width ideal) */
      --grid-gap: 1.25rem;
      --grid-gap-lg: 1.5rem;
    }
  }
```

- [ ] **Step 4: Add desktop breakpoint tokens (1024px+)**

```css
  /* Desktop (1024px+) - iPad Pro 12.9", Desktop monitors */
  @media (--desktop) {
    :root {
      /* Layout */
      --sidebar-width: 288px;
      --content-padding: 2rem;
      --content-max-width: calc(100vw - 288px);
      --page-margin: 2rem;
      
      /* Grid */
      --grid-cols-menu: 4;        /* 4-column menu grid */
      --grid-cols-table: 4;       /* 4 table cards */
      --grid-cols-cards: 3;       /* 3-column stats */
    }
  }
```

- [ ] **Step 5: Verify tokens in DevTools**

Open DevTools → Elements → Computed → Filter `--sidebar-width`
Resize viewport and verify:
- < 768px: `0`
- 768-833px: `240px`
- 834-1023px: `256px`
- 1024px+: `288px`

- [ ] **Step 6: Commit layout & grid tokens**

```bash
git add app/globals.css
git commit -m "feat(tokens): add layout and grid design tokens

- Add layout tokens: sidebar width, content padding, page margin
- Add grid tokens: column counts, gaps
- Values change automatically at 4 breakpoints
- Base for component migration"
```

---

