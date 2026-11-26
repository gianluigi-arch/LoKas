'use client';

import { useEffect, useState } from 'react';
import { Clock, UserCheck, X } from 'lucide-react';
import { updateMerchantShiftLabel, type ShiftType } from '@/lib/db';
import { useShiftStore } from '@/hooks/useShiftStore';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHIFTS: ShiftType[] = ['Pagi', 'Siang', 'Malam'];
const CASHIER_PRESETS = ['Rina', 'Budi', 'Sari'];

export function ShiftModal({ isOpen, onClose }: ShiftModalProps) {
  const { shift, cashierName, setShiftConfig } = useShiftStore();
  const [selectedShift, setSelectedShift] = useState<ShiftType>(shift);
  const [nameInput, setNameInput] = useState<string>(cashierName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedShift(shift);
      setNameInput(cashierName);
    }
  }, [isOpen, shift, cashierName]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = nameInput.trim() || 'Rina';
    setIsSaving(true);
    try {
      setShiftConfig(selectedShift, finalName);
      await updateMerchantShiftLabel(selectedShift, finalName);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pengaturan Shift dan Kasir"
        className="bg-white rounded-3xl border border-slate-200 w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#EA580C] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Shift &amp; Kasir Bertugas
              </h2>
              <p className="text-xs text-slate-500">
                Tercatat otomatis di setiap struk &amp; laporan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Segmented Shift Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Pilih Shift Aktif
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1">
              {SHIFTS.map((item) => {
                const active = selectedShift === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSelectedShift(item)}
                    className={`rounded-xl py-2 text-xs font-bold transition ${
                      active
                        ? 'bg-white text-[#EA580C] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cashier Name Input + Quick Chips */}
          <div>
            <label
              htmlFor="cashier-name-input"
              className="block text-xs font-semibold text-slate-600 mb-1.5"
            >
              Nama Kasir Bertugas
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="cashier-name-input"
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Contoh: Rina"
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-500/15"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {CASHIER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNameInput(preset)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${
                    nameInput.trim() === preset
                      ? 'border-[#EA580C] bg-orange-50 text-[#EA580C]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-[#EA580C] hover:bg-[#C2410C] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
