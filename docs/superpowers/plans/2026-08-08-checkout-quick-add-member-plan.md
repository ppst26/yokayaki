# Quick Add Member on Checkout Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `[ + เพิ่มสมาชิก ]` button to `CRMMemberCard.tsx` and implement a quick member registration modal in `CheckoutScreen.tsx` so new members earn points immediately upon bill payment.

**Architecture:** Update `CRMMemberCard.tsx` props to support `onOpenAddMember`, update `CheckoutScreen.tsx` to handle quick member registration with Supabase `loyalty_members` table and auto-set `member` state.

**Tech Stack:** React 19, Supabase JS client, Lucide React, TailwindCSS.

---

### Task 1: Update CRMMemberCard.tsx Header & Props

**Files:**
- Modify: `components/checkout/CRMMemberCard.tsx`

- [ ] **Step 1: Add `onOpenAddMember` prop and `[ + เพิ่มสมาชิก ]` button in card header**

---

### Task 2: Implement Quick Add Member Modal in CheckoutScreen.tsx

**Files:**
- Modify: `components/checkout/CheckoutScreen.tsx`

- [ ] **Step 1: Add Add Member modal state and registration logic in CheckoutScreen.tsx**
- [ ] **Step 2: Connect Supabase insert & auto-select member state**

---

### Task 3: Verify and Commit

- [ ] **Step 1: Run `npx tsc --noEmit` to verify type safety**
- [ ] **Step 2: Commit all changes**
