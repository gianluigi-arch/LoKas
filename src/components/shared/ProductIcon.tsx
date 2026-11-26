'use client';

import type { ProductIconKey } from '@/lib/db';
import {
  Coffee,
  Croissant,
  CupSoda,
  Donut,
  GlassWater,
  Sandwich,
  Utensils,
} from 'lucide-react';

interface ProductIconProps {
  icon: ProductIconKey;
  className?: string;
  muted?: boolean;
}

export function ProductIcon({ icon, className = 'w-8 h-8', muted = false }: ProductIconProps) {
  const colorClass = muted ? 'text-slate-400' : 'text-slate-600';
  const combined = `${className} ${colorClass}`;

  switch (icon) {
    case 'iced-coffee':
      return <CupSoda className={combined} strokeWidth={1.75} />;
    case 'toast':
      return <Sandwich className={combined} strokeWidth={1.75} />;
    case 'matcha':
      return <Coffee className={combined} strokeWidth={1.75} />;
    case 'americano':
      return <GlassWater className={combined} strokeWidth={1.75} />;
    case 'donut':
      return <Donut className={combined} strokeWidth={1.75} />;
    case 'hot-chocolate':
      return <Coffee className={combined} strokeWidth={1.75} />;
    case 'croissant':
      return <Croissant className={combined} strokeWidth={1.75} />;
    case 'iced-tea':
      return <CupSoda className={combined} strokeWidth={1.75} />;
    case 'snack-plate':
      return <Utensils className={combined} strokeWidth={1.75} />;
    default:
      return <Coffee className={combined} strokeWidth={1.75} />;
  }
}
