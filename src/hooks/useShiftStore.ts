'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ShiftType } from '@/lib/db';

interface ShiftState {
  shift: ShiftType;
  cashierName: string;
  setShiftConfig: (shift: ShiftType, cashierName: string) => void;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      shift: 'Pagi',
      cashierName: 'Rina',
      setShiftConfig: (shift, cashierName) => {
        const trimmed = cashierName.trim();
        set({
          shift,
          cashierName: trimmed.length > 0 ? trimmed : 'Rina',
        });
      },
    }),
    {
      name: 'lokas-shift-store',
    }
  )
);
