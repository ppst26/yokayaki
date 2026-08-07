# PIN Login Rate Limiting & Lockout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 3-attempt limit for PIN login in YOKAYAKI POS, locking the user out for 3 minutes (180 seconds) with a persisted live countdown timer on the 3rd failed attempt.

**Architecture:** Extend `AuthContext.tsx` with rate limiting and lockout state management persisted to `localStorage` (`yokayaki_pin_lockout_until` and `yokayaki_pin_failed_attempts`). Update `PinPad.tsx` to handle attempt counter warnings and render a dedicated Lockout UI overlay with live countdown.

**Tech Stack:** Next.js 16 (App Router), React 19, Lucide React, LocalStorage API.

## Global Constraints
- Max attempts: 3
- Lockout time: 180 seconds (3 minutes)
- Persist lockout timestamp in `localStorage.getItem('yokayaki_pin_lockout_until')`
- Do not break existing employee PIN hashes or authentication flow

---

### Task 1: Extend AuthContext with lockout state & attempt tracking

**Files:**
- Modify: `context/AuthContext.tsx`

**Interfaces:**
- Consumes: `supabase` employee pin verification, `localStorage`
- Produces: `AuthContextType` with `failedAttempts: number`, `remainingLockoutSeconds: number`, `isLockedOut: boolean`

- [ ] **Step 1: Update AuthContextType interface and state definitions**

Modify `context/AuthContext.tsx` to export new state variables in `AuthContextType`:

```typescript
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
```

- [ ] **Step 2: Add lockout check & timer interval in AuthProvider component**

Add state and `useEffect` hook in `AuthProvider`:

```typescript
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 3 * 60 * 1000; // 3 minutes

const [failedAttempts, setFailedAttempts] = useState<number>(0);
const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
const [remainingLockoutSeconds, setRemainingLockoutSeconds] = useState<number>(0);

useEffect(() => {
  // Restore failed attempts and lockout timestamp from localStorage on mount
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
}, []);

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
```

- [ ] **Step 3: Update loginWithPin method logic to handle rate limiting**

Modify `loginWithPin` in `context/AuthContext.tsx`:

```typescript
const loginWithPin = async (pin: string): Promise<boolean> => {
  if (lockoutUntil && Date.now() < lockoutUntil) {
    setError('ระบบถูกล็อคชั่วคราว กรุณารอจนครบกำหนดเวลา');
    return false;
  }

  try {
    setError(null);
    setIsLoading(true);
    const hashed = await hashPin(pin);

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

    if (dbError) throw dbError;

    if (data && data.length > 0) {
      const loggedInEmployee: Employee = {
        id: data[0].id,
        name: data[0].name,
        role: data[0].role as 'owner' | 'staff'
      };
      setEmployee(loggedInEmployee);
      localStorage.setItem('yokayaki_employee', JSON.stringify(loggedInEmployee));
      
      // Reset lockout counter on successful login
      setFailedAttempts(0);
      setLockoutUntil(null);
      localStorage.removeItem('yokayaki_pin_failed_attempts');
      localStorage.removeItem('yokayaki_pin_lockout_until');
      setIsLoading(false);
      return true;
    }

    // Handle failed login attempt
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    localStorage.setItem('yokayaki_pin_failed_attempts', newAttempts.toString());

    if (newAttempts >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_DURATION_MS;
      setLockoutUntil(until);
      localStorage.setItem('yokayaki_pin_lockout_until', until.toString());
      setError('ใส่รหัส PIN ผิดเกิน 3 ครั้ง ระบบถูกล็อค 3 นาที');
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
```

- [ ] **Step 4: Commit AuthContext changes**

```powershell
git add context/AuthContext.tsx
git commit -m "feat: add PIN login lockout logic and attempt counter in AuthContext"
```

---

### Task 2: Implement Lockout Countdown View & Keypad Lock in PinPad.tsx

**Files:**
- Modify: `components/PinPad.tsx`

**Interfaces:**
- Consumes: `useAuth` hook (`isLockedOut`, `remainingLockoutSeconds`, `failedAttempts`)
- Produces: Lockout overlay UI with live timer and warning icon

- [ ] **Step 1: Import Timer & Shield/Lock icons in PinPad.tsx**

```typescript
import { Delete, Lock, Clock, ShieldAlert } from 'lucide-react';
```

- [ ] **Step 2: Render Lockout View when isLockedOut is true**

Add helper function to format seconds into `MM:SS`:

```typescript
const formatCountdown = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};
```

Update `PinPad.tsx` JSX render:

```tsx
if (isLockedOut) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-slate-800 p-4 font-sans relative">
      <div className="w-full max-w-md bg-white border border-red-200 rounded-3xl p-8 shadow-xl relative z-10 text-center animate-fade-in">
        <div className="w-16 h-16 bg-red-100 border border-red-200 rounded-2xl flex items-center justify-center shadow-md mx-auto mb-4 text-red-600">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-black text-slate-900 mb-1">
          ระบบถูกล็อคชั่วคราว
        </h1>
        <p className="text-slate-500 text-xs font-semibold mb-6">
          ระบุรหัส PIN ไม่ถูกต้องเกิน 3 ครั้ง เพื่อความปลอดภัย กรุณารอจนกว่านาฬิกานับถอยหลังจะหมด
        </p>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 inline-flex flex-col items-center justify-center w-full">
          <div className="flex items-center gap-2 text-red-600 text-xs font-bold uppercase tracking-wider mb-2">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>เวลาล็อคที่เหลือ</span>
          </div>
          <div className="text-4xl font-black font-mono text-red-600 tracking-wider">
            {formatCountdown(remainingLockoutSeconds)}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 font-medium">
          ระบบจะปลดล็อคและอนุญาตให้ใส่รหัส PIN อีกครั้งโดยอัตโนมัติ
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Test and verify PinPad behavior**

1. Build project (`npm run build` or inspect runtime).
2. Enter wrong PIN 3 times on localhost POS keypad.
3. Observe Lockout screen appearance and live `02:59` countdown.
4. Refresh page (`F5`) to confirm timer state persists.

- [ ] **Step 4: Commit PinPad changes**

```powershell
git add components/PinPad.tsx
git commit -m "feat: add lockout countdown UI view in PinPad"
```
