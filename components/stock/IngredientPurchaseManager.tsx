"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, X, ChevronDown, ChevronUp, ShoppingCart,
  Calendar, User, Trash2, PackagePlus, Receipt, Search, Filter, RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CustomSelect } from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseOrder {
  id: number;
  purchase_date: string;
  buyer_name: string;
  total_cost: number;
  note: string | null;
  created_at: string;
  items?: IngredientItem[];
}

interface IngredientItem {
  id: number;
  purchase_order_id: number;
  name: string;
  quantity: number;
  unit: string;
  cost: number; // ราคารวม (quantity * price_per_unit)
  price_per_unit?: number;
  purchase_date: string;
  buyer_name: string;
}

interface NewIngredientRow {
  name: string;
  unit: string;
  quantity: string;
  pricePerUnit: string;
}

type DateFilterType = 'all' | 'today' | 'weekly' | 'monthly' | '3months' | '6months' | 'custom';

const DEFAULT_UNITS = ['กก.', 'ขีด', 'กรัม', 'ถุง', 'แพ็ค', 'แผง', 'ขวด', 'กล่อง', 'ลัง', 'ชิ้น', 'ก้าน', 'ลิตร'];

const DEFAULT_INGREDIENTS = [
  'แซลมอนสด',
  'ปลาซาบะ',
  'เบียร์สด',
  'เส้นโซบะ',
  'กุ้งสด',
  'เนื้อวัวสไลด์',
  'หมูสามชั้น',
  'ไก่สะโพก',
  'ข้าวสารญี่ปุ่น',
  'ซอสโชยุ',
  'สาเก',
  'มิริน',
  'ผักกาดหอม',
  'ไข่ไก่',
];

// ─── Component ────────────────────────────────────────────────────────────────

