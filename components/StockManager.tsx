"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Loader2, CheckCircle, Trash2, Pencil, X, Calendar, DollarSign, AlertTriangle, ChevronRight, ArrowLeft, ShoppingCart, ChevronDown } from 'lucide-react';

interface IngredientPurchase {
  id?: number;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  purchase_date: string;
  buyer_name: string;
  created_at?: string;
}

// รายการจัดซื้อจัดกลุ่มตามวันที่
interface DailyGroup {
  date: string; // YYYY-MM-DD
  items: IngredientPurchase[];
  totalCost: number;
  itemCount: number;
  buyers: string[];
}

const EMPTY_FORM: Omit<IngredientPurchase, 'id'> = {
  name: '',
  quantity: 1,
  unit: 'กก.',
  cost: 0,
  purchase_date: new Date().toISOString().split('T')[0],
  buyer_name: '',
};

type MonthFilter = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month';

// รายการวัตถุดิบเริ่มต้น (สำหรับร้านอาหารญี่ปุ่น)
const DEFAULT_INGREDIENTS = [
  'แซลมอน', 'หมูสามชั้น', 'สะโพกไก่', 'เนื้อวัว', 'กุ้ง', 'ปลาหมึก',
  'เส้นราเมง', 'เส้นอุด้ง', 'เส้นโซบะ', 'ข้าวญี่ปุ่น',
  'แป้งเกี๊ยว', 'แป้งเทมปุระ', 'เต้าหู้', 'สาหร่ายนอริ',
  'ซอสโชยุ', 'ซอสเทอริยากิ', 'มิโซะ', 'วาซาบิ', 'ขิงดอง',
  'น้ำมันงา', 'น้ำส้มสายชู', 'มิริน', 'สาเก',
  'ผักรวม', 'ต้นหอม', 'กระเทียม', 'หอมใหญ่',
  'เบียร์สด', 'น้ำแข็ง', 'ถ่าน',
];

// รายการหน่วยที่ใช้บ่อย
const DEFAULT_UNITS = [
  'กก.', 'กรัม', 'ขีด', 'ชิ้น', 'แพ็ค', 'ถุง',
  'ลิตร', 'ขวด', 'กล่อง', 'แผง', 'ถัง', 'ลัง', 'มัด',
];

