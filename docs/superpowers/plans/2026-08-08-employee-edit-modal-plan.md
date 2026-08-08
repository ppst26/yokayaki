# Employee Edit Modal Refactoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `EmployeeManager.tsx` to consolidate employee editing into a single Edit button (`[ ✏️ แก้ไข ]`) per card and a unified Edit Modal.

**Architecture:** Modify `ModalType` to `'add' | 'edit' | 'delete' | null`, add edit form state (`editName`, `editRole`, `editPin`, `editPinConfirm`), update card action buttons, build unified Edit Modal, and handle atomic update via `update_employee` RPC.

**Tech Stack:** React 19, Supabase JS client, Lucide React icons.

---

### Task 1: Refactor EmployeeManager.tsx State, Action Buttons, and Unified Edit Modal

**Files:**
- Modify: `components/EmployeeManager.tsx`

- [ ] **Step 1: Update ModalType and state variables in EmployeeManager.tsx**

Update `ModalType`:
```tsx
type ModalType = 'add' | 'edit' | 'delete' | null;
```

Add/update edit form state:
```tsx
const [editName, setEditName] = useState('');
const [editRole, setEditRole] = useState<'staff' | 'owner'>('staff');
const [editPin, setEditPin] = useState('');
const [editPinConfirm, setEditPinConfirm] = useState('');
const [showEditPin, setShowEditPin] = useState(false);
```

- [ ] **Step 2: Update openModal helper**

```tsx
const openModal = (type: ModalType, emp?: Employee) => {
  resetModal();
  setActiveModal(type);
  if (emp) {
    setTargetEmployee(emp);
    if (type === 'edit') {
      setEditName(emp.name);
      setEditRole(emp.role);
    }
  }
};
```

- [ ] **Step 3: Add handleEditEmployee unified action handler**

Handle updating name, role, and optional PIN in a single operation.

- [ ] **Step 4: Simplify action buttons on Employee Cards**

Replace 4 buttons with 2 buttons on line 406+:
```tsx
<div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
  <button
    onClick={() => openModal('edit', emp)}
    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700/80 text-slate-700 dark:text-neutral-200 hover:text-red-600 dark:hover:text-red-400 rounded-xl text-[11px] font-bold transition active:scale-95 border border-slate-200 dark:border-neutral-700 hover:border-red-200 dark:hover:border-red-900/50 shadow-2xs cursor-pointer"
  >
    <Pencil className="w-3 h-3 text-slate-400" />
    แก้ไข
  </button>
  {!isSelf && (
    <button
      onClick={() => openModal('delete', emp)}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-bold transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer"
    >
      <Trash2 className="w-3 h-3 text-white" />
      ลบ
    </button>
  )}
</div>
```

- [ ] **Step 5: Render Unified Edit Employee Modal**

Build unified Edit Modal for name, role, and optional PIN.

- [ ] **Step 6: Verify and Commit**

Verify build, test modal behavior, and commit changes.
