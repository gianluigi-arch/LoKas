'use client';

import { useEffect, useState } from 'react';
import type { ProductCategory, ProductRecord } from '@/lib/db';
import { formatRupiah } from '@/lib/format';
import { Cookie, CupSoda, Minus, Package, Plus } from 'lucide-react';

interface ProductCardProps {
  product: ProductRecord;
  quantityInCart: number;
  onAdd: (product: ProductRecord) => void;
  onDecrement: (productId: string) => void;
}

const CATEGORY_FALLBACK_STYLE: Record<
  ProductCategory,
  {
    Icon: typeof Package;
    surfaceClass: string;
    iconBoxClass: string;
    monogramClass: string;
  }
> = {
  'Sembako & Ritel': {
    Icon: Package,
    surfaceClass: 'bg-amber-50/70',
    iconBoxClass: 'bg-white text-amber-700 border border-amber-200/70',
    monogramClass: 'text-amber-800/80 bg-white/80 border border-amber-200/60',
  },
  'Minuman & Segar': {
    Icon: CupSoda,
    surfaceClass: 'bg-sky-50/70',
    iconBoxClass: 'bg-white text-sky-700 border border-sky-200/70',
    monogramClass: 'text-sky-800/80 bg-white/80 border border-sky-200/60',
  },
  'Kudapan & Siap Saji': {
    Icon: Cookie,
    surfaceClass: 'bg-orange-50/70',
    iconBoxClass: 'bg-white text-[#EA580C] border border-orange-200/70',
    monogramClass: 'text-orange-800/80 bg-white/80 border border-orange-200/60',
  },
};

function getProductMonogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return 'LK';
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

export function ProductCard({
  product,
  quantityInCart,
  onAdd,
  onDecrement,
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [product.imageUrl]);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isSelected = quantityInCart > 0;
  const atMaxStock = quantityInCart >= product.stock;
  const showImage = Boolean(product.imageUrl) && !imgError;

  const fallbackMeta =
    CATEGORY_FALLBACK_STYLE[product.category] ??
    CATEGORY_FALLBACK_STYLE['Sembako & Ritel'];
  const CategoryIcon = fallbackMeta.Icon;
  const monogram = getProductMonogram(product.name);

  const renderStockBadge = () => {
    if (isOutOfStock) {
      return (
        <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
          Habis
        </span>
      );
    }
    if (isLowStock) {
      return (
        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-[#D97706] tabular-nums">
          Sisa {product.stock}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums">
        Stok: {product.stock}
      </span>
    );
  };

  return (
    <div
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      aria-disabled={isOutOfStock}
      onClick={() => {
        if (!isOutOfStock && !atMaxStock) {
          onAdd(product);
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isOutOfStock && !atMaxStock) {
          e.preventDefault();
          onAdd(product);
        }
      }}
      className={`relative bg-white rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between transition select-none ${
        isOutOfStock
          ? 'border border-slate-200 opacity-60 cursor-not-allowed'
          : isSelected
            ? 'border-2 border-[#EA580C] shadow-sm cursor-pointer'
            : 'border border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer active:scale-[0.99]'
      }`}
    >
      {/* Top-right Quantity Badge when in cart */}
      {isSelected && (
        <span
          aria-label={`Jumlah ${product.name} di keranjang: ${quantityInCart}`}
          className="absolute -top-2 -right-2 z-10 h-6 min-w-6 px-1.5 rounded-full bg-[#EA580C] text-white text-xs font-bold flex items-center justify-center shadow-sm tabular-nums"
        >
          {quantityInCart}
        </span>
      )}

      {/* Product Thumbnail or Structured Category Fallback */}
      <div
        className={`aspect-[4/3] w-full rounded-xl overflow-hidden flex items-center justify-center mb-2.5 ${
          showImage
            ? 'bg-slate-100'
            : isOutOfStock
              ? 'bg-slate-100'
              : fallbackMeta.surfaceClass
        }`}
      >
        {showImage ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover transition ${
              isOutOfStock ? 'grayscale opacity-75' : ''
            }`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 px-2">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs ${
                isOutOfStock
                  ? 'bg-white/80 text-slate-400 border border-slate-200'
                  : fallbackMeta.iconBoxClass
              }`}
            >
              <CategoryIcon className="w-5 h-5" strokeWidth={1.9} />
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                isOutOfStock
                  ? 'bg-white/70 text-slate-400 border border-slate-200'
                  : fallbackMeta.monogramClass
              }`}
            >
              {monogram}
            </span>
          </div>
        )}
      </div>

      {/* Product Name & Price */}
      <div className="space-y-0.5">
        <h3
          className={`text-[13px] sm:text-sm font-semibold leading-snug line-clamp-1 ${
            isOutOfStock ? 'text-slate-400' : 'text-[#0F172A]'
          }`}
        >
          {product.name}
        </h3>
        <p
          className={`text-[13px] sm:text-sm font-bold tabular-nums ${
            isOutOfStock ? 'text-slate-400' : 'text-[#0F172A]'
          }`}
        >
          {formatRupiah(product.price)}
        </p>
      </div>

      {/* Footer: Mobile inline stepper when selected, otherwise Stock Badge */}
      <div className="mt-2.5">
        {isSelected ? (
          <>
            {/* Mobile (<1024px): M-01 Inline Quantity Stepper */}
            <div
              className="lg:hidden flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/70 p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label={`Kurangi ${product.name}`}
                onClick={() => onDecrement(product.id)}
                className="w-7 h-7 rounded-lg bg-white border border-orange-200 text-[#EA580C] flex items-center justify-center active:scale-95"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-[#EA580C] tabular-nums">
                {quantityInCart}
              </span>
              <button
                type="button"
                aria-label={`Tambah ${product.name}`}
                disabled={atMaxStock}
                onClick={() => onAdd(product)}
                className="w-7 h-7 rounded-lg bg-[#EA580C] text-white flex items-center justify-center active:scale-95 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Desktop (>=1024px): Stock Badge */}
            <div className="hidden lg:block">{renderStockBadge()}</div>
          </>
        ) : (
          renderStockBadge()
        )}
      </div>
    </div>
  );
}
