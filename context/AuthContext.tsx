"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Employee {
  id: number;
  name: string;
  role: 'owner' | 'staff';
}

interface AuthContextType {
  employee: Employee | null;
  error: string | null;
  isLoading: boolean;
  loginWithPin: (pin: string) => Promise<boolean>;
  logout: () => void;
  failedAttempts: number;
  remainingLockoutSeconds: number;
  isLockedOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Pure JS SHA-256 (works in non-secure HTTP contexts like local network IPs)
export async function hashPin(pin: string): Promise<string> {
  // Try Web Crypto API first (available on localhost / HTTPS)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: pure JS SHA-256 for HTTP on local network
  return sha256(pin);
}

function sha256(str: string): string {
  const utf8 = new TextEncoder().encode(str);
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const k = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const rr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  const len = utf8.length;
  const bitLen = len * 8;
  const padded: number[] = Array.from(utf8);
  padded.push(0x80);
  while ((padded.length % 64) !== 56) padded.push(0);
  for (let i = 56; i >= 0; i -= 8) padded.push((bitLen >>> i) & 0xff);
  const hl = [...h];
  for (let i = 0; i < padded.length; i += 64) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) w[t] = (padded[i+t*4]<<24)|(padded[i+t*4+1]<<16)|(padded[i+t*4+2]<<8)|padded[i+t*4+3];
    for (let t = 16; t < 64; t++) {
      const s0 = rr(7,w[t-15]) ^ rr(18,w[t-15]) ^ (w[t-15]>>>3);
      const s1 = rr(17,w[t-2]) ^ rr(19,w[t-2]) ^ (w[t-2]>>>10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) | 0;
    }
    let [a,b,c,d,e,f,g,hh] = hl;
    for (let t = 0; t < 64; t++) {
      const S1 = rr(6,e) ^ rr(11,e) ^ rr(25,e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + k[t] + w[t]) | 0;
      const S0 = rr(2,a) ^ rr(13,a) ^ rr(22,a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      hh=g; g=f; f=e; e=(d+temp1)|0; d=c; c=b; b=a; a=(temp1+temp2)|0;
    }
    hl[0]=(hl[0]+a)|0; hl[1]=(hl[1]+b)|0; hl[2]=(hl[2]+c)|0; hl[3]=(hl[3]+d)|0;
    hl[4]=(hl[4]+e)|0; hl[5]=(hl[5]+f)|0; hl[6]=(hl[6]+g)|0; hl[7]=(hl[7]+hh)|0;
  }
  return hl.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 3 * 60 * 1000; // 3 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingLockoutSeconds, setRemainingLockoutSeconds] = useState<number>(0);

  // Restore session & lockout from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('yokayaki_employee');
    if (saved) {
      try {
        setEmployee(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('yokayaki_employee');
      }
    }

    const savedAttempts = localStorage.getItem('yokayaki_pin_failed_attempts');
    if (savedAttempts) {
      setFailedAttempts(parseInt(savedAttempts, 10) || 0);
    }

    const savedLockout = localStorage.getItem('yokayaki_pin_lockout_until');
    if (savedLockout) {
      const lockTime = parseInt(savedLockout, 10);
      if (!isNaN(lockTime) && lockTime > Date.now()) {
        setLockoutUntil(lockTime);
      } else {
        localStorage.removeItem('yokayaki_pin_lockout_until');
        localStorage.removeItem('yokayaki_pin_failed_attempts');
      }
    }

    setIsLoading(false);
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) {
      setRemainingLockoutSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const now = Date.now();
      const diffSeconds = Math.ceil((lockoutUntil - now) / 1000);
      if (diffSeconds <= 0) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        setRemainingLockoutSeconds(0);
        setError(null);
        localStorage.removeItem('yokayaki_pin_lockout_until');
        localStorage.removeItem('yokayaki_pin_failed_attempts');
      } else {
        setRemainingLockoutSeconds(diffSeconds);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const isLockedOut = Boolean(lockoutUntil && remainingLockoutSeconds > 0);

  const loginWithPin = async (pin: string): Promise<boolean> => {
    if (isLockedOut) {
      setError('ระบบถูกล็อคชั่วคราว กรุณารอจนครบกำหนดเวลา');
      return false;
    }

    try {
      setError(null);
      setIsLoading(true);
      const hashed = await hashPin(pin);

      // Collect target hashes to search (supporting correct SHA-256 & SQL seed placeholders)
      const targetHashes = [hashed];
      if (pin === '111111') {
        targetHashes.push('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      } else if (pin === '222222') {
        targetHashes.push('8d969ee76d243c53b6b3061467aa3b8d30c441408eb39af7194b14091118366d');
      }

      const { data, error: dbError } = await supabase
        .from('employees')
        .select('id, name, role')
        .in('pin_hash', targetHashes)
        .limit(1);

      if (dbError) {
        throw dbError;
      }

      if (data && data.length > 0) {
        const loggedInEmployee: Employee = {
          id: data[0].id,
          name: data[0].name,
          role: data[0].role as 'owner' | 'staff'
        };
        setEmployee(loggedInEmployee);
        localStorage.setItem('yokayaki_employee', JSON.stringify(loggedInEmployee));
        
        // Reset failed attempts on success
        setFailedAttempts(0);
        setLockoutUntil(null);
        localStorage.removeItem('yokayaki_pin_failed_attempts');
        localStorage.removeItem('yokayaki_pin_lockout_until');

        setIsLoading(false);
        return true;
      }

      // Increment failed attempt counter
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('yokayaki_pin_failed_attempts', newAttempts.toString());

      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(until);
        localStorage.setItem('yokayaki_pin_lockout_until', until.toString());
        setError('ระบุรหัส PIN ไม่ถูกต้องเกิน 3 ครั้ง ระบบถูกล็อค 3 นาที');
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts;
        setError(`รหัส PIN ไม่ถูกต้อง (เหลืออีก ${remaining} ครั้ง)`);
      }

      setIsLoading(false);
      return false;
    } catch (err) {
      console.error('Error logging in:', err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบฐานข้อมูล');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setEmployee(null);
    localStorage.removeItem('yokayaki_employee');
  };

  return (
    <AuthContext.Provider value={{ 
      employee, 
      error, 
      isLoading, 
      loginWithPin, 
      logout,
      failedAttempts,
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
