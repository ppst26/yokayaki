"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, X, ChevronDown, ChevronUp, Boxes,
  Calendar, User, Trash2, PackagePlus, Receipt, Search, Filter, Pencil
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CustomSelect } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { DatePicker } from '@/components/ui/date-picker';
import { useActionFeedback } from '@/context/ActionFeedbackContext';

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
  id?: number;
  name: string;
  unit: string;
  quantity: string;
  pricePerUnit: string;
}

type DateFilterType = 'all' | 'today' | 'weekly' | 'monthly' | '3months' | '6months' | 'custom';

const DATE_FILTER_OPTIONS: { label: string; value: DateFilterType }[] = [
  { label: 'ช่วงเวลา: ทั้งหมด', value: 'all' },
  { label: 'ช่วงเวลา: วันนี้', value: 'today' },
  { label: 'ช่วงเวลา: 7 วันล่าสุด', value: 'weekly' },
  { label: 'ช่วงเวลา: 30 วันล่าสุด', value: 'monthly' },
  { label: 'ช่วงเวลา: 90 วันล่าสุด', value: '3months' },
  { label: 'ช่วงเวลา: 180 วันล่าสุด', value: '6months' },
  { label: 'ช่วงเวลา: กำหนดเอง', value: 'custom' },
];

const DEFAULT_UNITS = ['กก.', 'ขีด', 'กรัม', 'ถุง', 'แพ็ค', 'แผง', 'ขวด', 'กล่อง', 'ลัง', 'ชิ้น', 'ก้าน', 'ลิตร'];

const DEFAULT_INGREDIENTS = [
  'แซลมอนสด',
  'ปลาซาบะ',
  'เบียร์สด',
  'เส้นโซบะ',
  'หมูสามชั้น',
  'ไก่คาราเกะ',
  'กุ้งสด',
  'ปลาหมึก',
  'ไข่ไก่',
  'ซอสยากิโทริ',
  'ซอสเทอริยากิ',
  'น้ำมันงา',
  'น้ำตาลทราย',
  'แป้งทอดกรอบ',
  'หอมหัวใหญ่',
  'กระเทียมสด',
  'ขิงสด',
  'ต้นหอมญี่ปุ่น',
];

// ─── Component ────────────────────────────────────────────────────────────────

