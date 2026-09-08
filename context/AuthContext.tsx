"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { setStaffToken } from '@/lib/staffToken';
import { unlockAudio } from '@/lib/audioNotifier';
import type { EmployeeRole } from '@/lib/permissions';

export interface Employee {
  id: number;
  name: string;
  role: EmployeeRole;
}

interface AuthContextType {
  employee: Employee | null;
  error: string | null;
  /** กำลังกู้ session ตอนเปิดแอป — ใช้โชว์หน้าจอโหลดเต็มจอ */
  isRestoring: boolean;
  /** กำลังยืนยัน PIN — อย่าใช้แทน isRestoring (จะเด้งหน้าจอดำ) */
  isPinLoading: boolean;
  /** @deprecated ใช้ isRestoring — คงไว้เพื่อไม่พังโค้ดเก่า */
  isLoading: boolean;
  orgAuthenticated: boolean;
  orgError: string | null;
  isOrgLoading: boolean;
  loginWithPin: (pin: string) => Promise<boolean>;
  loginWithOrg: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  remainingLockoutSeconds: number;
  isLockedOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 นาที auto-lock

// =============================================================
// การยืนยันตัวตนทั้งหมดเกิดที่ /api/auth/* ฝั่ง server
//
// เดิม: browser คำนวณ SHA-256 ของ PIN แล้ว query .eq('pin_hash', hash) ตรงไปที่ DB
//       → ตาราง employees ต้องเปิด SELECT ให้ anon และกลายเป็น PIN oracle ยิงเดาได้ (A2)
// ตอนนี้: PIN ถูกส่งไป server ผ่าน HTTPS แล้ว verify ใน DB ด้วย bcrypt
//         hash ไม่เคยออกจากฐานข้อมูล และ employees ไม่มี SELECT policy อีกต่อไป
// =============================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(true);
  const [isPinLoading, setIsPinLoading] = useState<boolean>(false);
  const [orgAuthenticated, setOrgAuthenticated] = useState<boolean>(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [isOrgLoading, setIsOrgLoading] = useState<boolean>(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingLockoutSeconds, setRemainingLockoutSeconds] = useState<number>(0);

  // กู้ session จาก cookie httpOnly (JS อ่าน cookie เองไม่ได้ ต้องถาม server)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [orgRes, staffRes] = await Promise.all([
          fetch('/api/auth/org-session', { cache: 'no-store' }),
          fetch('/api/auth/session', { cache: 'no-store' }),
        ]);
        const orgData = await orgRes.json();
        const staffData = await staffRes.json();

        if (cancelled) return;

        if (orgData?.authenticated) {
          setOrgAuthenticated(true);
        }

        if (staffData?.employee && staffData?.token) {
          setStaffToken(staffData.token);
          setEmployee(staffData.employee as Employee);
        }
      } catch (err) {
        console.error('Error restoring session:', err);
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // นับถอยหลังช่วงล็อก (ตัวเลขต้นทางมาจาก server — ลบ localStorage ไม่ช่วยปลดล็อก)
  useEffect(() => {
    if (!lockoutUntil) {
      setRemainingLockoutSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const diffSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (diffSeconds <= 0) {
        setLockoutUntil(null);
        setRemainingLockoutSeconds(0);
        setError(null);
      } else {
        setRemainingLockoutSeconds(diffSeconds);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const isLockedOut = Boolean(lockoutUntil && remainingLockoutSeconds > 0);

  const loginWithOrg = async (email: string, password: string): Promise<boolean> => {
    try {
      setOrgError(null);
      setIsOrgLoading(true);

      const res = await fetch('/api/auth/org-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data?.ok) {
        setOrgAuthenticated(true);
        return true;
      }

      setOrgError(data?.error ?? 'เข้าสู่ระบบองค์กรไม่สำเร็จ');
      return false;
    } catch (err) {
      console.error('Error logging in org:', err);
      setOrgError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
      return false;
    } finally {
      setIsOrgLoading(false);
    }
  };

  const loginWithPin = async (pin: string): Promise<boolean> => {
    if (isLockedOut) {
      setError('ระบบถูกล็อคชั่วคราว กรุณารอจนครบกำหนดเวลา');
      return false;
    }

    try {
      setError(null);
      setIsPinLoading(true);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (res.ok && data?.employee && data?.token) {
        setStaffToken(data.token);
        setEmployee(data.employee as Employee);
        setLockoutUntil(null);
        return true;
      }

      if (res.status === 429 && typeof data?.lockedSeconds === 'number') {
        setLockoutUntil(Date.now() + data.lockedSeconds * 1000);
      }

      setError(data?.error ?? 'รหัส PIN ไม่ถูกต้อง');
      return false;
    } catch (err) {
      console.error('Error logging in:', err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
      return false;
    } finally {
      setIsPinLoading(false);
    }
  };

  const logout = useCallback(() => {
    setEmployee(null);
    setStaffToken(null);
    void fetch('/api/auth/logout', { method: 'POST' }).catch(err =>
      console.error('Error logging out:', err)
    );
  }, []);

  // Auto-lock: ออกจากระบบเมื่อไม่มีการใช้งาน 5 นาที
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      logout();
    }, IDLE_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    if (!employee) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    resetIdleTimer();

    const activityEvents: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      unlockAudio();
      resetIdleTimer();
    };

    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
  }, [employee, resetIdleTimer]);

  return (
    <AuthContext.Provider value={{
      employee,
      error,
      isRestoring,
      isPinLoading,
      isLoading: isRestoring,
      orgAuthenticated,
      orgError,
      isOrgLoading,
      loginWithPin,
      loginWithOrg,
      logout,
      remainingLockoutSeconds,
      isLockedOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
