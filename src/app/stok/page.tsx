'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Clock, ImagePlus, Minus, Plus, QrCode, Search, Trash2, X } from 'lucide-react';
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

const CATEGORY_SKU_PREFIX: Record<ProductCategory, string> = {
  'Sembako & Ritel': 'SMB',
  'Minuman & Segar': 'MNM',
  'Kudapan & Siap Saji': 'KDP',
};

async function resizeProductImageToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      el.src = objectUrl;
    });

    const maxDim = 320;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas tidak tersedia di browser ini.');
    }

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const webp = canvas.toDataURL('image/webp', 0.75);
    if (webp.startsWith('data:image/webp')) {
      return webp;
    }
    return canvas.toDataURL('image/jpeg', 0.75);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
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

  const resetAddForm = () => {
    setNewName('');
    setNewSku('');
    setNewCategory('Sembako & Ritel');
    setNewPrice('');
    setNewStock('10');
    setNewImageUrl(null);
    setIsProcessingImage(false);
    setAddError(null);
  };

  const handleImagePick = async (file: File) => {
    setAddError(null);
    setIsProcessingImage(true);
    try {
      const resizedDataUrl = await resizeProductImageToDataUrl(file);
      setNewImageUrl(resizedDataUrl);
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : 'Gagal memproses foto produk.'
      );
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const priceNum = Number.parseInt(newPrice, 10);
    const stockNum = Number.parseInt(newStock, 10);

    if (!newName.trim()) {
      setAddError('Nama produk wajib diisi.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setAddError('Harga harus lebih dari Rp 0.');
      return;
    }

    const generatedSku = `${CATEGORY_SKU_PREFIX[newCategory]}-${String(
      products.length + 1
    ).padStart(3, '0')}`;

    await addProduct({
      name: newName,
      sku: newSku.trim() || generatedSku,
      category: newCategory,
      price: priceNum,
      stock: Number.isFinite(stockNum) ? Math.max(0, stockNum) : 0,
      icon: CATEGORY_ICON_MAP[newCategory],
      imageUrl: newImageUrl ?? undefined,
    });

    resetAddForm();
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
            onClick={() => {
              resetAddForm();
              setIsAddModalOpen(true);
            }}
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
                onClick={() => {
                  resetAddForm();
                  setIsAddModalOpen(false);
                }}
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
                    Kode SKU <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="Otomatis jika kosong"
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

              {/* Optional Product Photo Uploader */}
              <div>
                <span className="block text-xs font-semibold text-slate-600 mb-1">
                  Foto Produk <span className="text-slate-400 font-normal">(Opsional)</span>
                </span>
                {newImageUrl ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={newImageUrl}
                        alt="Preview foto produk"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A] truncate">
                          Foto siap disimpan
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Dikompresi ≤320px untuk offline
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewImageUrl(null)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 px-3 py-2.5 cursor-pointer transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#EA580C] shrink-0">
                        <ImagePlus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A]">
                          {isProcessingImage
                            ? 'Mengompresi gambar...'
                            : '+ Pilih Foto Produk'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Maks. 320px • Kosongkan untuk ikon kategori otomatis
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isProcessingImage}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImagePick(file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                )}
              </div>

              {addError && (
                <p className="text-xs font-semibold text-red-600">{addError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetAddForm();
                    setIsAddModalOpen(false);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessingImage}
                  className="rounded-xl bg-[#EA580C] hover:bg-[#C2410C] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
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
