"use client";
import { useAuth } from '@/context/AuthContext';
import { PinPad } from '@/components/PinPad';
import { TableMap } from '@/components/TableMap';

export default function Home() {
  const { employee } = useAuth();

  if (!employee) {
    return <PinPad />;
  }

  return <TableMap />;
}
