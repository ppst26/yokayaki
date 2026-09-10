/**
 * สลับธีม light/dark แบบมี motion
 *
 * เส้นทางหลัก : View Transitions API — snapshot จอเดิมค้างไว้ แล้วเผยจอใหม่
 *               ผ่านวงกลมขอบฟุ้งที่แผ่ออกจากจุดที่นิ้วแตะ (`--theme-ray-*`)
 * เส้นทางรอง  : เบราว์เซอร์ที่ไม่มี startViewTransition (Firefox/Safari เก่า)
 *               ใส่คลาส `theme-fading` ให้ทุก element ค่อยๆ ไล่สีแทน
 * ปิด motion   : เคารพ prefers-reduced-motion — สลับทันทีไม่มีอนิเมชัน
 */

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'yokayaki_theme';

/** ต้องตรงกับ duration ใน globals.css (.theme-switching / .theme-fading) */
const REVEAL_DURATION_MS = 620;
const FADE_DURATION_MS = 460;

let fadeTimer: ReturnType<typeof setTimeout> | null = null;

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** อ่านธีมที่บันทึกไว้ — default เป็น dark ให้ตรงกับ script ใน layout */
export const readStoredTheme = (): Theme => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

/** สับ class + บันทึกลง localStorage (ไม่มี motion) */
export const applyTheme = (theme: Theme): void => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* โหมด private / storage เต็ม — ธีมยังเปลี่ยนได้แค่ไม่จำข้ามรอบ */
  }
};

const runFadeFallback = (theme: Theme): void => {
  const root = document.documentElement;
  if (fadeTimer) clearTimeout(fadeTimer);
  root.classList.add('theme-fading');
  applyTheme(theme);
  fadeTimer = setTimeout(() => {
    root.classList.remove('theme-fading');
    fadeTimer = null;
  }, FADE_DURATION_MS + 60);
};

export interface SwitchThemeOptions {
  /** จุดกึ่งกลางที่ให้วงกลมแผ่ออก (พิกัด viewport) — ไม่ส่ง = กลางจอ */
  origin?: { x: number; y: number };
  /**
   * งาน DOM อื่นที่ต้องเปลี่ยนพร้อมธีม (เช่น flushSync ของ React state)
   * ถูกเรียกภายใน callback ของ view transition เพื่อให้เข้า snapshot ใหม่รอบเดียวกัน
   */
  apply?: () => void;
}

/** สลับธีมพร้อม motion */
export const switchTheme = (theme: Theme, options: SwitchThemeOptions = {}): void => {
  if (typeof document === 'undefined') return;

  const { origin, apply } = options;

  const root = document.documentElement;
  const doc = document as ViewTransitionDocument;

  if (prefersReducedMotion()) {
    apply?.();
    applyTheme(theme);
    return;
  }

  if (typeof doc.startViewTransition !== 'function') {
    apply?.();
    runFadeFallback(theme);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  // รัศมีที่ใหญ่พอคลุมมุมจอที่ไกลที่สุดจากจุดกด
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  root.style.setProperty('--theme-ray-x', `${x}px`);
  root.style.setProperty('--theme-ray-y', `${y}px`);
  root.style.setProperty('--theme-ray-r', `${Math.ceil(radius)}px`);
  root.style.setProperty('--theme-ray-duration', `${REVEAL_DURATION_MS}ms`);
  root.classList.add('theme-switching');

  const transition = doc.startViewTransition(() => {
    apply?.();
    applyTheme(theme);
  });

  transition.finished
    .catch(() => undefined)
    .finally(() => {
      root.classList.remove('theme-switching');
    });
};