export const IngredientPurchaseManager: React.FC = () => {
  const { employee } = useAuth();
  const { showActionFeedback } = useActionFeedback();
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
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        .select('id, purchase_order_id, name, quantity, unit, cost, price_per_unit, purchase_date, buyer_name')
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
    setEditingOrder(null);
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  // ── Edit purchase order handler ──────────────────────────────────────────

  const handleEditOrder = async (order: PurchaseOrder) => {
    let items = expandedItems[order.id];
    if (!items) {
      const { data, error } = await supabase
        .from('item_ingredients')
        .select('id, purchase_order_id, name, quantity, unit, cost, price_per_unit, purchase_date, buyer_name')
        .eq('purchase_order_id', order.id)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching order items for edit:', error);
        return;
      }
      items = (data || []) as IngredientItem[];
      setExpandedItems(prev => ({ ...prev, [order.id]: items }));
    }

    setEditingOrder(order);
    setPurchaseDate(order.purchase_date);
    setBuyerName(order.buyer_name);
    setNote(order.note || '');

    if (items && items.length > 0) {
      setIngredients(
        items.map(item => ({
          id: item.id,
          name: item.name,
          unit: item.unit || 'กก.',
          quantity: item.quantity.toString(),
          pricePerUnit:
            item.price_per_unit != null
              ? String(item.price_per_unit)
              : item.quantity > 0
                ? (item.cost / item.quantity).toString()
                : '0',
        }))
      );
    } else {
      setIngredients([{ name: '', unit: 'กก.', quantity: '', pricePerUnit: '' }]);
    }

    setShowModal(true);
  };

  // ── Delete purchase order handler ────────────────────────────────────────

  const handleDeleteOrder = async (orderId: number) => {
    try {
      setIsDeleting(true);
      const { error: itemErr } = await supabase
        .from('item_ingredients')
        .delete()
        .eq('purchase_order_id', orderId);

      if (itemErr) throw itemErr;

      const { error: poErr } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', orderId);

      if (poErr) throw poErr;

      setDeletingOrder(null);
      if (expandedId === orderId) {
        setExpandedId(null);
      }
      await fetchOrders();
    } catch (err: any) {
      console.error('handleDeleteOrder error:', err);
      showActionFeedback({
        variant: 'error',
        title: 'ลบรายการไม่สำเร็จ',
        description: err.message || 'กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Save purchase order ────────────────────────────────────────────────────

  const handleSave = async () => {

    // Validate
    if (!buyerName.trim()) {
      showActionFeedback({ variant: 'warning', title: 'กรุณาระบุชื่อผู้สั่งซื้อ' });
      return;
    }
    const validRows = ingredients.filter(r => r.name.trim() && parseFloat(r.quantity) > 0 && parseFloat(r.pricePerUnit) >= 0);
    if (validRows.length === 0) {
      showActionFeedback({ variant: 'warning', title: 'กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ' });
      return;
    }

    try {
      setIsSaving(true);

      const itemsPayload = validRows.map(row => ({
        ...(row.id != null ? { id: row.id } : {}),
        name: row.name.trim(),
        quantity: parseFloat(row.quantity),
        unit: row.unit,
        price_per_unit: parseFloat(row.pricePerUnit),
      }));

      const { data, error } = await supabase.rpc('upsert_purchase_order', {
        p_order_id: editingOrder?.id ?? null,
        p_purchase_date: purchaseDate,
        p_buyer_name: buyerName.trim(),
        p_note: note.trim() || null,
        p_items: itemsPayload,
      });

      if (error) throw error;

      const wasEditing = !!editingOrder;
      const purchaseOrderId = editingOrder?.id ?? (data as { order_id: number }).order_id;

      setShowModal(false);
      setEditingOrder(null);
      await fetchOrders();
      if (purchaseOrderId) {
        await fetchOrderItems(purchaseOrderId);
        setExpandedId(purchaseOrderId);
      }
      showActionFeedback({
        variant: 'success',
        title: wasEditing ? 'อัปเดตใบสั่งซื้อเรียบร้อยแล้ว' : 'บันทึกใบสั่งซื้อเรียบร้อยแล้ว',
      });
    } catch (err: any) {
      console.error('handleSave error:', err);
      showActionFeedback({
        variant: 'error',
        title: 'บันทึกไม่สำเร็จ',
        description: err.message || 'ลองใหม่อีกครั้ง',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Page Header: Title & Action Button on the same level */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>จัดการสต็อก</span>
          </h1>
          <p className="text-caption mt-0.5 text-zinc-500 dark:text-zinc-400">
            บันทึกการจัดซื้อวัตถุดิบทำเมนู
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 btn-crimson text-white rounded-xl text-sm font-semibold border-none shadow-sm transition active:scale-95 cursor-pointer shrink-0"
        >
          <PackagePlus className="w-4 h-4" />
          <span>เพิ่มรายการสั่งซื้อ</span>
        </button>
      </div>

      {/* 2. Filter Bar: Search, Date Filter (Single Row without Card) */}
      <div className="flex items-center gap-2.5 w-full lg:w-[40%] lg:min-w-[340px]">
        {/* Search */}
        <SearchInput
          placeholder="ค้นหา PO# หรือชื่อผู้สั่งซื้อ"
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1 min-w-[180px]"
        />

        {/* Date Filter */}
        <div className="w-[180px] sm:w-[220px] shrink-0">
          <CustomSelect
            value={dateFilter}
            onChange={val => setDateFilter(val as DateFilterType)}
            options={DATE_FILTER_OPTIONS}
            icon={<Calendar className="w-4 h-4 text-slate-400 dark:text-zinc-400 shrink-0" />}
            searchable={false}
          />
        </div>
      </div>

      {/* Custom Date Pickers */}
      {dateFilter === 'custom' && (
        <div className="flex items-center gap-2 pt-0.5">
          <DatePicker
            value={customStartDate}
            onChange={setCustomStartDate}
            placeholder="เริ่ม..."
            className="w-36"
          />
          <span className="text-xs font-bold text-zinc-400">ถึง</span>
          <DatePicker
            value={customEndDate}
            onChange={setCustomEndDate}
            placeholder="ถึง..."
            className="w-36"
          />
        </div>
      )}

      {/* 3. Count Badge & Total Cost */}
      <div className="flex items-center justify-between gap-4 pt-1">
        {/* Left: Count Badge */}
        <span className="bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">
          {filteredOrders.length} รายการ
        </span>

        {/* Right: Total Cost */}
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400 font-medium">ยอดสั่งซื้อรวม</span>
          <span className="text-red-500 font-black text-lg">
            {filteredTotalCost.toLocaleString()} ฿
          </span>
        </div>
      </div>

      {/* 4. Orders List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="py-16 text-center space-y-2 border border-zinc-200/50 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/80 rounded-2xl shadow-none">
          <Receipt className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
          <p className="text-sm font-bold text-zinc-400 dark:text-zinc-500">ไม่พบรายการสั่งซื้อวัตถุดิบตามเงื่อนไข</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">ลองเปลี่ยนตัวกรองวันเวลา หรือค้นหาใหม่อีกครั้ง</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Table Data Rows */}
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/80 overflow-hidden shadow-sm transition-all"
            >
              {/* Card Header (Click to toggle expand) */}
              <div
                onClick={() => toggleExpand(order.id)}
                className="p-4 sm:p-5 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition select-none"
              >
                {/* 1. Tablet & Mobile Layout (< lg) — Matches user mockup */}
                <div className="lg:hidden flex flex-col gap-2 w-full">
                  {/* Top Row: PO# + Total Price */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-wide">
                      PO-{String(order.id).padStart(4, '0')}
                    </span>

                    <span className="text-base sm:text-lg font-black text-red-500 whitespace-nowrap">
                      {order.total_cost.toLocaleString()} ฿
                    </span>
                  </div>

                  {/* Bottom Row: Date & Expand / Collapse Toggle */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      <Calendar className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                      <span>{formatDate(order.purchase_date)}</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 font-medium transition cursor-pointer">
                      <span>{expandedId === order.id ? 'ย่อรายละเอียด' : 'รายละเอียด'}</span>
                      {expandedId === order.id ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Desktop Layout (>= lg) */}
                <div className="hidden lg:flex items-center justify-between gap-4 w-full">
                  <div className="grid grid-cols-4 divide-x divide-zinc-200/80 dark:divide-zinc-800/80 flex-1 min-w-0">
                    {/* Col 1: PO# */}
                    <div className="pr-5">
                      <span className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                        เลขที่ PO
                      </span>
                      <span className="text-base font-black text-zinc-900 dark:text-zinc-100 tracking-wide">
                        PO-{String(order.id).padStart(4, '0')}
                      </span>
                    </div>

                    {/* Col 2: Date */}
                    <div className="px-5">
                      <span className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                        วันที่สั่งซื้อ
                      </span>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                        <Calendar className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                        <span className="truncate">{formatDate(order.purchase_date)}</span>
                      </div>
                    </div>

                    {/* Col 3: Buyer */}
                    <div className="px-5">
                      <span className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                        ผู้สั่งซื้อ
                      </span>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                        <span className="truncate">{order.buyer_name}</span>
                      </div>
                    </div>

                    {/* Col 4: Total */}
                    <div className="px-5">
                      <span className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                        ยอดรวม
                      </span>
                      <span className="text-base font-black text-red-500 dark:text-red-400 whitespace-nowrap">
                        {order.total_cost.toLocaleString()} ฿
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Edit, Delete, Chevron */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="แก้ไขรายการสั่งซื้อ"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditOrder(order);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition cursor-pointer active:scale-95"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="ลบรายการสั่งซื้อ"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingOrder(order);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title={expandedId === order.id ? "ยุบรายละเอียด" : "ขยายรายละเอียด"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(order.id);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer active:scale-95"
                    >
                      {expandedId === order.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Detail Section */}
              {expandedId === order.id && (
                <div className="border-t border-zinc-200/60 dark:border-zinc-800/80 px-4 sm:px-5 py-4 space-y-4">
                  {itemsLoading[order.id] ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Buyer Info & Action Buttons (Edit / Delete) */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-center text-zinc-400 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 leading-none mb-1">
                              ผู้สั่งซื้อ
                            </span>
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {order.buyer_name}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: Edit & Delete (visible on mobile/tablet) */}
                        <div className="flex items-center gap-1.5 shrink-0 lg:hidden">
                          <button
                            type="button"
                            title="แก้ไขรายการสั่งซื้อ"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditOrder(order);
                            }}
                            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition cursor-pointer active:scale-95"
                            aria-label="แก้ไขรายการสั่งซื้อ"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="ลบรายการสั่งซื้อ"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingOrder(order);
                            }}
                            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer active:scale-95"
                            aria-label="ลบรายการสั่งซื้อ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {order.note && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">หมายเหตุ:</span> {order.note}
                        </div>
                      )}

                      {/* Ingredient Section Title */}
                      <div className="flex items-center gap-2 pt-1">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          รายการวัตถุดิบ
                        </h3>
                      </div>

                      {/* Table of Ingredients (Matches Image 2: วัตถุดิบ | จำนวน | ราคา/หน่วย | รวม) */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead>
                            <tr className="text-zinc-400 dark:text-zinc-500 text-xs font-semibold border-b border-zinc-200/60 dark:border-zinc-800/60">
                              <th className="text-left py-2 font-medium">วัตถุดิบ</th>
                              <th className="text-center py-2 font-medium">จำนวน</th>
                              <th className="text-right py-2 font-medium">ราคา/หน่วย</th>
                              <th className="text-right py-2 font-medium">รวม</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                            {(expandedItems[order.id] || []).map(item => {
                              const unitPrice = item.price_per_unit != null
                                ? item.price_per_unit
                                : (item.quantity > 0 ? Math.round(item.cost / item.quantity) : item.cost);
                              return (
                                <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                                  <td className="py-2.5 font-bold text-zinc-900 dark:text-zinc-100">
                                    {item.name}
                                  </td>
                                  <td className="py-2.5 text-center text-zinc-700 dark:text-zinc-300">
                                    {item.quantity} {item.unit}
                                  </td>
                                  <td className="py-2.5 text-right text-zinc-600 dark:text-zinc-300">
                                    {unitPrice.toLocaleString()} ฿
                                  </td>
                                  <td className="py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                    {item.cost.toLocaleString()} ฿
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer: Total items & Net amount (Matches Image 2) */}
                      <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-bold text-zinc-500 dark:text-zinc-400">
                          รวม {(expandedItems[order.id] || []).length} รายการ
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-zinc-500 dark:text-zinc-400">
                            ยอดรวมสุทธิ
                          </span>
                          <span className="text-base sm:text-lg font-black text-red-500 dark:text-red-400">
                            {order.total_cost.toLocaleString()} ฿
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Footer Item Count */}
          <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 pt-1">
            แสดง {filteredOrders.length} จาก {orders.length} รายการ
          </p>
        </div>
      )}

      {/* ── Add Purchase Order Modal ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 app-dialog-backdrop overflow-y-auto">
          <div className="app-dialog w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {editingOrder ? (
                  <>
                    <Pencil className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    แก้ไขรายการสั่งซื้อ PO-{String(editingOrder.id).padStart(4, '0')}
                  </>
                ) : (
                  <>
                    <PackagePlus className="w-5 h-5 text-red-600 dark:text-red-400" />
                    เพิ่มรายการสั่งซื้อวัตถุดิบ
                  </>
                )}
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

              {/* Row 1: Date + Buyer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-card-label mb-1.5">
                    วันที่สั่งซื้อ
                  </label>
                  <DatePicker
                    value={purchaseDate}
                    onChange={setPurchaseDate}
                    placeholder="เลือกวันที่สั่งซื้อ..."
                    className="w-full"
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

                {/* Column headers (Hidden on mobile < 640px) */}
                <div className="hidden sm:grid grid-cols-[1fr_80px_100px_90px_32px] gap-2 mb-1.5 px-1">
                  {['ชื่อวัตถุดิบ', 'จำนวน', 'หน่วย', 'ราคา/หน่วย', ''].map(h => (
                    <span key={h} className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">{h}</span>
                  ))}
                </div>

                {/* Rows */}
                <div className="space-y-3 sm:space-y-2">
                  {ingredients.map((row, idx) => {
                    const nameOptions = row.name && !availableIngredients.includes(row.name)
                      ? [row.name, ...availableIngredients]
                      : availableIngredients;
                    const unitOptions = row.unit && !availableUnits.includes(row.unit)
                      ? [row.unit, ...availableUnits]
                      : availableUnits;

                    return (
                      <div
                        key={idx}
                        className="bg-zinc-50 dark:bg-zinc-800/40 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-zinc-200/60 dark:border-zinc-800 sm:border-none space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_80px_100px_90px_32px] sm:gap-2 sm:items-center relative"
                      >
                        {/* Mobile Line 1: Name + Trash */}
                        <div className="flex items-center gap-2 sm:contents">
                          <div className="flex-1 min-w-0">
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
                          </div>

                          {/* Mobile Delete Button */}
                          <button
                            type="button"
                            onClick={() => removeIngredientRow(idx)}
                            disabled={ingredients.length === 1}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 disabled:opacity-30 transition cursor-pointer rounded-lg flex items-center justify-center shrink-0 sm:hidden"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Mobile Line 2: Quantity, Unit, Price/unit (Grid 3 cols on mobile, contents on desktop) */}
                        <div className="grid grid-cols-3 gap-2 sm:contents">
                          {/* Quantity */}
                          <div>
                            <span className="block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 mb-1 sm:hidden">
                              จำนวน
                            </span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0"
                              value={row.quantity}
                              onChange={e => updateRow(idx, 'quantity', e.target.value)}
                              className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-center border-none"
                            />
                          </div>

                          {/* Unit */}
                          <div>
                            <span className="block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 mb-1 sm:hidden">
                              หน่วย
                            </span>
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
                          </div>

                          {/* Price per unit */}
                          <div>
                            <span className="block text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 mb-1 sm:hidden">
                              ราคา/หน่วย
                            </span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0"
                              value={row.pricePerUnit}
                              onChange={e => updateRow(idx, 'pricePerUnit', e.target.value)}
                              className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-right border-none"
                            />
                          </div>

                          {/* Desktop Delete button */}
                          <button
                            type="button"
                            onClick={() => removeIngredientRow(idx)}
                            disabled={ingredients.length === 1}
                            className="hidden sm:flex p-1 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 disabled:opacity-30 transition cursor-pointer rounded-lg items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                className="flex-1 py-2.5 btn-crimson disabled:opacity-50 text-white rounded-xl text-sm font-bold border-none shadow-none transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : editingOrder ? (
                  <><Pencil className="w-4 h-4" /> บันทึกการแก้ไข</>
                ) : (
                  <><PackagePlus className="w-4 h-4" /> บันทึกรายการสั่งซื้อ</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete PO Confirmation Modal ────────────────────────────────────── */}
      {deletingOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 app-dialog-backdrop">
          <div className="app-dialog w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                  ยืนยันการลบใบสั่งซื้อ PO-{String(deletingOrder.id).padStart(4, '0')}?
                </h4>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                  สั่งซื้อวันที่ {formatDate(deletingOrder.purchase_date)} โดย {deletingOrder.buyer_name}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl">
              ⚠️ การลบใบสั่งซื้อนี้จะลบรายการวัตถุดิบทั้งหมดที่ผูกกับ PO-{String(deletingOrder.id).padStart(4, '0')} ออกจากระบบอย่างถาวร
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOrder(deletingOrder.id)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Trash2 className="w-4 h-4" /> ยืนยันการลบ</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Add Ingredient Name / Unit Sub-Modal ─────────────────────── */}
      {customModalState && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 app-dialog-backdrop">
          <div className="app-dialog w-full max-w-sm p-5 space-y-4">
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
                className="flex-1 py-2 btn-crimson disabled:opacity-40 text-white rounded-xl text-xs font-bold transition cursor-pointer"
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
