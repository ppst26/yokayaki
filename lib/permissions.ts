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
  history: ['owner', 'manager', 'accountant', 'cashier', 'kitchen'],
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

const SALES_READ_ROLES: EmployeeRole[] = ['owner', 'manager', 'accountant'];

/** อ่าน payments / KPI ยอดขายรวมร้าน */
export function canReadSales(role: EmployeeRole): boolean {
  return SALES_READ_ROLES.includes(role);
}
