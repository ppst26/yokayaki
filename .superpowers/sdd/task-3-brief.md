### Task 3: Data Access Layer & Category Tree Helpers

**Files:**
- Modify: `lib/menuCategories.ts`
- Create: `lib/promoTargets.ts`
- Modify: `lib/menuCategories.test.ts`
- Create: `lib/promoTargets.test.ts`

**Interfaces:**
- Produces in `lib/menuCategories.ts`:
  - `MenuCategoryRow` with `parent_id?: number | null`
  - `CategoryTreeItem`: `{ id, name, sort_order, parent_id, children: CategoryTreeItem[] }`
  - `buildCategoryTree(categories: MenuCategoryRow[]): CategoryTreeItem[]`
  - `saveCategoryHierarchy(updates: Array<{ id: number; parent_id: number | null; sort_order: number }>): Promise<{ error: string | null }>`
- Produces in `lib/promoTargets.ts`:
  - `PromotionTargetRow`: `{ id, promotion_id, target_type, target_id }`
  - `fetchPromotionTargets(promoId: number): Promise<PromotionTargetRow[]>`
  - `savePromotionTargets(promoId: number, targets: Array<{ target_type: string; target_id: number }>): Promise<{ error: string | null }>`

- [ ] **Step 1: Write unit tests in `lib/menuCategories.test.ts`**
```typescript
it('buildCategoryTree correctly groups parent and child categories', () => {
  const rows: MenuCategoryRow[] = [
    { id: 1, org_id: 'org1', name: 'อาหาร', sort_order: 1, parent_id: null, created_at: '' },
    { id: 2, org_id: 'org1', name: 'ของทานเล่น', sort_order: 1, parent_id: 1, created_at: '' },
    { id: 3, org_id: 'org1', name: 'จานหลัก', sort_order: 2, parent_id: 1, created_at: '' },
    { id: 4, org_id: 'org1', name: 'เครื่องดื่ม', sort_order: 2, parent_id: null, created_at: '' },
  ];
  const tree = buildCategoryTree(rows);
  expect(tree).toHaveLength(2);
  expect(tree[0].name).toBe('อาหาร');
  expect(tree[0].children).toHaveLength(2);
  expect(tree[0].children[0].name).toBe('ของทานเล่น');
  expect(tree[1].name).toBe('เครื่องดื่ม');
  expect(tree[1].children).toHaveLength(0);
});
```

- [ ] **Step 2: Run unit test to verify failure**
Run: `pnpm test:unit lib/menuCategories.test.ts`
Expected: FAIL (buildCategoryTree is not defined).

- [ ] **Step 3: Implement tree helpers in `lib/menuCategories.ts` and `lib/promoTargets.ts`**
Update `lib/menuCategories.ts` with `buildCategoryTree` and `saveCategoryHierarchy`.
Create `lib/promoTargets.ts` with Supabase fetch/save functions.

- [ ] **Step 4: Run unit tests to verify pass**
Run: `pnpm test:unit lib/menuCategories.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/menuCategories.ts lib/promoTargets.ts lib/menuCategories.test.ts
git commit -m "feat: add category tree helpers and promo targets data layer"
```

