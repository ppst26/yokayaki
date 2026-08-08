import React from 'react';
import { Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface VoidLog {
  id: number;
  employee_name: string;
  menu_name: string;
  quantity: number;
  total_amount: number;
  reason: string;
  restored_stock: boolean;
  created_at: string;
}

interface VoidLogsTableProps {
  voidLogs: VoidLog[];
  voidLoading: boolean;
  formatTime: (dateStr: string) => string;
}

export const VoidLogsTable: React.FC<VoidLogsTableProps> = ({
  voidLogs,
  voidLoading,
  formatTime,
}) => {
  if (voidLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (voidLogs.length === 0) {
    return (
      <Card className="text-center py-16 p-8">
        <Trash2 className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">
          ไม่มีประวัติการ Void รายการในวันนี้
        </p>
      </Card>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>เวลา</TableHead>
          <TableHead>รายการอาหาร</TableHead>
          <TableHead className="text-center">จำนวน</TableHead>
          <TableHead className="text-right">มูลค่า Void</TableHead>
          <TableHead>เหตุผลในการ Void</TableHead>
          <TableHead>ผู้ทำรายการ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {voidLogs.map(log => (
          <TableRow key={log.id}>
            <TableCell className="text-table-meta">{formatTime(log.created_at)} น.</TableCell>
            <TableCell className="font-extrabold text-slate-900 dark:text-neutral-100 text-table-cell">{log.menu_name}</TableCell>
            <TableCell className="text-center font-bold text-table-cell">{log.quantity}</TableCell>
            <TableCell className="text-right text-table-value text-rose-600 dark:text-rose-400">
              {Number(log.total_amount).toLocaleString()} ฿
            </TableCell>
            <TableCell>
              <span className="bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2.5 py-1 rounded-md text-badge">
                {log.reason}
              </span>
            </TableCell>
            <TableCell className="text-table-cell">{log.employee_name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
