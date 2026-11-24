/**
 * Floor Layout & Table Mapping Configuration
 * รองรับทั้ง สาขา 1 (ผัง 7 โต๊ะเดิม) และ สาขา 2 รัชดา (12 ที่นั่ง: โต๊ะ 1-5 + บาร์ 1-7)
 */

export type BranchId = 'main' | 'ratchada';

export interface TableMeta {
  tableNumber: number;
  label: string;
  shortLabel: string;
  zone: 'table' | 'bar';
  capacity: number;
  capacityLabel: string;
  isBar: boolean;
}

/** ตรวจสอบว่าเป็นสาขา 2 (รัชดา) หรือไม่ */
export function isRatchadaBranch(): boolean {
  if (typeof process !== 'undefined') {
    if (process.env.NEXT_PUBLIC_BRANCH === 'ratchada') return true;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (url.includes('ilgcpnebszmzwmrpqdaa') || url.includes('ratchada')) return true;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('ratchada')) return true;
  }
  return false;
}

// =============================================================
// ข้อมูลโต๊ะ สาขา 1 (Main) — 7 โต๊ะมาตรฐาน
// =============================================================
export const MAIN_TABLE_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;

export const MAIN_TABLE_METAS: Record<number, TableMeta> = {
  1: { tableNumber: 1, label: 'โต๊ะ 1', shortLabel: 'โต๊ะ 1', zone: 'table', capacity: 4, capacityLabel: '4 ที่นั่ง', isBar: false },
  2: { tableNumber: 2, label: 'โต๊ะ 2', shortLabel: 'โต๊ะ 2', zone: 'table', capacity: 4, capacityLabel: '4 ที่นั่ง', isBar: false },
  3: { tableNumber: 3, label: 'โต๊ะ 3', shortLabel: 'โต๊ะ 3', zone: 'table', capacity: 4, capacityLabel: '4 ที่นั่ง', isBar: false },
  4: { tableNumber: 4, label: 'โต๊ะ 4', shortLabel: 'โต๊ะ 4', zone: 'table', capacity: 4, capacityLabel: '4 ที่นั่ง', isBar: false },
  5: { tableNumber: 5, label: 'โต๊ะ 5', shortLabel: 'โต๊ะ 5', zone: 'table', capacity: 4, capacityLabel: '4 ที่นั่ง', isBar: false },
  6: { tableNumber: 6, label: 'โต๊ะ 6', shortLabel: 'โต๊ะ 6', zone: 'table', capacity: 4, capacityLabel: '4 ที่นั่ง', isBar: false },
  7: { tableNumber: 7, label: 'โต๊ะ 7', shortLabel: 'โต๊ะ 7', zone: 'table', capacity: 4, capacityLabel: '4 ที่นั่ง', isBar: false },
};

// =============================================================
// ข้อมูลโต๊ะ สาขา 2 (Ratchada) — 12 จุดบริการ
// แบบที่ 1: โต๊ะ 1-5 (โต๊ะอาหาร) + บาร์ 1-7 (เคาน์เตอร์บาร์)
// =============================================================
export const RATCHADA_TABLE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const RATCHADA_DINING_TABLES = [1, 2, 3, 4, 5] as const;
export const RATCHADA_BAR_TABLES = [6, 7, 8, 9, 10, 11, 12] as const;

export const RATCHADA_TABLE_METAS: Record<number, TableMeta> = {
  1: { tableNumber: 1, label: 'โต๊ะ 1', shortLabel: 'โต๊ะ 1', zone: 'table', capacity: 4, capacityLabel: '4 ที่นั่ง', isBar: false },
  2: { tableNumber: 2, label: 'โต๊ะ 2', shortLabel: 'โต๊ะ 2', zone: 'table', capacity: 4, capacityLabel: '4 ที่นั่ง', isBar: false },
  3: { tableNumber: 3, label: 'โต๊ะ 3', shortLabel: 'โต๊ะ 3', zone: 'table', capacity: 2, capacityLabel: '2 ที่นั่ง', isBar: false },
  4: { tableNumber: 4, label: 'โต๊ะ 4', shortLabel: 'โต๊ะ 4', zone: 'table', capacity: 4, capacityLabel: '4 ที่นั่ง', isBar: false },
  5: { tableNumber: 5, label: 'โต๊ะ 5', shortLabel: 'โต๊ะ 5', zone: 'table', capacity: 4, capacityLabel: '4 ที่นั่ง', isBar: false },
  6: { tableNumber: 6, label: 'บาร์ 1', shortLabel: 'บาร์ 1', zone: 'bar', capacity: 1, capacityLabel: '1 ที่นั่ง', isBar: true },
  7: { tableNumber: 7, label: 'บาร์ 2', shortLabel: 'บาร์ 2', zone: 'bar', capacity: 1, capacityLabel: '1 ที่นั่ง', isBar: true },
  8: { tableNumber: 8, label: 'บาร์ 3', shortLabel: 'บาร์ 3', zone: 'bar', capacity: 1, capacityLabel: '1 ที่นั่ง', isBar: true },
  9: { tableNumber: 9, label: 'บาร์ 4', shortLabel: 'บาร์ 4', zone: 'bar', capacity: 1, capacityLabel: '1 ที่นั่ง', isBar: true },
  10: { tableNumber: 10, label: 'บาร์ 5', shortLabel: 'บาร์ 5', zone: 'bar', capacity: 1, capacityLabel: '1 ที่นั่ง', isBar: true },
  11: { tableNumber: 11, label: 'บาร์ 6', shortLabel: 'บาร์ 6', zone: 'bar', capacity: 1, capacityLabel: '1 ที่นั่ง', isBar: true },
  12: { tableNumber: 12, label: 'บาร์ 7', shortLabel: 'บาร์ 7', zone: 'bar', capacity: 1, capacityLabel: '1 ที่นั่ง', isBar: true },
};

