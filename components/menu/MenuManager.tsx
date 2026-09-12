"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus,
  Minus,
  Pencil,
  Trash2,
  X,
  Search,
  UtensilsCrossed,
  AlertTriangle,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CustomSelect, SelectOption } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { TablePagination } from '@/components/ui/pagination';
import { deleteOldImage } from '@/lib/deleteOldImage';
import { useActionFeedback } from '@/context/ActionFeedbackContext';
import { DEFAULT_MENU_CATEGORY, mergeMenuCategories, readCustomMenuCategories, saveCustomMenuCategory } from '@/lib/menuCategories';
import { MenuItemModal } from './MenuItemModal';

interface MenuItem {
  id: number;
  name: string;
  unit: string;
  price: number;
  stock: number;
  is_stock_tracked: boolean;
  is_happy_hour: boolean;
  happy_hour_price: number | null;
  category: string;
  image_url?: string | null;
}

const STOCK_LOW_THRESHOLD = 5;

type StockFilter = 'all' | 'tracked' | 'untracked' | 'low' | 'out';
type SortOption = 'default' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc';
type HappyHourFilter = 'all' | 'yes' | 'no';
type ImageFilter = 'all' | 'yes' | 'no';

const STOCK_FILTER_OPTIONS: SelectOption[] = [
  { label: 'ทั้งหมด', value: 'all', shortLabel: 'ทั้งหมด' },
  { label: 'ติดตามสต็อก', value: 'tracked', shortLabel: 'ติดตาม' },
  { label: 'ไม่ติดตามสต็อก', value: 'untracked', shortLabel: 'ไม่ติดตาม' },
  { label: `สต็อกต่ำ (≤${STOCK_LOW_THRESHOLD})`, value: 'low', shortLabel: 'สต็อกต่ำ' },
  { label: 'หมดสต็อก', value: 'out', shortLabel: 'หมด' },
];

const SORT_OPTIONS: SelectOption[] = [
  { label: 'ลำดับที่กำหนด (เริ่มต้น)', value: 'default', shortLabel: 'เริ่มต้น' },
  { label: 'ชื่อ A → Z', value: 'name_asc' },
  { label: 'ชื่อ Z → A', value: 'name_desc' },
  { label: 'ราคาต่ำ → สูง', value: 'price_asc' },
  { label: 'ราคาสูง → ต่ำ', value: 'price_desc' },
  { label: 'สต็อกน้อย → มาก', value: 'stock_asc' },
  { label: 'สต็อกมาก → น้อย', value: 'stock_desc' },
];

const HAPPY_HOUR_FILTER_OPTIONS: SelectOption[] = [
  { label: 'ทั้งหมด', value: 'all', shortLabel: 'ทั้งหมด' },
  { label: 'มี Happy Hour', value: 'yes', shortLabel: 'มี' },
  { label: 'ไม่มี Happy Hour', value: 'no', shortLabel: 'ไม่มี' },
];

const IMAGE_FILTER_OPTIONS: SelectOption[] = [
  { label: 'ทั้งหมด', value: 'all', shortLabel: 'ทั้งหมด' },
  { label: 'มีรูปภาพ', value: 'yes', shortLabel: 'มี' },
  { label: 'ไม่มีรูปภาพ', value: 'no', shortLabel: 'ไม่มี' },
];

const EMPTY_FORM: Omit<MenuItem, 'id'> = {
  name: '',
  unit: 'จาน',
  price: 0,
  stock: 20,
  is_stock_tracked: true,
  is_happy_hour: false,
  happy_hour_price: null,
  category: DEFAULT_MENU_CATEGORY,
  image_url: null,
};

