# Solid Active Menu Badges Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update menu items and category/date filter badges to use borderless transparent inactive states and bold solid red active states (`bg-red-600 text-white shadow-md shadow-red-600/25`).

**Architecture:** Modify `SidebarNav.tsx`, `DateFilterBar.tsx`, `MenuManager.tsx`, `SalesHistory.tsx`.

**Tech Stack:** React 19, Lucide React, TailwindCSS.

---

### Task 1: Update SidebarNav.tsx Active & Inactive Item Styles

**Files:**
- Modify: `components/common/SidebarNav.tsx`

- [ ] **Step 1: Update Active & Inactive button classes in Desktop sidebar & Mobile drawer**

Active: `bg-red-600 text-white font-extrabold shadow-md shadow-red-600/25`  
Inactive: `text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60`

- [ ] **Step 2: Update Active & Inactive button classes in Mobile Bottom Nav**

Active: `bg-red-600 text-white font-extrabold shadow-sm shadow-red-600/30`  
Inactive: `text-zinc-500 dark:text-zinc-400 font-bold hover:text-zinc-800`

---

### Task 2: Update Filter Badges in DateFilterBar, MenuManager, SalesHistory

**Files:**
- Modify: `components/dashboard/DateFilterBar.tsx`
- Modify: `components/menu/MenuManager.tsx`
- Modify: `components/sales/SalesHistory.tsx`

- [ ] **Step 1: Update DateFilterBar badges**
- [ ] **Step 2: Update MenuManager category badges**
- [ ] **Step 3: Update SalesHistory range buttons**

---

### Task 3: Verify and Commit

- [ ] **Step 1: Run `npx tsc --noEmit` to verify type safety**
- [ ] **Step 2: Commit all changes**
