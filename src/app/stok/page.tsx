'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Clock, Minus, Plus, QrCode, Search, X } from 'lucide-react';
import {
  addProduct,
  adjustProductStock,
  db,
  type ProductCategory,
  type ProductIconKey,
} from '@/lib/db';
import { formatRupiah } from '@/lib/format';
import { useShiftStore } from '@/hooks/useShiftStore';
import { useUiStore } from '@/hooks/useUiStore';
import { AppShell } from '@/components/shared/AppShell';
import { ShiftModal } from '@/components/shared/ShiftModal';

const CATEGORY_ICON_MAP: Record<ProductCategory, ProductIconKey> = {
  'Sembako & Ritel': 'snack-plate',
  'Minuman & Segar': 'iced-coffee',
  'Kudapan & Siap Saji': 'toast',
};

export default function StokPage() {
  const merchant = useLiveQuery(() => db.merchant.get('default'));
  const products = useLiveQuery(() => db.products.toArray(), [], []);
  const { shift, cashierName } = useShiftStore();
  const openQrisModal = useUiStore((s) => s.openQrisModal);

  const [searchQuery, setSearchQuery] = useState('');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Product form state
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] =
    useState<ProductCategory>('Sembako & Ritel');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('10');
  const [addError, setAddError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter(
      (p) =>
        q.length === 0 ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const priceNum = Number.parseInt(newPrice, 10);
    const stockNum = Number.parseInt(newStock, 10);

    if (!newName.trim() || !newSku.trim()) {
      setAddError('Nama produk dan SKU wajib diisi.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setAddError('Harga harus lebih dari Rp 0.');
      return;
    }

    await addProduct({
      name: newName,
      sku: newSku,
      category: newCategory,
      price: priceNum,
      stock: Number.isFinite(stockNum) ? Math.max(0, stockNum) : 0,
      icon: CATEGORY_ICON_MAP[newCategory],
    });

    setNewName('');
    setNewSku('');
    setNewPrice('');
    setNewStock('10');
    setIsAddModalOpen(false);
  };

  return (
    <AppShell>
      <main className="max-w-3xl w-full mx-auto p-4 lg:p-6 space-y-5">
        {/* Top Header */}
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-[#0F172A]">
            Stok &amp; Pengaturan Toko
          </h1>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-full bg-[#EA580C] hover:bg-[#C2410C] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-600/20 transition"
          >
            + Produk
          </button>
        </header>

        {/* Store Shift & Cashier Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-[#0F172A] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">
                {merchant?.storeName ?? 'Toserba Laris Jaya'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shift {shift} • Kasir: {cashierName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition shrink-0"
          >
            Ganti Shift
          </button>
        </section>

        {/* Merchant QRIS Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 text-[#EA580C] flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">
                  QRIS Merchant Aktif
                </h2>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#059669]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                  Siap Offline
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={openQrisModal}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition shrink-0"
            >
              Ganti QRIS
            </button>
          </div>

          <div className="border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            {merchant?.merchantName ?? 'TOSERBA LARIS JAYA'} • Payload EMVCo Tersimpan
          </div>
        </section>

        {/* Inventory Quick Stock Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F172A]">
              Kontrol Stok Cepat
            </h2>
            <span className="text-xs font-medium text-slate-500 tabular-nums">
              {filteredProducts.length} produk
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter nama produk..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C]"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {filteredProducts.map((product) => {
              const isOut = product.stock === 0;
              const isLow = product.stock > 0 && product.stock <= 5;

              return (
                <div
                  key={product.id}
                  className="px-4 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] truncate">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 tabular-nums">
                        {formatRupiah(product.price)}
                      </span>
                      {isLow && (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-[#D97706] tabular-nums">
                          Sisa {product.stock}
                        </span>
                      )}
                      {isOut && (
                        <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                          Habis
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Stock Stepper */}
                  <div
                    className={`flex items-center gap-2 rounded-xl border p-1 shrink-0 ${
                      isOut
                        ? 'border-red-400 bg-red-50/40'
                        : isLow
                          ? 'border-amber-400 bg-amber-50/40'
                          : 'border-slate-200 bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={`Kurangi stok ${product.name}`}
                      disabled={isOut}
                      onClick={() => void adjustProductStock(product.id, -1)}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition disabled:opacity-40 ${
                        isOut
                          ? 'border-red-200 bg-white text-red-400'
                          : isLow
                            ? 'border-amber-200 bg-white text-[#D97706]'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <span
                      className={`w-7 text-center text-sm font-bold tabular-nums ${
                        isOut
                          ? 'text-red-600'
                          : isLow
                            ? 'text-[#D97706]'
                            : 'text-[#0F172A]'
                      }`}
                    >
                      {product.stock}
                    </span>

                    <button
                      type="button"
                      aria-label={`Tambah stok ${product.name}`}
                      onClick={() => void adjustProductStock(product.id, 1)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                        isOut
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : isLow
                            ? 'border border-amber-300 bg-amber-100 text-[#D97706] hover:bg-amber-200'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Shift & Cashier Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />

      {/* Add New Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F172A]">
                Tambah Produk Baru
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Kecap Manis 550ml"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-[#EA580C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Kode SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="SMB-009"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Kategori
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as ProductCategory)
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#EA580C]"
                  >
                    <option value="Sembako & Ritel">Sembako &amp; Ritel</option>
                    <option value="Minuman & Segar">Minuman &amp; Segar</option>
                    <option value="Kudapan & Siap Saji">
                      Kudapan &amp; Siap Saji
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={500}
                    step={500}
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="18000"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Stok Awal
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
              </div>

              {addError && (
                <p className="text-xs font-semibold text-red-600">{addError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#EA580C] hover:bg-[#C2410C] px-4 py-2 text-xs font-bold text-white"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
