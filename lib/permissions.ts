import type { NavTab } from '@/components/common/SidebarNav';

export type EmployeeRole = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'accountant';

export const EMPLOYEE_ROLES: EmployeeRole[] = [
  'owner',
  'manager',
  'cashier',
  'kitchen',
  'accountant',
];

const TAB_MATRIX: Record<NavTab, EmployeeRole[]> = {
  floor: ['owner', 'manager', 'cashier'],
  kitchen: ['owner', 'manager', 'cashier', 'kitchen'],
  history: ['owner', 'manager', 'accountant'],
  stock: ['owner', 'manager'],
  menu: ['owner', 'manager'],
  promo: ['owner', 'manager'],
  dashboard: ['owner', 'manager', 'accountant'],
  loyalty: ['owner', 'manager'],
  employees: ['owner', 'manager'],
};

export function canAccessTab(role: EmployeeRole, tab: NavTab): boolean {
  return TAB_MATRIX[tab]?.includes(role) ?? false;
}
