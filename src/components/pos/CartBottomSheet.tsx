'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { selectCartTotals, useCartStore } from '@/hooks/useCartStore';
import { formatRupiah } from '@/lib/format';
import { ProductIcon } from '@/components/shared/ProductIcon';

interface CartBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToPayment: () => void;
}

export function CartBottomSheet({
  isOpen,
  onClose,
  onProceedToPayment,
}: CartBottomSheetProps) {
  const {
    items,
    discount,
    decrementItem,
    setQuantity,
    setDiscount,
    clearCart,
  } = useCartStore();

  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const totals = selectCartTotals(items, discount);

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
      {/* Dimmed Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
      />

      {/* Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pesanan Aktif"
        className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 pb-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A] tabular-nums">
            Pesanan Aktif ({totals.totalCount} Item)
          </h2>
          <button
            type="button"
            onClick={() => {
              clearCart();
              onClose();
            }}
            className="text-xs font-semibold text-red-500 hover:text-red-600"
          >
            Hapus Semua
          </button>
        </div>

        {/* Itemized List */}
        <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-slate-100">
          {items.map((item) => {
            const lineTotal = item.price * item.quantity;
            const atMax = item.quantity >= item.maxStock;
            const showThumb =
              Boolean(item.imageUrl) && !failedImages[item.productId];

            return (
              <div
                key={item.productId}
                className="py-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {showThumb ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        onError={() =>
                          setFailedImages((prev) => ({
                            ...prev,
                            [item.productId]: true,
                          }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ProductIcon icon={item.icon} className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {formatRupiah(item.price)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-bold text-[#0F172A] tabular-nums">
                    {formatRupiah(lineTotal)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Kurangi ${item.name}`}
                      onClick={() => decrementItem(item.productId)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-700 flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-[#0F172A] tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Tambah ${item.name}`}
                      disabled={atMax}
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-orange-300 bg-orange-50 text-[#EA580C] flex items-center justify-center disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Summary + CTA */}
        <div className="px-5 pt-3 pb-5 space-y-4 border-t border-slate-100">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600">Diskon Manual</span>
              {showDiscountInput ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={totals.subtotal}
                    step={500}
                    value={discount || ''}
                    placeholder="Nominal Rp"
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-28 rounded-lg border border-orange-300 bg-white px-2.5 py-1 text-right text-xs font-semibold text-[#0F172A] tabular-nums focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(false)}
                    className="rounded-lg bg-[#EA580C] px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDiscountInput(true)}
                  className="rounded-lg border border-orange-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#EA580C] hover:bg-orange-50 tabular-nums"
                >
                  {totals.discount > 0
                    ? `Diskon: -${formatRupiah(totals.discount)}`
                    : '+ Tambah Diskon'}
                </button>
              )}
            </div>

            <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between">
              <span className="text-sm font-bold text-[#0F172A]">Total Tagihan</span>
              <span className="text-lg font-extrabold text-[#0F172A] tabular-nums">
                {formatRupiah(totals.total)}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={totals.totalCount === 0}
            onClick={() => {
              onClose();
              onProceedToPayment();
            }}
            className="w-full rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-sm py-3.5 px-4 shadow-sm shadow-orange-600/20 transition disabled:opacity-45 tabular-nums"
          >
            Lanjut ke Pembayaran • {formatRupiah(totals.total)}
          </button>
        </div>
      </div>
    </div>
  );
}
