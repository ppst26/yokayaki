"use client";
import { useAuth } from '@/context/AuthContext';
import { PinPad } from '@/components/PinPad';
import { TableMap } from '@/components/TableMap';

export default function Home() {
  const { employee, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-stone-400 font-medium text-xs tracking-wider animate-pulse">กำลังโหลดระบบ...</p>
      </div>
    );
  }

  if (!employee) {
    return <PinPad />;
  }

  return <TableMap />;
}
