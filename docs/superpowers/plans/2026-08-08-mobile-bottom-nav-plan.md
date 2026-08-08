# Mobile Bottom Navigation Bar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sticky Mobile Bottom Navigation Bar (`md:hidden fixed bottom-0 inset-x-0`) in `SidebarNav.tsx` and adjust main content bottom padding in `TableMap.tsx`.

**Architecture:** Update `SidebarNav.tsx` JSX to include a fixed bottom nav container on mobile views, offering 1-tap tab switching to Table Map, Kitchen, Sales History, and More Drawer.

**Tech Stack:** React 19, Lucide React icons, TailwindCSS.

---

### Task 1: Add Mobile Bottom Navigation Bar to SidebarNav.tsx

**Files:**
- Modify: `components/common/SidebarNav.tsx`

- [ ] **Step 1: Implement fixed Mobile Bottom Nav Bar JSX**

Add `fixed bottom-0 inset-x-0 z-40 md:hidden` container with items: Table Map, Kitchen, Order History, More Menu.

---

### Task 2: Adjust Main Layout Padding in TableMap.tsx

**Files:**
- Modify: `components/common/TableMap.tsx`

- [ ] **Step 1: Add `pb-24 md:pb-8` to `<main>` in `TableMap.tsx`**

---

### Task 3: Verify and Commit

- [ ] **Step 1: Run `npx tsc --noEmit` to verify type safety**
- [ ] **Step 2: Commit changes**