export const MenuManager: React.FC = () => {
  const { showActionFeedback } = useActionFeedback();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ทั้งหมด');
  const [filterStock, setFilterStock] = useState<StockFilter>('all');
  const [filterHappyHour, setFilterHappyHour] = useState<HappyHourFilter>('all');
  const [filterImage, setFilterImage] = useState<ImageFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null);

  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomCategories(readCustomMenuCategories());
  }, []);

  const categories = useMemo(
    () =>
      mergeMenuCategories(
        items.map(i => i.category).filter(Boolean),
        customCategories,
      ),
    [items, customCategories],
  );

  const handleAddCategory = (name: string) => {
    const next = saveCustomMenuCategory(name);
    setCustomCategories(next);
  };

  const handleScrollCategoryRight = () => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: 160, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStock, filterHappyHour, filterImage, sortBy, pageSize]);

  const hasActiveFilters =
    searchTerm !== '' ||
    filterCategory !== 'ทั้งหมด' ||
    filterStock !== 'all' ||
    filterHappyHour !== 'all' ||
    filterImage !== 'all' ||
    sortBy !== 'default';

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterCategory('ทั้งหมด');
    setFilterStock('all');
    setFilterHappyHour('all');
    setFilterImage('all');
    setSortBy('default');
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    showActionFeedback({ variant: type, title: text });
  };

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setItems((data || []) as MenuItem[]);
    } catch (err: any) {
      console.error('Error fetching menu items:', err);
      showMessage('ไม่สามารถดึงข้อมูลเมนูอาหารได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStockUpdate = async (item: MenuItem, deltaOrVal: number, isAbsolute = false) => {
    const newStock = Math.max(0, isAbsolute ? deltaOrVal : item.stock + deltaOrVal);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, stock: newStock } : i));

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ stock: newStock })
        .eq('id', item.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating stock:', err);
      showMessage('ไม่สามารถอัปเดตจำนวนคงเหลือได้', 'error');
      fetchMenuItems();
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setPreviousImageUrl(null);
    setShowFormModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setPreviousImageUrl(item.image_url ?? null);
    setFormData({
      name: item.name,
      unit: item.unit || 'จาน',
      price: item.price,
      stock: item.stock,
      is_stock_tracked: item.is_stock_tracked,
      is_happy_hour: item.is_happy_hour,
      happy_hour_price: item.happy_hour_price,
      category: item.category || DEFAULT_MENU_CATEGORY,
      image_url: item.image_url ?? null,
    });
    setShowFormModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        unit: formData.unit.trim() || 'จาน',
        price: formData.price,
        stock: formData.stock,
        is_stock_tracked: formData.is_stock_tracked,
        is_happy_hour: formData.is_happy_hour,
        happy_hour_price: formData.is_happy_hour ? formData.happy_hour_price : null,
        category: formData.category,
        image_url: formData.image_url?.trim() || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        showMessage(`แก้ไขเมนู "${payload.name}" เรียบร้อยแล้ว`, 'success');
      } else {
        const { error } = await supabase.from('menu_items').insert([payload]);
        if (error) throw error;
        showMessage(`เพิ่มเมนูใหม่ "${payload.name}" เรียบร้อยแล้ว`, 'success');
      }

      const nextUrl = payload.image_url;
      if (previousImageUrl && previousImageUrl !== nextUrl) {
        await deleteOldImage(previousImageUrl);
      }

      setShowFormModal(false);
      fetchMenuItems();
    } catch (err: any) {
      console.error('Error saving menu item:', err);
      showMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      const imageUrl = deleteTarget.image_url;
      if (imageUrl) {
        await deleteOldImage(imageUrl);
      }

      showMessage(`ลบเมนู "${deleteTarget.name}" เรียบร้อยแล้ว`, 'success');
      setDeleteTarget(null);
      fetchMenuItems();
    } catch (err: any) {
      console.error('Error deleting menu item:', err);
      showMessage('ไม่สามารถลบเมนูได้ เนื่องจากมีออเดอร์ผูกกับเมนูนี้', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredItems = useMemo(() => {
    const result = items.filter(i => {
      const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === 'ทั้งหมด' || i.category === filterCategory;

      let matchStock = true;
      switch (filterStock) {
        case 'tracked':
          matchStock = i.is_stock_tracked;
          break;
        case 'untracked':
          matchStock = !i.is_stock_tracked;
          break;
        case 'low':
          matchStock = i.is_stock_tracked && i.stock > 0 && i.stock <= STOCK_LOW_THRESHOLD;
          break;
        case 'out':
          matchStock = i.is_stock_tracked && i.stock === 0;
          break;
      }

      const matchHappyHour =
        filterHappyHour === 'all' ||
        (filterHappyHour === 'yes' && i.is_happy_hour) ||
        (filterHappyHour === 'no' && !i.is_happy_hour);

      const matchImage =
        filterImage === 'all' ||
        (filterImage === 'yes' && !!i.image_url) ||
        (filterImage === 'no' && !i.image_url);

      return matchSearch && matchCategory && matchStock && matchHappyHour && matchImage;
    });

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name, 'th');
        case 'name_desc':
          return b.name.localeCompare(a.name, 'th');
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'stock_asc':
          return a.stock - b.stock;
        case 'stock_desc':
          return b.stock - a.stock;
        default:
          return a.id - b.id;
      }
    });
  }, [items, searchTerm, filterCategory, filterStock, filterHappyHour, filterImage, sortBy]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="w-full text-slate-800 dark:text-neutral-100 font-sans space-y-[var(--space-section)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>จัดการเมนู</span>
          </h1>
          <p className="text-caption mt-0.5">
            เพิ่ม แก้ไขเมนู กำหนดราคา
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 btn-crimson text-white rounded-xl text-xs font-extrabold transition active:scale-95 shadow-md shadow-red-600/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มเมนูอาหารใหม่</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Search & Filter Dropdowns */}
        <div className="flex w-full min-w-0 items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
          <SearchInput
            placeholder="ค้นหาชื่อเมนู..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="w-44 sm:w-52 shrink-0"
          />

          <CustomSelect
            size="sm"
            prefixLabel="สต็อก:"
            value={filterStock}
            onChange={val => setFilterStock(val as StockFilter)}
            options={STOCK_FILTER_OPTIONS}
            searchable={false}
            className="w-28 shrink-0"
          />

          <CustomSelect
            size="sm"
            prefixLabel="จัดเรียง:"
            value={sortBy}
            onChange={val => setSortBy(val as SortOption)}
            options={SORT_OPTIONS}
            searchable={false}
            className="w-32 shrink-0"
          />

          <CustomSelect
            size="sm"
            prefixLabel="HH:"
            value={filterHappyHour}
            onChange={val => setFilterHappyHour(val as HappyHourFilter)}
            options={HAPPY_HOUR_FILTER_OPTIONS}
            searchable={false}
            className="w-24 shrink-0"
          />

          <CustomSelect
            size="sm"
            prefixLabel="รูป:"
            value={filterImage}
            onChange={val => setFilterImage(val as ImageFilter)}
            options={IMAGE_FILTER_OPTIONS}
            searchable={false}
            className="w-24 shrink-0"
          />

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 px-2.5 text-xs font-bold text-slate-700 transition cursor-pointer dark:border-zinc-700/80 dark:hover:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-200 shadow-xs active:scale-95"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>ล้าง</span>
            </button>
          )}
        </div>

        {/* Row 2: Category Filter Group */}
        <div className="space-y-1.5">
          <p className="text-xs font-extrabold text-slate-400 dark:text-neutral-500">
            หมวดหมู่
          </p>
          <div className="flex items-center gap-2">
            <div
              ref={categoryScrollRef}
              className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-none py-0.5"
            >
              {['ทั้งหมด', ...categories].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`badge-pill shrink-0 ${filterCategory === cat ? 'badge-active' : 'badge-inactive'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleScrollCategoryRight}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-xs transition hover:bg-slate-50 hover:text-slate-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 cursor-pointer"
              title="เลื่อนดูหมวดหมู่ถัดไป"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Row 3: Items Count Indicator */}
        {!loading && items.length > 0 && (
          <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
            แสดง {filteredItems.length.toLocaleString()} จาก {items.length.toLocaleString()} รายการ
          </p>
        )}
      </div>

      {/* Menu Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 app-dialog p-8">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500 dark:text-neutral-400">
            ไม่พบรายการอาหารที่ตรงกับเงื่อนไข
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table className="text-[length:var(--manager-table-font)]" containerClassName="-mx-4 md:mx-0 w-[calc(100%+2rem)] md:w-full rounded-none md:rounded-sm border-x-0 md:border-x">
            <TableHeader>
              <TableRow>
                <TableHead>รูปภาพ</TableHead>
                <TableHead>ชื่อเมนู</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead className="text-center">จำนวนสต็อกคงเหลือ</TableHead>
                <TableHead className="text-right">ราคาปกติ</TableHead>
                <TableHead className="text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded-xl border-none"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-extrabold text-zinc-900 dark:text-zinc-100 text-table-cell">
                    <span>{item.name}</span>
                    {item.unit && (
                      <span className="ml-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">/ {item.unit}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded-lg text-badge">
                      {item.category || 'ทั่วไป'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleQuickStockUpdate(item, -1)}
                        disabled={item.stock <= 0}
                        className="p-1 rounded-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition cursor-pointer border-none shadow-none"
                        title="ลดจำนวน 1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={item.stock}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 0) {
                            handleQuickStockUpdate(item, val, true);
                          }
                        }}
                        className="w-14 text-center bg-zinc-100 dark:bg-zinc-800 text-sm font-extrabold rounded-lg py-1 text-zinc-900 dark:text-zinc-100 border-none focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      />
                      <button
                        onClick={() => handleQuickStockUpdate(item, 1)}
                        className="p-1 rounded-sm bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition cursor-pointer border-none shadow-none"
                        title="เพิ่มจำนวน 1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-table-value text-base">
                    {item.price.toLocaleString()} ฿
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition cursor-pointer"
                        title="แก้ไข"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredItems.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Form Modal */}
      <MenuItemModal
        showFormModal={showFormModal}
        setShowFormModal={setShowFormModal}
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        onAddCategory={handleAddCategory}
        handleSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 app-dialog-backdrop">
          <div className="app-dialog w-full max-w-sm p-6 shadow-xl space-y-4 text-center">
            <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
            <h3 className="text-base font-black text-slate-900 dark:text-neutral-100">
              ยืนยันการลบเมนูอาหาร
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-semibold">
              คุณต้องการลบเมนู <span className="font-bold text-slate-800 dark:text-neutral-200">"{deleteTarget.name}"</span> หรือไม่?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-sm text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-sm text-xs font-bold transition shadow-md shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'ลบเมนู'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
