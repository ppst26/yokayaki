## Task 3: Design Tokens - Card, Typography & Spacing

**Files:**
- Modify: `app/globals.css:@layer base :root` (continue from Task 2)

**Interfaces:**
- Consumes: Existing tokens from Task 2
- Produces:
  - Card tokens: `--card-padding`, `--card-padding-sm`, `--card-padding-lg`, `--card-radius`, `--card-radius-sm`, `--card-gap`
  - Typography tokens: `--text-card-title`, `--text-card-value`, `--text-table-cell`
  - Spacing tokens: `--space-section`, `--space-component`, `--space-element`
  - Component tokens: `--pos-cart-width`, `--kitchen-cols`, `--manager-table-font`

**Duration:** 30 minutes

---

- [ ] **Step 1: Add card, typography & spacing tokens to mobile defaults**

```css
    /* Card Tokens - Mobile */
    --card-padding: 1rem;
    --card-padding-sm: 0.75rem;
    --card-padding-lg: 1.5rem;
    --card-radius: 1rem;
    --card-radius-sm: 0.75rem;
    --card-gap: 0.75rem;
    
    /* Typography Tokens - Mobile */
    --text-card-title: 0.875rem;
    --text-card-value: 1.5rem;
    --text-table-cell: 0.875rem;
    
    /* Spacing Tokens - Mobile */
    --space-section: 1.5rem;
    --space-component: 1rem;
    --space-element: 0.5rem;
    
    /* Component-Specific Tokens - Mobile */
    --pos-cart-width: 100%;
    --kitchen-cols: 1;
    --manager-table-font: 0.875rem;
    --manager-form-width: 100%;
```

- [ ] **Step 2: Add card & spacing tokens to tablet breakpoint**

```css
  @media (--tablet) {
    :root {
      /* ... existing layout & grid tokens ... */
      
      /* Card */
      --card-padding: 1.25rem;
      --card-padding-sm: 1rem;
      --card-padding-lg: 1.75rem;
      --card-radius: 1.25rem;
      --card-gap: 1rem;
      
      /* Spacing */
      --space-section: 2rem;
      --space-component: 1.25rem;
      
      /* Component-Specific */
      --pos-cart-width: 380px;
      --kitchen-cols: 2;
      --manager-form-width: 600px;
    }
  }
```

- [ ] **Step 3: Add tokens to tablet-xl breakpoint**

```css
  @media (--tablet-xl) {
    :root {
      /* ... existing tokens ... */
      
      /* Card */
      --card-padding: 1.5rem;
      --card-radius: 1.5rem;
      
      /* Component-Specific */
      --kitchen-cols: 3;
    }
  }
```

- [ ] **Step 4: Add tokens to desktop breakpoint**

```css
  @media (--desktop) {
    :root {
      /* ... existing tokens ... */
      
      /* Card */
      --card-padding: 2rem;
      
      /* Typography */
      --text-card-title: 1.125rem;
      --text-card-value: 2rem;
      --text-table-cell: 1rem;
      
      /* Spacing */
      --space-section: 2.5rem;
      --space-component: 1.5rem;
    }
  }
```

- [ ] **Step 5: Add shared tablet typography (all iPad sizes)**

```css
  /* Typography adjustments for all iPad sizes */
  @media (--tablet-all) {
    :root {
      --text-card-title: 1rem;
      --text-card-value: 1.75rem;
      --text-table-cell: 0.9375rem;
    }
  }
```

- [ ] **Step 6: Verify token values at all breakpoints**

DevTools → Computed → Check multiple tokens at each breakpoint
Expected: Values change smoothly

- [ ] **Step 7: Commit card, typography & spacing tokens**

```bash
git add app/globals.css
git commit -m "feat(tokens): add card, typography & spacing tokens

- Card tokens: padding, radius variants
- Typography tokens: card titles, values, table cells
- Spacing tokens: section, component, element gaps
- Component-specific tokens: POS cart, kitchen, manager pages
- Complete token system for all components"
```

---

