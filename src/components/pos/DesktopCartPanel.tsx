'use client';

import { useState } from 'react';
import { Banknote, Minus, Plus, QrCode, ShoppingBag } from 'lucide-react';
import { selectCartTotals, useCartStore } from '@/hooks/useCartStore';
import { formatRupiah } from '@/lib/format';

interface DesktopCartPanelProps {
  onProceedToPayment: () => void;
}

export function DesktopCartPanel({ onProceedToPayment }: DesktopCartPanelProps) {
  const {
    items,
    discount,
    paymentMethod,
    addItem,
    decrementItem,
    setQuantity,
    setDiscount,
    setPaymentMethod,
    clearCart,
  } = useCartStore();

  const [editingDiscount, setEditingDiscount] = useState(false);
  const totals = selectCartTotals(items, discount);

  return (
    <aside className="hidden lg:flex lg:flex-col w-[360px] xl:w-[400px] shrink-0 bg-white border-l border-slate-200 h-screen sticky top-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-[#0F172A]">Pesanan Aktif</h2>
          <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-semibold text-[#EA580C] tabular-nums">
            {totals.totalCount} item
          </span>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-semibold text-red-500 hover:text-red-600 transition"
          >
            Reset
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <ShoppingBag className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Keranjang Masih Kosong</p>
            <p className="text-xs text-slate-400 mt-1">
              Pilih menu di sebelah kiri atau scan SKU untuk memulai transaksi.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const atMax = item.quantity >= item.maxStock;
            return (
              <div
                key={item.productId}
                className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {formatRupiah(item.price)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label={`Kurangi ${item.name}`}
                    onClick={() => decrementItem(item.productId)}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center hover:bg-slate-100 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-[#0F172A] tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Tambah ${item.name}`}
                    disabled={atMax}
                    onClick={() => {
                      if (item.quantity < item.maxStock) {
                        setQuantity(item.productId, item.quantity + 1);
                      } else {
                        void addItem;
                      }
                    }}
                    className="w-8 h-8 rounded-lg border border-orange-300 bg-orange-50 text-[#EA580C] flex items-center justify-center hover:bg-orange-100 transition disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Checkout Footer */}
      <div className="border-t border-slate-200 p-5 space-y-4 bg-white">
        {/* Payment Method Selector */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Metode Pembayaran</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod('QRIS')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold transition ${
                paymentMethod === 'QRIS'
                  ? 'border-2 border-[#EA580C] bg-orange-50/50 text-[#EA580C]'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QRIS Dinamis</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold transition ${
                paymentMethod === 'CASH'
                  ? 'border-2 border-[#EA580C] bg-orange-50/50 text-[#EA580C]'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Tunai</span>
            </button>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-medium text-slate-700 tabular-nums">
              {formatRupiah(totals.subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-500">
            <button
              type="button"
              onClick={() => setEditingDiscount((v) => !v)}
              className="text-left hover:text-[#EA580C] transition underline decoration-dashed underline-offset-4"
            >
              Diskon
            </button>
            {editingDiscount ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={totals.subtotal}
                  step={500}
                  value={discount || ''}
                  placeholder="0"
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  onBlur={() => setEditingDiscount(false)}
                  autoFocus
                  className="w-24 rounded-lg border border-orange-300 px-2 py-1 text-right text-xs font-semibold text-[#0F172A] tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingDiscount(true)}
                className="font-medium text-slate-700 hover:text-[#EA580C] tabular-nums"
              >
                {totals.discount > 0 ? `-${formatRupiah(totals.discount)}` : 'Rp 0'}
              </button>
            )}
          </div>

          <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
            <span className="text-base font-bold text-[#0F172A]">Total</span>
            <span className="text-xl font-extrabold text-[#0F172A] tabular-nums">
              {formatRupiah(totals.total)}
            </span>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          disabled={totals.totalCount === 0}
          onClick={onProceedToPayment}
          className="w-full rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-sm py-3.5 px-4 shadow-sm shadow-orange-600/20 transition disabled:opacity-45 disabled:cursor-not-allowed tabular-nums"
        >
          Proses Pembayaran • {formatRupiah(totals.total)}
        </button>
      </div>
    </aside>
  );
}
