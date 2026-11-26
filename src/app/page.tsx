'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Barcode, Search, UserCheck, X } from 'lucide-react';
import { db, type ProductCategory } from '@/lib/db';
import { useCartStore } from '@/hooks/useCartStore';
import { useNetworkSync } from '@/hooks/useNetworkSync';
import { useShiftStore } from '@/hooks/useShiftStore';
import { AppShell } from '@/components/shared/AppShell';
import { NetworkBadge } from '@/components/shared/NetworkBadge';
import { ShiftModal } from '@/components/shared/ShiftModal';
import { ProductCard } from '@/components/pos/ProductCard';
import { DesktopCartPanel } from '@/components/pos/DesktopCartPanel';
import { MobileCartBar } from '@/components/pos/MobileCartBar';
import { CartBottomSheet } from '@/components/pos/CartBottomSheet';
import { PaymentModal } from '@/components/qris/PaymentModal';

type CategoryFilter = 'Semua' | ProductCategory;

const CATEGORIES: CategoryFilter[] = [
  'Semua',
  'Sembako & Ritel',
  'Minuman & Segar',
  'Kudapan & Siap Saji',
];

export default function KasirPage() {
  const merchant = useLiveQuery(() => db.merchant.get('default'));
  const products = useLiveQuery(() => db.products.toArray(), [], []);

  const { items, addItem, decrementItem } = useCartStore();
  const { isOnline, pendingCount, isSyncing, syncNow } = useNetworkSync();
  const { shift, cashierName } = useShiftStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>('Semua');
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isSkuModalOpen, setIsSkuModalOpen] = useState(false);
  const [skuInput, setSkuInput] = useState('');
  const [skuFeedback, setSkuFeedback] = useState<string | null>(null);

  const qtyByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.productId, item.quantity);
    }
    return map;
  }, [items]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchesQuery =
        query.length === 0 ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleScanSku = (rawCode: string) => {
    const normalized = rawCode.trim().toLowerCase();
    if (!normalized) return;

    const match = products.find(
      (p) =>
        p.sku.toLowerCase() === normalized ||
        p.name.toLowerCase() === normalized
    );
    if (!match) {
      setSkuFeedback(`SKU "${rawCode.trim()}" tidak ditemukan.`);
      return;
    }
    if (match.stock <= 0) {
      setSkuFeedback(`Stok "${match.name}" sedang habis.`);
      return;
    }
    addItem(match);
    setSkuFeedback(`"${match.name}" ditambahkan ke keranjang.`);
    setSkuInput('');
  };

  const renderOperatorPill = (compact = false) => (
    <button
      type="button"
      onClick={() => setIsShiftModalOpen(true)}
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white font-semibold text-[#0F172A] hover:border-[#EA580C] hover:text-[#EA580C] transition whitespace-nowrap ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <UserCheck className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
      <span>
        Shift {shift} • {cashierName}
      </span>
    </button>
  );

  return (
    <AppShell>
      <div className="flex-1 flex min-h-screen lg:min-h-0">
        {/* Center Catalog Area */}
        <main className="flex-1 min-w-0 p-4 lg:p-6 pb-36 lg:pb-6 space-y-4">
          {/* Header Row: Clean Store Title + Search + Operator & Network Utility Cluster */}
          <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start lg:items-center justify-between gap-3">
              <h1 className="text-[20px] font-bold text-[#0F172A] leading-tight whitespace-nowrap">
                {merchant?.storeName ?? 'Toserba Laris Jaya'}
              </h1>

              {/* Mobile (<1024px) Utility Cluster */}
              <div className="lg:hidden flex flex-col items-end gap-1.5 shrink-0">
                <NetworkBadge
                  isOnline={isOnline}
                  pendingCount={pendingCount}
                  isSyncing={isSyncing}
                  onSyncClick={() => void syncNow()}
                />
                {renderOperatorPill(true)}
              </div>
            </div>

            {/* Search + Barcode Row */}
            <div className="flex items-center gap-2.5 lg:flex-1 lg:max-w-sm xl:max-w-md lg:mx-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      const exactSku = products.find(
                        (p) =>
                          p.sku.toLowerCase() ===
                          searchQuery.trim().toLowerCase()
                      );
                      if (exactSku && exactSku.stock > 0) {
                        addItem(exactSku);
                        setSearchQuery('');
                      }
                    }
                  }}
                  placeholder="Cari menu atau scan SKU..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-500/15"
                />
              </div>
              <button
                type="button"
                aria-label="Scan SKU Barcode"
                onClick={() => {
                  setSkuFeedback(null);
                  setIsSkuModalOpen(true);
                }}
                className="w-11 h-11 shrink-0 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
              >
                <Barcode className="w-5 h-5" />
              </button>
            </div>

            {/* Desktop (>=1024px) Utility Cluster: Operator Pill + Network Badge */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {renderOperatorPill()}
              <NetworkBadge
                isOnline={isOnline}
                pendingCount={pendingCount}
                isSyncing={isSyncing}
                onSyncClick={() => void syncNow()}
              />
            </div>
          </header>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* Responsive Product Grid: 2 cols on mobile (M-01), 3 cols on desktop (D-01) */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Produk tidak ditemukan
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Coba ubah kata kunci pencarian atau pilih kategori &ldquo;Semua&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={qtyByProductId.get(product.id) ?? 0}
                  onAdd={addItem}
                  onDecrement={decrementItem}
                />
              ))}
            </div>
          )}
        </main>

        {/* D-01 Desktop Right Cart Panel */}
        <DesktopCartPanel
          onProceedToPayment={() => setIsPaymentModalOpen(true)}
        />
      </div>

      {/* M-01 Mobile Sticky Bottom Checkout Bar */}
      <MobileCartBar onOpenSheet={() => setIsBottomSheetOpen(true)} />

      {/* M-01B Mobile Cart Bottom Sheet */}
      <CartBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        onProceedToPayment={() => setIsPaymentModalOpen(true)}
      />

      {/* M-02 Dynamic QRIS & Tunai Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        isOnline={isOnline}
        onAfterCheckout={() => {
          if (navigator.onLine) {
            void syncNow();
          }
        }}
      />

      {/* Interactive Shift & Cashier Selector Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />

      {/* Quick SKU / Barcode Entry Modal */}
      {isSkuModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F172A]">
                Scan / Input SKU Cepat
              </h2>
              <button
                type="button"
                onClick={() => setIsSkuModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScanSku(skuInput);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                autoFocus
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                placeholder="Contoh: SMB-001 atau MNM-001"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm uppercase text-[#0F172A] focus:outline-none focus:border-[#EA580C]"
              />
              {skuFeedback && (
                <p className="text-xs font-medium text-slate-600">{skuFeedback}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {products
                  .filter((p) => p.stock > 0)
                  .slice(0, 4)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleScanSku(p.sku)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {p.sku}
                    </button>
                  ))}
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-[#EA580C] hover:bg-[#C2410C] py-2.5 text-xs font-bold text-white"
              >
                Tambah ke Keranjang
              </button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