export const StockManager: React.FC = () => {
  const { employee } = useAuth();
  const [purchases, setPurchases] = useState<IngredientPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('this_month');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<IngredientPurchase | null>(null);
  const [formData, setFormData] = useState<Omit<IngredientPurchase, 'id'>>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<IngredientPurchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drill-down view (หน้ารายละเอียดของวันนั้น)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Dropdown states สำหรับ Form Modal
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const [newIngredientName, setNewIngredientName] = useState('');
  const [ingredientCatalog, setIngredientCatalog] = useState<string[]>([]);
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [newUnitName, setNewUnitName] = useState('');
  const nameDropdownRef = useRef<HTMLDivElement>(null);
  const unitDropdownRef = useRef<HTMLDivElement>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  // คำนวณช่วงวันที่จาก filter
  const getDateRange = (filter: MonthFilter): { start: string; end: string } => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    switch (filter) {
      case 'today':
        return { start: todayStr, end: todayStr };

      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        return { start: yStr, end: yStr };
      }

      case 'this_week': {
        const day = now.getDay(); // 0=Sun
        const diff = day === 0 ? 6 : day - 1; // shift to Monday
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - diff);
        return {
          start: weekStart.toISOString().split('T')[0],
          end: todayStr,
        };
      }

      case 'this_month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      }

      case 'last_month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      }
    }
  };

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange(monthFilter);

      const { data, error } = await supabase
        .from('item_ingredients')
        .select('*')
        .gte('purchase_date', start)
        .lte('purchase_date', end)
        .order('purchase_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPurchases(data as IngredientPurchase[]);
    } catch (err) {
      console.error(err);
      showMessage('ไม่สามารถดึงข้อมูลต้นทุนวัตถุดิบได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ดึงรายชื่อวัตถุดิบทั้งหมดจาก DB เพื่อสร้าง catalog
  const fetchIngredientCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('item_ingredients')
        .select('name')
        .order('name');
      if (error) throw error;
      // รวม DB names + defaults ให้ไม่ซ้ำกัน
      const dbNames = (data || []).map((d: { name: string }) => d.name);
      const allNames = Array.from(new Set([...DEFAULT_INGREDIENTS, ...dbNames])).sort((a, b) => a.localeCompare(b, 'th'));
      setIngredientCatalog(allNames);
    } catch {
      // Fallback ใช้แค่ defaults
      setIngredientCatalog([...DEFAULT_INGREDIENTS].sort((a, b) => a.localeCompare(b, 'th')));
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchIngredientCatalog();
    // เมื่อเปลี่ยน filter ให้ปิด drill-down view
    setSelectedDate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter]);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nameDropdownRef.current && !nameDropdownRef.current.contains(e.target as Node)) {
        setShowNameDropdown(false);
      }
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(e.target as Node)) {
        setShowUnitDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // รายการหน่วยทั้งหมด (default + custom)
  const allUnits = useMemo(() => {
    return Array.from(new Set([...DEFAULT_UNITS, ...customUnits]));
  }, [customUnits]);

  // กรองชื่อวัตถุดิบตาม search
  const filteredCatalog = useMemo(() => {
    if (!nameSearch.trim()) return ingredientCatalog;
    const term = nameSearch.toLowerCase();
    return ingredientCatalog.filter(n => n.toLowerCase().includes(term));
  }, [ingredientCatalog, nameSearch]);

  const openCreateModal = () => {
    setEditingPurchase(null);
    setFormData({
      ...EMPTY_FORM,
      buyer_name: employee?.name || 'ไม่ระบุชื่อ',
      purchase_date: new Date().toISOString().split('T')[0],
    });
    setShowFormModal(true);
  };

  const openEditModal = (item: IngredientPurchase) => {
    setEditingPurchase(item);
    setFormData({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      cost: item.cost,
      purchase_date: item.purchase_date,
      buyer_name: item.buyer_name,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return showMessage('กรุณากรอกชื่อวัตถุดิบ', 'error');
    if (formData.quantity <= 0) return showMessage('กรุณากรอกจำนวนให้มากกว่า 0', 'error');
    if (formData.cost < 0) return showMessage('ต้นทุนไม่สามารถติดลบได้', 'error');

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        quantity: formData.quantity,
        unit: formData.unit.trim(),
        cost: formData.cost,
        purchase_date: formData.purchase_date,
        buyer_name: formData.buyer_name,
      };

      if (editingPurchase?.id) {
        const { error } = await supabase.from('item_ingredients').update(payload).eq('id', editingPurchase.id);
        if (error) throw error;
        showMessage('แก้ไขบันทึกสำเร็จ', 'success');
      } else {
        const { error } = await supabase.from('item_ingredients').insert(payload);
        if (error) throw error;
        showMessage('บันทึกวัตถุดิบใหม่สำเร็จ', 'success');
      }
      setShowFormModal(false);
      fetchPurchases();
    } catch (err) {
      console.error(err);
      showMessage('ไม่สามารถบันทึกข้อมูลได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('item_ingredients').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showMessage('ลบรายการจัดซื้อสำเร็จ', 'success');
      setDeleteTarget(null);
      fetchPurchases();
    } catch (err) {
      console.error(err);
      showMessage('ไม่สามารถลบรายการได้', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // === ค้นหา (กรองตามชื่อวัตถุดิบ) ===
  const filteredPurchases = useMemo(() => {
    if (!searchTerm.trim()) return purchases;
    const term = searchTerm.toLowerCase();
    return purchases.filter(item => item.name.toLowerCase().includes(term));
  }, [purchases, searchTerm]);

  // === จัดกลุ่มตามวันที่ ===
  const dailyGroups: DailyGroup[] = useMemo(() => {
    const grouped: Record<string, IngredientPurchase[]> = {};

    filteredPurchases.forEach(item => {
      const date = item.purchase_date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });

    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a)) // เรียงวันที่ใหม่ก่อน
      .map(date => {
        const items = grouped[date];
        const totalCost = items.reduce((sum, item) => sum + Number(item.cost), 0);
        const buyerSet = new Set(items.map(item => item.buyer_name));
        return {
          date,
          items,
          totalCost,
          itemCount: items.length,
          buyers: Array.from(buyerSet),
        };
      });
  }, [filteredPurchases]);

  // === สถิติจาก filter (คำนวณจากข้อมูลทั้งหมด ไม่ใช่จาก search) ===
  const totalCost = purchases.reduce((sum, item) => sum + Number(item.cost), 0);
  const totalPurchaseDays = new Set(purchases.map(item => item.purchase_date)).size;

  // === ข้อมูลของ Drill-down view ===
  const selectedGroup = selectedDate ? dailyGroups.find(g => g.date === selectedDate) : null;

  // === ชื่อช่วงเวลาสำหรับ filter ===
  const getFilterLabel = (filter: MonthFilter): string => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return 'วันนี้ (' + now.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) + ')';
      case 'yesterday': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return 'เมื่อวาน (' + y.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) + ')';
      }
      case 'this_week':
        return 'สัปดาห์นี้';
      case 'this_month':
        return now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      case 'last_month': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return lm.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      }
    }
  };

  // === ฟอร์แมตวันที่แสดงในตาราง ===
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateStr: string): string => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ============================================================
  // RENDER: Drill-down View (รายละเอียดของวันที่เลือก)
  // ============================================================
  if (selectedDate && selectedGroup) {
    return (
      <div className="bg-stone-950 text-white min-h-[calc(100vh-80px)] p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header — กลับ + วันที่ + ยอดรวม */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-stone-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  รายละเอียดจัดซื้อ — {formatDate(selectedDate)}
                </h2>
                <p className="text-stone-400 text-xs mt-0.5">
                  {selectedGroup.itemCount} รายการ · ยอดรวม {selectedGroup.totalCost.toLocaleString()} ฿
                </p>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-stone-400 text-xs font-medium">ยอดรวมวันนี้</div>
                <div className="text-2xl font-black text-amber-500">{selectedGroup.totalCost.toLocaleString()} ฿</div>
              </div>
              <div className="p-3 bg-amber-950/30 text-amber-400 rounded-xl border border-amber-900/25">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-stone-400 text-xs font-medium">จำนวนรายการจัดซื้อ</div>
                <div className="text-2xl font-black text-white">{selectedGroup.itemCount} รายการ</div>
              </div>
              <div className="p-3 bg-stone-800 text-stone-300 rounded-xl border border-stone-700">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                : 'bg-red-950/20 border-red-900/40 text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          {/* ตารางรายชิ้น */}
          <div className="bg-stone-900/40 border border-stone-850 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 text-xs font-bold bg-stone-900/80">
                    <th className="py-4 px-6">วัตถุดิบ</th>
                    <th className="py-4 px-4 text-center">จำนวน</th>
                    <th className="py-4 px-4 text-right">ราคา (฿)</th>
                    <th className="py-4 px-4">ผู้จัดซื้อ</th>
                    <th className="py-4 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-xs">
                  {selectedGroup.items.map(item => (
                    <tr key={item.id} className="hover:bg-stone-900/20 transition-colors">
                      <td className="py-4 px-6 font-bold text-stone-200">
                        {item.name}
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-stone-300">
                        {item.quantity} <span className="text-stone-500">{item.unit}</span>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-amber-500">
                        {Number(item.cost).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-stone-400 font-medium">
                        {item.buyer_name}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-amber-400 rounded-lg transition active:scale-95 cursor-pointer"
                            title="แก้ไข"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 bg-stone-800 hover:bg-red-950/40 border border-stone-700 hover:border-red-900/40 text-stone-400 hover:text-red-400 rounded-lg transition active:scale-95 cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Count */}
            <div className="px-5 py-3 bg-stone-900/50 border-t border-stone-850 text-xs text-stone-500 font-medium">
              ทั้งหมด {selectedGroup.itemCount} รายการ · ยอดรวม {selectedGroup.totalCost.toLocaleString()} ฿
            </div>
          </div>
        </div>

        {/* ============ CREATE/EDIT FORM MODAL ============ */}
        {showFormModal && renderFormModal()}

        {/* ============ DELETE CONFIRMATION MODAL ============ */}
        {deleteTarget && renderDeleteModal()}
      </div>
    );
  }

  // ============================================================
  // RENDER: Main View (ตารางจัดกลุ่มตามวันที่)
  // ============================================================
  return (
    <div className="bg-stone-950 text-white min-h-[calc(100vh-80px)] p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              ระบบจัดการต้นทุนวัตถุดิบ (Ingredient Cost Manager)
            </h2>
            <p className="text-stone-400 text-xs mt-1">บันทึกประวัติการจัดซื้อวัตถุดิบและคำนวณต้นทุนสะสม</p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-4 py-2.5 rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer shadow-md shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มประวัติจัดซื้อ</span>
          </button>
        </div>

        {/* Summary Cards — เปลี่ยนตาม filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-stone-400 text-xs font-medium">ต้นทุนวัตถุดิบ — {getFilterLabel(monthFilter)}</div>
              <div className="text-2xl font-black text-amber-500">{totalCost.toLocaleString()} ฿</div>
            </div>
            <div className="p-3 bg-amber-950/30 text-amber-400 rounded-xl border border-amber-900/25">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-stone-400 text-xs font-medium">จำนวนวันที่จัดซื้อ</div>
              <div className="text-2xl font-black text-white">{totalPurchaseDays} วัน</div>
            </div>
            <div className="p-3 bg-stone-800 text-stone-300 rounded-xl border border-stone-700">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters — วันนี้ / เมื่อวาน / สัปดาห์นี้ / เดือนนี้ / เดือนที่แล้ว + ช่องค้นหา */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto">
            {(['today', 'yesterday', 'this_week', 'this_month', 'last_month'] as const).map(f => (
              <button
                key={f}
                onClick={() => setMonthFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border whitespace-nowrap ${
                  monthFilter === f
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-stone-900/40 border-stone-850 text-stone-400 hover:text-white hover:bg-stone-800/50'
                }`}
              >
                {f === 'today' && 'วันนี้'}
                {f === 'yesterday' && 'เมื่อวาน'}
                {f === 'this_week' && 'สัปดาห์นี้'}
                {f === 'this_month' && 'เดือนนี้'}
                {f === 'last_month' && 'เดือนที่แล้ว'}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="ค้นหาวัตถุดิบ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
              : 'bg-red-950/20 border-red-900/40 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Table — จัดกลุ่มตามวันที่ */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-stone-900/40 border border-stone-850 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 text-xs font-bold bg-stone-900/80">
                    <th className="py-4 px-6">วันที่ซื้อ</th>
                    <th className="py-4 px-4 text-center">จำนวนรายการ</th>
                    <th className="py-4 px-4 text-right">ราคารวม (฿)</th>
                    <th className="py-4 px-4">ผู้จัดซื้อ</th>
                    <th className="py-4 px-4 text-center">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-xs">
                  {dailyGroups.map(group => (
                    <tr key={group.date} className="hover:bg-stone-900/20 transition-colors">
                      <td className="py-4 px-6 text-stone-200 font-semibold">
                        {formatDateShort(group.date)}
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-stone-300">
                        {group.itemCount} <span className="text-stone-500">อย่าง</span>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-amber-500">
                        {group.totalCost.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-stone-400 font-medium">
                        {group.buyers.join(', ')}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => setSelectedDate(group.date)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-amber-400 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                        >
                          <span>ดูรายละเอียด</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {dailyGroups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-stone-500 font-medium text-xs">
                        {searchTerm ? 'ไม่พบรายการที่ค้นหา' : 'ไม่พบรายการจัดซื้อวัตถุดิบ'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Count */}
            <div className="px-5 py-3 bg-stone-900/50 border-t border-stone-850 text-xs text-stone-500 font-medium">
              แสดง {dailyGroups.length} วัน ({filteredPurchases.length} รายการ) · ยอดรวม {totalCost.toLocaleString()} ฿
            </div>
          </div>
        )}
      </div>

      {/* ============ CREATE/EDIT FORM MODAL ============ */}
      {showFormModal && renderFormModal()}

      {/* ============ DELETE CONFIRMATION MODAL ============ */}
      {deleteTarget && renderDeleteModal()}
    </div>
  );

  // ============================================================
  // Shared Modals (ใช้ร่วมกันทั้ง Main View และ Drill-down View)
  // ============================================================

  function renderFormModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-black text-amber-500 flex items-center gap-2">
              {editingPurchase ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{editingPurchase ? 'แก้ไขบันทึกวัตถุดิบ' : 'เพิ่มบันทึกจัดซื้อวัตถุดิบ'}</span>
            </h3>
            <button onClick={() => setShowFormModal(false)} className="p-1.5 bg-stone-950 hover:bg-stone-800 rounded-full text-stone-400 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* ชื่อวัตถุดิบ — Dropdown */}
            <div ref={nameDropdownRef} className="relative">
              <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">ชื่อวัตถุดิบ *</label>
              <button
                type="button"
                onClick={() => { setShowNameDropdown(!showNameDropdown); setNameSearch(''); }}
                className={`w-full bg-stone-950 border rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between cursor-pointer transition ${
                  showNameDropdown ? 'border-amber-500/50' : 'border-stone-850 hover:border-stone-700'
                }`}
              >
                <span className={formData.name ? 'text-stone-200' : 'text-stone-600'}>
                  {formData.name || 'เลือกวัตถุดิบ...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${showNameDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showNameDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-stone-950 border border-stone-800 rounded-xl shadow-2xl overflow-hidden">
                  {/* ช่องค้นหาใน dropdown */}
                  <div className="p-2 border-b border-stone-800">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="ค้นหาวัตถุดิบ..."
                        value={nameSearch}
                        onChange={e => setNameSearch(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-8 pr-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50 placeholder-stone-600"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* รายการวัตถุดิบ */}
                  <div className="max-h-40 overflow-y-auto">
                    {filteredCatalog.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, name }));
                          setShowNameDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition cursor-pointer ${
                          formData.name === name
                            ? 'bg-amber-500/10 text-amber-400 font-bold'
                            : 'text-stone-300 hover:bg-stone-900 hover:text-white'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                    {filteredCatalog.length === 0 && (
                      <div className="px-4 py-3 text-xs text-stone-500 text-center">ไม่พบรายการ</div>
                    )}
                  </div>

                  {/* เพิ่มวัตถุดิบใหม่ */}
                  <div className="p-2 border-t border-stone-800">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="พิมพ์ชื่อวัตถุดิบใหม่..."
                        value={newIngredientName}
                        onChange={e => setNewIngredientName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newIngredientName.trim()) {
                            const trimmed = newIngredientName.trim();
                            if (!ingredientCatalog.includes(trimmed)) {
                              setIngredientCatalog(prev => [...prev, trimmed].sort((a, b) => a.localeCompare(b, 'th')));
                            }
                            setFormData(prev => ({ ...prev, name: trimmed }));
                            setNewIngredientName('');
                            setShowNameDropdown(false);
                          }
                        }}
                        className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50 placeholder-stone-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newIngredientName.trim();
                          if (trimmed) {
                            if (!ingredientCatalog.includes(trimmed)) {
                              setIngredientCatalog(prev => [...prev, trimmed].sort((a, b) => a.localeCompare(b, 'th')));
                            }
                            setFormData(prev => ({ ...prev, name: trimmed }));
                            setNewIngredientName('');
                            setShowNameDropdown(false);
                          }
                        }}
                        className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* จำนวน + หน่วย */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">จำนวน *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.quantity || ''}
                  onChange={e => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  placeholder="1"
                  className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600"
                />
              </div>
              {/* หน่วย — Dropdown */}
              <div ref={unitDropdownRef} className="relative">
                <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">หน่วย *</label>
                <button
                  type="button"
                  onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                  className={`w-full bg-stone-950 border rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between cursor-pointer transition ${
                    showUnitDropdown ? 'border-amber-500/50' : 'border-stone-850 hover:border-stone-700'
                  }`}
                >
                  <span className={formData.unit ? 'text-stone-200' : 'text-stone-600'}>
                    {formData.unit || 'เลือกหน่วย...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${showUnitDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showUnitDropdown && (
                  <div className="absolute z-20 mt-1 w-full bg-stone-950 border border-stone-800 rounded-xl shadow-2xl overflow-hidden">
                    {/* รายการหน่วย */}
                    <div className="max-h-40 overflow-y-auto">
                      {allUnits.map(unit => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, unit }));
                            setShowUnitDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs transition cursor-pointer ${
                            formData.unit === unit
                              ? 'bg-amber-500/10 text-amber-400 font-bold'
                              : 'text-stone-300 hover:bg-stone-900 hover:text-white'
                          }`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>

                    {/* เพิ่มหน่วยใหม่ */}
                    <div className="p-2 border-t border-stone-800">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="หน่วยใหม่..."
                          value={newUnitName}
                          onChange={e => setNewUnitName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newUnitName.trim()) {
                              const trimmed = newUnitName.trim();
                              if (!allUnits.includes(trimmed)) {
                                setCustomUnits(prev => [...prev, trimmed]);
                              }
                              setFormData(prev => ({ ...prev, unit: trimmed }));
                              setNewUnitName('');
                              setShowUnitDropdown(false);
                            }
                          }}
                          className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50 placeholder-stone-600"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newUnitName.trim();
                            if (trimmed) {
                              if (!allUnits.includes(trimmed)) {
                                setCustomUnits(prev => [...prev, trimmed]);
                              }
                              setFormData(prev => ({ ...prev, unit: trimmed }));
                              setNewUnitName('');
                              setShowUnitDropdown(false);
                            }
                          }}
                          className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ราคารวมต้นทุน */}
            <div>
              <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">ราคารวมต้นทุน (บาท) *</label>
              <input
                type="number"
                min="0"
                value={formData.cost || ''}
                onChange={e => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600"
              />
            </div>

            {/* วันที่ซื้อ + ผู้จัดซื้อ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">วันที่จัดซื้อ</label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={e => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                  className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 tracking-wider uppercase mb-1.5">ผู้จัดซื้อ</label>
                <input
                  type="text"
                  value={formData.buyer_name}
                  onChange={e => setFormData(prev => ({ ...prev, buyer_name: e.target.value }))}
                  placeholder="ชื่อผู้จัดซื้อ"
                  className="w-full bg-stone-950 border border-stone-850 focus:border-amber-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-stone-850">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="flex-1 py-3 bg-stone-950 hover:bg-stone-900 border border-stone-850 rounded-xl text-stone-400 text-xs font-bold transition active:scale-97 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-400 text-black text-xs font-extrabold rounded-xl transition active:scale-97 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>{isSaving ? 'กำลังบันทึก...' : (editingPurchase ? 'บันทึกการแก้ไข' : 'บันทึกวัตถุดิบ')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderDeleteModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="w-full max-w-sm bg-stone-900 border border-red-900/30 rounded-3xl p-6 shadow-2xl">
          <div className="text-center mb-5">
            <div className="w-14 h-14 bg-red-950/30 border border-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-base font-black text-white mb-1">ยืนยันการลบประวัติจัดซื้อ</h3>
            <p className="text-stone-400 text-xs">
              คุณต้องการลบรายการ <span className="font-bold text-red-400">&quot;{deleteTarget?.name}&quot;</span> ใช่หรือไม่?
            </p>
            <p className="text-stone-500 text-[10px] mt-1">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 py-3 bg-stone-950 hover:bg-stone-900 border border-stone-850 rounded-xl text-stone-400 text-xs font-bold transition active:scale-97 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-stone-700 text-white text-xs font-extrabold rounded-xl transition active:scale-97 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>{isDeleting ? 'กำลังลบ...' : 'ลบรายการนี้'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
};
