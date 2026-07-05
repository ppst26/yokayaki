"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';

interface Table {
  id: number;
  status: 'vacant' | 'occupied' | 'checking_out';
}

export const TableMap: React.FC = () => {
  const { employee, logout } = useAuth();
  const [tables, setTables] = useState<Table[]>([
    { id: 1, status: 'vacant' },
    { id: 2, status: 'vacant' },
    { id: 3, status: 'vacant' },
    { id: 4, status: 'vacant' },
  ]);

  // Handle Auto-lock 5 minutes
  useEffect(() => {
    let timeout = setTimeout(logout, 5 * 60 * 1000);
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(logout, 5 * 60 * 1000);
    };
    window.addEventListener('click', resetTimer);
    window.addEventListener('keypress', resetTimer);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('keypress', resetTimer);
    };
  }, [logout]);

  const toggleTable = (id: number) => {
    setTables(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'vacant' ? 'occupied' : t.status === 'occupied' ? 'checking_out' : 'vacant';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <header className="flex justify-between items-center mb-10 pb-6 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">YOKAYAKI MAP</h1>
          <p className="text-sm text-neutral-400">พนักงานผู้ใช้งาน: {employee?.name} ({employee?.role.toUpperCase()})</p>
        </div>
        <button onClick={logout} className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-4 py-2 rounded-xl transition">
          <LogOut size={18} />
          สลับพนักงาน
        </button>
      </header>

      <main className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
        {tables.map(table => (
          <button
            key={table.id}
            onClick={() => toggleTable(table.id)}
            className={`h-48 rounded-2xl border flex flex-col items-center justify-center gap-3 transition shadow-lg ${
              table.status === 'vacant'
                ? 'bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-green-500'
                : table.status === 'occupied'
                ? 'bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-blue-500 font-semibold'
                : 'bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-amber-500 font-bold'
            }`}
          >
            <span className="text-3xl font-extrabold">โต๊ะ {table.id}</span>
            <span className="text-xs uppercase tracking-widest px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800">
              {table.status === 'vacant' ? 'ว่าง (Vacant)' : table.status === 'occupied' ? 'มีลูกค้า (Occupied)' : 'รอเช็คบิล'}
            </span>
          </button>
        ))}
      </main>
    </div>
  );
};