export const IngredientPurchaseManager: React.FC = () => {
  const { employee } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<number, IngredientItem[]>>({});
  const [itemsLoading, setItemsLoading] = useState<Record<number, boolean>>({});

  // Dynamic Master Data for Dropdowns
  const [availableIngredients, setAvailableIngredients] = useState<string[]>(DEFAULT_INGREDIENTS);
  const [availableUnits, setAvailableUnits] = useState<string[]>(DEFAULT_UNITS);

  // Custom Name / Unit Add Modal State
  const [customModalState, setCustomModalState] = useState<{
    type: 'ingredient' | 'unit';
    rowIndex: number;
  } | null>(null);
  const [customValueInput, setCustomValueInput] = useState<string>('');

  // Date Filter & Search state
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [buyerName, setBuyerName] = useState('');
  const [note, setNote] = useState('');
  const [ingredients, setIngredients] = useState<NewIngredientRow[]>([
    { name: '', unit: 'กก.', quantity: '', pricePerUnit: '' },
  ]);

  // ── Fetch Master Data (Ingredients & Units from Database) ──────────────────

  const fetchMasterData = useCallback(async () => {
    try {
      const { data: ingData } = await supabase
        .from('item_ingredients')
        .select('name, unit');

      const { data: menuData } = await supabase
        .from('menu_items')
        .select('name');

      const namesSet = new Set<string>(DEFAULT_INGREDIENTS);
      const unitsSet = new Set<string>(DEFAULT_UNITS);

      if (menuData) {
        menuData.forEach(m => {
          if (m.name?.trim()) namesSet.add(m.name.trim());
        });
      }

      if (ingData) {
        ingData.forEach(i => {
          if (i.name?.trim()) namesSet.add(i.name.trim());
          if (i.unit?.trim()) unitsSet.add(i.unit.trim());
        });
      }

      setAvailableIngredients(Array.from(namesSet));
      setAvailableUnits(Array.from(unitsSet));
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // ── Fetch purchase orders ──────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, purchase_date, buyer_name, total_cost, note, created_at')
        .order('purchase_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as PurchaseOrder[]);
    } catch (err) {
      console.error('fetchOrders error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Add Custom Ingredient Name or Unit Handler ─────────────────────────────

  const handleConfirmAddCustom = () => {
    if (!customModalState || !customValueInput.trim()) return;
    const val = customValueInput.trim();
    const { type, rowIndex } = customModalState;

    if (type === 'ingredient') {
      if (!availableIngredients.includes(val)) {
        setAvailableIngredients(prev => [...prev, val]);
      }
      updateRow(rowIndex, 'name', val);
    } else {
      if (!availableUnits.includes(val)) {
        setAvailableUnits(prev => [...prev, val]);
      }
      updateRow(rowIndex, 'unit', val);
    }

    setCustomModalState(null);
    setCustomValueInput('');
  };

  // ── Filter orders logic ──────────────────────────────────────────────────

  const filteredOrders = orders.filter(order => {
    // 1. Search term match
    const poIdStr = `PO-${String(order.id).padStart(4, '0')}`;
    const matchSearch =
      !searchTerm.trim() ||
      poIdStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.note && order.note.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchSearch) return false;

    // 2. Date range filter
    if (dateFilter === 'all') return true;

    const poDateStr = order.purchase_date;
    const poDate = new Date(poDateStr);
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    if (dateFilter === 'today') {
      const todayStr = new Date().toISOString().slice(0, 10);
      return poDateStr === todayStr;
    }

    if (dateFilter === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return poDate >= sevenDaysAgo && poDate <= now;
    }

    if (dateFilter === 'monthly') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      return poDate >= thirtyDaysAgo && poDate <= now;
    }

    if (dateFilter === '3months') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      ninetyDaysAgo.setHours(0, 0, 0, 0);
      return poDate >= ninetyDaysAgo && poDate <= now;
    }

    if (dateFilter === '6months') {
      const halfYearAgo = new Date();
      halfYearAgo.setDate(halfYearAgo.getDate() - 180);
      halfYearAgo.setHours(0, 0, 0, 0);
      return poDate >= halfYearAgo && poDate <= now;
    }

    if (dateFilter === 'custom') {
      if (customStartDate && poDateStr < customStartDate) return false;
      if (customEndDate && poDateStr > customEndDate) return false;
      return true;
    }

    return true;
  });

  const filteredTotalCost = filteredOrders.reduce((sum, o) => sum + o.total_cost, 0);

  // ── Fetch items for a purchase order ──────────────────────────────────────

  const fetchOrderItems = async (orderId: number) => {
    setItemsLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const { data, error } = await supabase
        .from('item_ingredients')
        .select('id, purchase_order_id, name, quantity, unit, cost, purchase_date, buyer_name')
        .eq('purchase_order_id', orderId)
        .order('id', { ascending: true });

      if (error) throw error;
      setExpandedItems(prev => ({ ...prev, [orderId]: (data || []) as IngredientItem[] }));
    } catch (err) {
      console.error('fetchOrderItems error:', err);
    } finally {
      setItemsLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const toggleExpand = (orderId: number) => {
    if (expandedId === orderId) {
      setExpandedId(null);
    } else {
      setExpandedId(orderId);
      if (!expandedItems[orderId]) {
        fetchOrderItems(orderId);
      }
    }
  };

  // ── Ingredient row helpers ─────────────────────────────────────────────────

  const addIngredientRow = () =>
    setIngredients(prev => [...prev, { name: '', unit: 'กก.', quantity: '', pricePerUnit: '' }]);

  const removeIngredientRow = (idx: number) =>
    setIngredients(prev => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: keyof NewIngredientRow, value: string) =>
    setIngredients(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));

  const calcRowTotal = (row: NewIngredientRow) => {
    const qty = parseFloat(row.quantity) || 0;
    const price = parseFloat(row.pricePerUnit) || 0;
    return qty * price;
  };

  const totalCost = ingredients.reduce((sum, row) => sum + calcRowTotal(row), 0);

  // ── Reset form ─────────────────────────────────────────────────────────────

  const resetForm = () => {
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setBuyerName(employee?.name || '');
    setNote('');
    setIngredients([{ name: '', unit: 'กก.', quantity: '', pricePerUnit: '' }]);
    setFormError(null);
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  // ── Save purchase order ────────────────────────────────────────────────────

  const handleSave = async () => {
    setFormError(null);

    // Validate
    if (!buyerName.trim()) return setFormError('กรุณาระบุชื่อผู้สั่งซื้อ');
    const validRows = ingredients.filter(r => r.name.trim() && parseFloat(r.quantity) > 0 && parseFloat(r.pricePerUnit) >= 0);
    if (validRows.length === 0) return setFormError('กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ');

    try {
      setIsSaving(true);

      // 1. Create purchase_order header
      const { data: poData, error: poErr } = await supabase
        .from('purchase_orders')
        .insert([{
          purchase_date: purchaseDate,
          buyer_name: buyerName.trim(),
          total_cost: totalCost,
          note: note.trim() || null,
        }])
        .select('id')
        .single();

      if (poErr) throw poErr;
      const purchaseOrderId = poData.id;

      // 2. Insert ingredient rows linked to this PO
      const ingredientRows = validRows.map(row => ({
        purchase_order_id: purchaseOrderId,
        name: row.name.trim(),
        quantity: parseFloat(row.quantity),
        unit: row.unit,
        cost: calcRowTotal(row),
        purchase_date: purchaseDate,
        buyer_name: buyerName.trim(),
      }));

      const { error: ingErr } = await supabase
        .from('item_ingredients')
        .insert(ingredientRows);

      if (ingErr) throw ingErr;

      setShowModal(false);
      await fetchOrders();
      // Clear cached items for the new order so it reloads on expand
      setExpandedItems(prev => {
        const copy = { ...prev };
        delete copy[purchaseOrderId];
        return copy;
      });
    } catch (err: any) {
      console.error('handleSave error:', err);
      setFormError('บันทึกไม่สำเร็จ: ' + (err.message || 'ลองใหม่อีกครั้ง'));
    } finally {
      setIsSaving(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Filter & Search Bar + Action Buttons */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border-none shadow-none">
        <div className="flex flex-wrap items-center gap-2">
          {/* Dropdown Filter */}
          <div className="flex items-center gap-1.5 min-w-[200px]">
            <Filter className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
            <CustomSelect
              value={dateFilter}
              onChange={val => setDateFilter(val as DateFilterType)}
              options={[
                { label: 'ทั้งหมด (All Time)', value: 'all' },
                { label: 'วันนี้ (Today)', value: 'today' },
                { label: 'รายสัปดาห์ (7 วันล่าสุด)', value: 'weekly' },
                { label: 'รายเดือน (30 วันล่าสุด)', value: 'monthly' },
                { label: '3 เดือน (90 วันล่าสุด)', value: '3months' },
                { label: '6 เดือน (180 วันล่าสุด)', value: '6months' },
                { label: 'กำหนดเอง (Custom Range)', value: 'custom' },
              ]}
              searchable={false}
            />
          </div>

          {/* Custom Date Range Pickers */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none border-none"
              />
              <span className="text-xs font-bold text-zinc-400">ถึง</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none border-none"
              />
            </div>
          )}
        </div>

        {/* Search input & Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3.5 py-2 border-none flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="ค้นหา PO#, ชื่อผู้สั่งซื้อ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-semibold text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold border-none shadow-none transition active:scale-95 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>รีเฟรช</span>
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium border-none shadow-none transition active:scale-95 cursor-pointer shrink-0"
          >
            <PackagePlus className="w-4 h-4" />
            เพิ่มรายการสั่งซื้อ
          </button>
        </div>
      </div>

      {/* Section Title (Placed BELOW filter as requested) */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-red-600 dark:text-red-400" />
          ประวัติการสั่งซื้อวัตถุดิบ
        </h2>
      </div>

      {/* Filter Summary Stats */}
      <div className="flex items-center justify-between px-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        <span>แสดง {filteredOrders.length} รายการ (จากทั้งหมด {orders.length} รายการ)</span>
        <span>รวมค่าใช้จ่ายจัดซื้อ: <strong className="text-red-600 dark:text-red-400 font-extrabold text-sm">{filteredTotalCost.toLocaleString()} ฿</strong></span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="py-16 text-center space-y-2 border-none shadow-none bg-white dark:bg-zinc-900 rounded-2xl">
          <Receipt className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
          <p className="text-sm font-bold text-zinc-400 dark:text-zinc-500">ไม่พบรายการสั่งซื้อวัตถุดิบตามเงื่อนไข</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">ลองเปลี่ยนตัวกรองวันเวลา หรือค้นหาใหม่อีกครั้ง</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map(order => (
            <div key={order.id} className="rounded-2xl border-none shadow-none bg-white dark:bg-zinc-900 overflow-hidden">
              {/* Order header row */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition cursor-pointer text-left"
                onClick={() => toggleExpand(order.id)}
              >
                {/* PO# */}
                <span className="w-20 shrink-0 text-xs font-black text-zinc-400 dark:text-zinc-500">
                  PO-{String(order.id).padStart(4, '0')}
                </span>

                {/* Date */}
                <div className="flex items-center gap-1.5 w-32 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {formatDate(order.purchase_date)}
                  </span>
                </div>

                {/* Buyer */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <User className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                    {order.buyer_name}
                  </span>
                </div>

                {/* Note (if any) */}
                {order.note && (
                  <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate max-w-[140px] hidden sm:block">
                    {order.note}
                  </span>
                )}

                {/* Total */}
                <span className="text-sm font-black text-red-600 dark:text-red-400 shrink-0">
                  {order.total_cost.toLocaleString()} ฿
                </span>

                {/* Chevron */}
                {expandedId === order.id
                  ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                }
              </button>

              {/* Expanded detail */}
              {expandedId === order.id && (
                <div className="border-t border-zinc-100 dark:border-zinc-800/80 px-5 py-4">
                  {itemsLoading[order.id] ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <p className="text-card-label mb-3">
                        รายการวัตถุดิบ
                      </p>
                      <Table containerClassName="rounded-none bg-transparent">
                        <TableHeader className="bg-transparent border-b border-zinc-200 dark:border-zinc-800 text-table-head text-zinc-500 dark:text-zinc-400">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="bg-transparent text-zinc-500 dark:text-zinc-400 p-2 text-table-head">ชื่อวัตถุดิบ</TableHead>
                            <TableHead className="bg-transparent text-zinc-500 dark:text-zinc-400 p-2 text-table-head text-center">จำนวน</TableHead>
                            <TableHead className="bg-transparent text-zinc-500 dark:text-zinc-400 p-2 text-table-head text-center">หน่วย</TableHead>
                            <TableHead className="bg-transparent text-zinc-500 dark:text-zinc-400 p-2 text-table-head text-right">ราคารวม</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(expandedItems[order.id] || []).map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="font-bold text-zinc-900 dark:text-zinc-100 text-table-cell">
                                {item.name}
                              </TableCell>
                              <TableCell className="text-center text-zinc-700 dark:text-zinc-300 text-table-cell">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-center text-zinc-500 dark:text-zinc-400 text-table-cell">
                                {item.unit}
                              </TableCell>
                              <TableCell className="text-right text-table-value">
                                {item.cost.toLocaleString()} ฿
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Detail footer */}
                      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-between items-center">
                        <span className="text-table-meta">
                          {(expandedItems[order.id] || []).length} รายการวัตถุดิบ
                        </span>
                        <span className="text-table-value text-base">
                          รวม {order.total_cost.toLocaleString()} ฿
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add Purchase Order Modal ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl shadow-2xl border-none flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-red-600 dark:text-red-400" />
                เพิ่มรายการสั่งซื้อวัตถุดิบ
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Error */}
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Row 1: Date + Buyer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-card-label mb-1.5">
                    วันที่สั่งซื้อ
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 border-none"
                  />
                </div>
                <div>
                  <label className="block text-card-label mb-1.5">
                    ผู้สั่งซื้อ
                  </label>
                  <input
                    type="text"
                    placeholder="ชื่อผู้สั่งซื้อ..."
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder:text-zinc-400 border-none"
                  />
                </div>
              </div>

              {/* Ingredient Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-card-label">
                    รายการวัตถุดิบ
                  </label>
                  <button
                    type="button"
                    onClick={addIngredientRow}
                    className="flex items-center gap-1 text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 cursor-pointer transition"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มรายการ
                  </button>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_80px_100px_90px_32px] gap-2 mb-1.5 px-1">
                  {['ชื่อวัตถุดิบ', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', ''].map(h => (
                    <span key={h} className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">{h}</span>
                  ))}
                </div>

                {/* Rows */}
                <div className="space-y-2">
                  {ingredients.map((row, idx) => {
                    const nameOptions = row.name && !availableIngredients.includes(row.name)
                      ? [row.name, ...availableIngredients]
                      : availableIngredients;
                    const unitOptions = row.unit && !availableUnits.includes(row.unit)
                      ? [row.unit, ...availableUnits]
                      : availableUnits;

                    return (
                      <div key={idx} className="grid grid-cols-[1fr_80px_100px_90px_32px] gap-2 items-center relative">
                        {/* Name Dropdown with CustomSelect (Searchable) */}
                        <CustomSelect
                          value={row.name}
                          onChange={val => updateRow(idx, 'name', val)}
                          options={nameOptions}
                          placeholder="-- เลือกวัตถุดิบ --"
                          addNewLabel="+ เพิ่มชื่อวัตถุดิบใหม่..."
                          searchable={true}
                          onAddNew={() => {
                            setCustomModalState({ type: 'ingredient', rowIndex: idx });
                            setCustomValueInput('');
                          }}
                        />

                        {/* Quantity */}
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0"
                          value={row.quantity}
                          onChange={e => updateRow(idx, 'quantity', e.target.value)}
                          className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-center border-none"
                        />

                        {/* Unit Dropdown with CustomSelect (No Search) */}
                        <CustomSelect
                          value={row.unit}
                          onChange={val => updateRow(idx, 'unit', val)}
                          options={unitOptions}
                          placeholder="หน่วย"
                          addNewLabel="+ เพิ่มหน่วยใหม่..."
                          searchable={false}
                          onAddNew={() => {
                            setCustomModalState({ type: 'unit', rowIndex: idx });
                            setCustomValueInput('');
                          }}
                        />

                        {/* Price per unit */}
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0"
                          value={row.pricePerUnit}
                          onChange={e => updateRow(idx, 'pricePerUnit', e.target.value)}
                          className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-right border-none"
                        />

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeIngredientRow(idx)}
                          disabled={ingredients.length === 1}
                          className="p-1 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 disabled:opacity-30 transition cursor-pointer rounded-lg flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Row subtotals */}
                <div className="mt-3 space-y-1">
                  {ingredients.map((row, idx) => {
                    const rowTotal = calcRowTotal(row);
                    if (!row.name.trim() && rowTotal === 0) return null;
                    return (
                      <div key={idx} className="flex justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 px-1">
                        <span className="truncate max-w-[200px]">{row.name || `รายการ ${idx + 1}`}</span>
                        <span>{rowTotal.toLocaleString()} ฿</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Note (Placed below ingredient table, right before total cost) */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                  หมายเหตุ (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="หมายเหตุเพิ่มเติม..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder:text-zinc-400 border-none"
                />
              </div>

              {/* Total Cost Summary (No background) */}
              <div className="px-1 pt-1 flex items-center justify-between border-none">
                <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">รวมค่าใช้จ่ายทั้งหมด</span>
                <span className="text-xl font-black text-red-600 dark:text-red-400">
                  {totalCost.toLocaleString()} <span className="text-sm font-bold">฿</span>
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-bold border-none shadow-none transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold border-none shadow-none transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isSaving
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><PackagePlus className="w-4 h-4" /> บันทึกรายการสั่งซื้อ</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Add Ingredient Name / Unit Sub-Modal ─────────────────────── */}
      {customModalState && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm p-5 shadow-2xl border-none space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-red-600 dark:text-red-400" />
                เพิ่ม{customModalState.type === 'ingredient' ? 'ชื่อวัตถุดิบ' : 'หน่วย'}ใหม่
              </h4>
              <button
                type="button"
                onClick={() => {
                  setCustomModalState(null);
                  setCustomValueInput('');
                }}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
                {customModalState.type === 'ingredient' ? 'ชื่อวัตถุดิบใหม่:' : 'ชื่อหน่วยใหม่:'}
              </label>
              <input
                type="text"
                autoFocus
                placeholder={customModalState.type === 'ingredient' ? 'เช่น เนื้อวัวสไลด์ A5, เบียร์คราฟต์' : 'เช่น แกลลอน, กระป๋อง, ถัง'}
                value={customValueInput}
                onChange={e => setCustomValueInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmAddCustom();
                  }
                }}
                className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 border-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCustomModalState(null);
                  setCustomValueInput('');
                }}
                className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAddCustom}
                disabled={!customValueInput.trim()}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                + เพิ่มใหม่
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
