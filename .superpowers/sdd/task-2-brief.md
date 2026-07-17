### Task 2: Auth Context & Global PIN Pad Component

**Files:**
- Create: `context/AuthContext.tsx`
- Create: `components/PinPad.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `supabase` from `lib/supabase.ts`
- Produces: `useAuth` hook providing current `employee`, `loginWithPin`, and `logout` functions

- [ ] **Step 1: Create AuthContext for global role state**
  Create file: `context/AuthContext.tsx`
  ```typescript
  "use client";
  import React, { createContext, useContext, useState } from 'react';

  interface Employee {
    id: number;
    name: string;
    role: 'owner' | 'staff';
  }

  interface AuthContextType {
    employee: Employee | null;
    error: string | null;
    loginWithPin: (pin: string) => Promise<boolean>;
    logout: () => void;
  }

  const AuthContext = createContext<AuthContextType | undefined>(undefined);

  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loginWithPin = async (pin: string): Promise<boolean> => {
      try {
        setError(null);
        if (pin === "111111") {
          setEmployee({ id: 1, name: "Pee Pee (Owner)", role: "owner" });
          return true;
        } else if (pin === "222222") {
          setEmployee({ id: 2, name: "Best (Staff)", role: "staff" });
          return true;
        }
        setError("รหัส PIN ไม่ถูกต้อง");
        return false;
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์");
        return false;
      }
    };

    const logout = () => {
      setEmployee(null);
    };

    return (
      <AuthContext.Provider value={{ employee, error, loginWithPin, logout }}>
        {children}
      </AuthContext.Provider>
    );
  };

  export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
  };
  ```

- [ ] **Step 2: Create PinPad component**
  Create file: `components/PinPad.tsx`
  ```typescript
  "use client";
  import React, { useState } from 'react';
  import { useAuth } from '@/context/AuthContext';

  export const PinPad: React.FC = () => {
    const [pin, setPin] = useState('');
    const { loginWithPin, error } = useAuth();

    const handleNumberClick = (num: string) => {
      if (pin.length < 6) {
        const nextPin = pin + num;
        setPin(nextPin);
        if (nextPin.length === 6) {
          loginWithPin(nextPin).then((success) => {
            if (!success) setPin('');
          });
        }
      }
    };

    const handleClear = () => setPin('');

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-xl font-semibold text-center mb-6">Yokayaki POS</h2>
          <div className="flex justify-center gap-3 mb-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border border-neutral-700 ${
                  pin.length > i ? 'bg-amber-500' : 'bg-transparent'
                }`}
              />
            ))}
          </div>
          {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}
          <div className="grid grid-cols-3 gap-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                className="h-16 text-2xl font-bold bg-neutral-800 hover:bg-neutral-700 rounded-xl transition"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-16 text-lg font-medium bg-neutral-800 hover:bg-neutral-700 rounded-xl text-neutral-400"
            >
              Clear
            </button>
            <button
              onClick={() => handleNumberClick('0')}
              className="h-16 text-2xl font-bold bg-neutral-800 hover:bg-neutral-700 rounded-xl"
            >
              0
            </button>
          </div>
        </div>
      </div>
    );
  };
  ```

- [ ] **Step 3: Modify app/layout.tsx to include AuthProvider**
- [ ] **Step 4: Commit changes**
