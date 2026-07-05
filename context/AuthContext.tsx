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