/** คืนข้อมูล Meta ของโต๊ะ */
export function getTableMeta(tableNumber: number, branch?: BranchId): TableMeta {
  const isRatchada =
    branch === 'ratchada' ||
    (branch === undefined && (tableNumber > 7 || isRatchadaBranch()));

  if (isRatchada && RATCHADA_TABLE_METAS[tableNumber]) {
    return RATCHADA_TABLE_METAS[tableNumber];
  }
  if (MAIN_TABLE_METAS[tableNumber]) {
    return MAIN_TABLE_METAS[tableNumber];
  }
  return {
    tableNumber,
    label: `โต๊ะ ${tableNumber}`,
    shortLabel: `โต๊ะ ${tableNumber}`,
    zone: 'table',
    capacity: 4,
    capacityLabel: '4 ที่นั่ง',
    isBar: false,
  };
}

/** แปลงหมายเลขโต๊ะเป็นข้อความแสดงผล (เช่น "โต๊ะ 1" หรือ "บาร์ 1") */
export function formatTableLabel(
  tableNumber: number | string | null | undefined,
  options?: { branch?: BranchId; showCapacity?: boolean }
): string {
  if (tableNumber === null || tableNumber === undefined || tableNumber === '') {
    return '';
  }

  if (typeof tableNumber === 'string') {
    if (tableNumber.includes('-') && tableNumber.length > 10) {
      return tableNumber; // UUID string
    }
    const parsed = parseInt(tableNumber, 10);
    if (!isNaN(parsed) && String(parsed) === tableNumber.trim()) {
      return formatTableLabel(parsed, options);
    }
    return tableNumber;
  }

  const num = Number(tableNumber);
  if (isNaN(num)) return String(tableNumber);

  const meta = getTableMeta(num, options?.branch);
  if (options?.showCapacity) {
    return `${meta.label} (${meta.capacityLabel})`;
  }
  return meta.label;
}

/** ตรวจสอบว่าเป็นที่นั่งเคาน์เตอร์บาร์หรือไม่ */
export function isBarTable(
  tableNumber: number | string | null | undefined,
  branch?: BranchId
): boolean {
  if (tableNumber === null || tableNumber === undefined) return false;
  const num = typeof tableNumber === 'number' ? tableNumber : parseInt(String(tableNumber), 10);
  if (isNaN(num)) return false;
  const meta = getTableMeta(num, branch);
  return meta.isBar;
}

// =============================================================
// ผังเดิม สาขา 1 (รักษาไว้ 100% ไม่กระทบ)
// =============================================================
/** ตำแหน่งโต๊ะบนผังร้าน — Kitchen เป็นป้ายทิศทาง ไม่ใช่โต๊ะ */
export const FLOOR_KITCHEN_AREA = 'kitchen';

/** grid-area name → หมายเลขโต๊ะ */
export const FLOOR_TABLE_AREAS: Record<string, number> = {
  t1: 1,
  t2: 2,
  t3: 3,
  t4: 4,
  t5: 5,
  t6: 6,
  t7: 7,
};

/**
 * ผังตามแบบร้าน (สาขา 1):
 *   Kitchen (เต็มแถว)
 *   2 | 1 (กว้าง 2 ช่อง)
 *   3 |
 *   4 |
 *   5 | 6 | 7
 */
export const FLOOR_GRID_TEMPLATE_AREAS = `
  "kitchen kitchen kitchen"
  "t2 t1 t1"
  "t3 . ."
  "t4 . ."
  "t5 t6 t7"
`;

export const FLOOR_TABLE_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;
