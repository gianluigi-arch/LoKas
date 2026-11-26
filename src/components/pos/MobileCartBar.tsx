'use client';

import { ArrowRight } from 'lucide-react';
import { selectCartTotals, useCartStore } from '@/hooks/useCartStore';
import { formatRupiah } from '@/lib/format';

interface MobileCartBarProps {
  onOpenSheet: () => void;
}

export function MobileCartBar({ onOpenSheet }: MobileCartBarProps) {
  const { items, discount } = useCartStore();
  const totals = selectCartTotals(items, discount);

  if (totals.totalCount === 0) return null;

  return (
    <div className="lg:hidden fixed bottom-[68px] inset-x-3 z-20">
      <div className="bg-[#0F172A] text-white rounded-2xl px-4 py-2.5 shadow-xl shadow-slate-900/25 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold tabular-nums">
          {totals.totalCount} Item • {formatRupiah(totals.total)}
        </div>
        <button
          type="button"
          onClick={onOpenSheet}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] px-4 py-2 text-xs font-bold text-white transition active:scale-95"
        >
          <span>Keranjang</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
