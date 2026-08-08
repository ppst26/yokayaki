# Customer Check Bill Button Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the "เรียกเช็คบิล / ชำระเงิน" button on the Customer Order Portal when food items are still being prepared in the kitchen.

**Architecture:** Evaluate `pendingCount` (`orderedItems.filter(i => i.status === 'pending').length`) in `app/customer/[session_id]/page.tsx`. If `pendingCount > 0`, disable the check bill button and render "กรุณารออาหารเสริฟครบ ก่อนเรียกเช็คบิล".

**Tech Stack:** React 19, Next.js 16, TailwindCSS 4, Lucide React (`Clock`, `BellRing`).

## Global Constraints

- When `pendingCount > 0`, button is disabled with text "กรุณารออาหารเสริฟครบ ก่อนเรียกเช็คบิล".
- When `pendingCount === 0`, button is enabled with "เรียกเช็คบิล / ชำระเงิน".

---

### Task 1: Update Check Bill Button in Customer Portal

**Files:**
- Modify: `app/customer/[session_id]/page.tsx:788-796`

**Interfaces:**
- Consumes: `orderedItems`, `tableStatus`, `pendingCount`
- Produces: Conditional disabled state for check bill button.

- [ ] **Step 1: Update button rendering logic in `app/customer/[session_id]/page.tsx`**

Modify `app/customer/[session_id]/page.tsx` around line 788:

```tsx
                        ) : pendingCount > 0 ? (
                          <button
                            disabled
                            className="w-full py-3.5 bg-slate-200 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 font-extrabold text-xs sm:text-sm rounded-2xl border border-slate-300 dark:border-neutral-700 flex items-center justify-center gap-2 cursor-not-allowed shadow-none"
                          >
                            <Clock className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                            <span>กรุณารออาหารเสริฟครบ ก่อนเรียกเช็คบิล</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowCheckBillConfirm(true)}
                            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-red-600/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <BellRing className="w-5 h-5 animate-bounce" />
                            <span>เรียกเช็คบิล / ชำระเงิน</span>
                          </button>
                        )}
```

- [ ] **Step 2: Run type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

---

### Task 2: Build Verification

- [ ] **Step 1: Build Next.js project**

Run: `pnpm run build`
Expected: Build succeeds with 0 errors.
