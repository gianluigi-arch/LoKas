'use client';

import { useEffect, useState } from 'react';
import type { ProductRecord } from '@/lib/db';
import { formatRupiah } from '@/lib/format';
import { Cookie, CupSoda, Minus, Package, Plus, Tag } from 'lucide-react';

interface ProductCardProps {
  product: ProductRecord;
  quantityInCart: number;
  onAdd: (product: ProductRecord) => void;
  onDecrement: (productId: string) => void;
}

interface CategoryTileTheme {
  accentBar: string;
  surfaceBg: string;
  watermarkColor: string;
  Icon: typeof Package;
}

const KNOWN_CATEGORY_THEMES: Record<string, CategoryTileTheme> = {
  'Sembako & Ritel': {
    accentBar: 'bg-amber-500',
    surfaceBg: 'bg-amber-50/60',
    watermarkColor: 'text-amber-900',
    Icon: Package,
  },
  'Minuman & Segar': {
    accentBar: 'bg-sky-500',
    surfaceBg: 'bg-sky-50/60',
    watermarkColor: 'text-sky-900',
    Icon: CupSoda,
  },
  'Kudapan & Siap Saji': {
    accentBar: 'bg-orange-500',
    surfaceBg: 'bg-orange-50/60',
    watermarkColor: 'text-orange-900',
    Icon: Cookie,
  },
  Umum: {
    accentBar: 'bg-slate-500',
    surfaceBg: 'bg-slate-50',
    watermarkColor: 'text-slate-900',
    Icon: Tag,
  },
};

const CUSTOM_ACCENT_PALETTE = [
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-rose-500',
  'bg-violet-500',
];

function getCategoryTileTheme(category: string): CategoryTileTheme {
  const normalized = category.trim() || 'Umum';
  if (KNOWN_CATEGORY_THEMES[normalized]) {
    return KNOWN_CATEGORY_THEMES[normalized];
  }
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return {
    accentBar: CUSTOM_ACCENT_PALETTE[hash % CUSTOM_ACCENT_PALETTE.length],
    surfaceBg: 'bg-slate-50',
    watermarkColor: 'text-slate-900',
    Icon: Tag,
  };
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

  const renderMobileInlineStepper = () => (
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
  );

  const cardInteractionProps = {
    role: 'button' as const,
    tabIndex: isOutOfStock ? -1 : 0,
    'aria-disabled': isOutOfStock,
    onClick: () => {
      if (!isOutOfStock && !atMaxStock) {
        onAdd(product);
      }
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !isOutOfStock && !atMaxStock) {
        e.preventDefault();
        onAdd(product);
      }
    },
  };

  // Typographic POS Tile when product has no image (or image fails to load)
  if (!showImage) {
    const theme = getCategoryTileTheme(product.category);
    const WatermarkIcon = theme.Icon;
    const categoryLabel = product.category.trim() || 'Umum';

    return (
      <div
        {...cardInteractionProps}
        className={`relative overflow-hidden rounded-xl p-4 pl-5 flex flex-col justify-between min-h-[210px] transition select-none ${
          isOutOfStock
            ? 'bg-slate-50 border border-slate-200 opacity-60 cursor-not-allowed'
            : isSelected
              ? `${theme.surfaceBg} border-2 border-[#EA580C] shadow-sm cursor-pointer`
              : `${theme.surfaceBg} border border-slate-200 hover:border-orange-400 hover:shadow-sm cursor-pointer active:scale-[0.99]`
        }`}
      >
        {/* 4px Deterministic Category Accent Bar */}
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1 z-10 ${
            isOutOfStock ? 'bg-slate-300' : theme.accentBar
          }`}
        />

        {/* Decorative Category Watermark Icon */}
        <WatermarkIcon
          aria-hidden="true"
          strokeWidth={1.6}
          className={`pointer-events-none absolute -bottom-3 -right-3 w-20 h-20 opacity-[0.07] ${
            isOutOfStock ? 'text-slate-900' : theme.watermarkColor
          }`}
        />

        {/* Top Row: Category Badge & SKU (+ Selection Pill) */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/85 border border-slate-200/70 text-slate-700 truncate max-w-[65%]">
            {categoryLabel}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-mono text-slate-400">
              {product.sku}
            </span>
            {isSelected && (
              <span
                aria-label={`Jumlah ${product.name} di keranjang: ${quantityInCart}`}
                className="h-5 min-w-5 px-1.5 rounded-full bg-[#EA580C] text-white text-[11px] font-bold flex items-center justify-center tabular-nums"
              >
                {quantityInCart}
              </span>
            )}
          </div>
        </div>

        {/* Middle (Hero Focus): Bold Scannable Product Name */}
        <h3
          className={`relative z-10 text-lg font-bold leading-snug line-clamp-2 my-auto py-3 ${
            isOutOfStock ? 'text-slate-400' : 'text-slate-900'
          }`}
        >
          {product.name}
        </h3>

        {/* Bottom Row: Price & Stock Pill (with Mobile Inline Stepper when active) */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-base font-extrabold tabular-nums ${
                isOutOfStock ? 'text-slate-400' : 'text-slate-900'
              }`}
            >
              {formatRupiah(product.price)}
            </p>
            <div className={isSelected ? 'hidden lg:block' : ''}>
              {renderStockBadge()}
            </div>
          </div>
          {isSelected && renderMobileInlineStepper()}
        </div>
      </div>
    );
  }

  // Standard Photo-Top POS Card when product.imageUrl is present
  return (
    <div
      {...cardInteractionProps}
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

      {/* Product Thumbnail */}
      <div className="aspect-[4/3] w-full rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center mb-2.5">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover transition ${
            isOutOfStock ? 'grayscale opacity-75' : ''
          }`}
        />
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
            {renderMobileInlineStepper()}
            <div className="hidden lg:block">{renderStockBadge()}</div>
          </>
        ) : (
          renderStockBadge()
        )}
      </div>
    </div>
  );
}
