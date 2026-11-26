'use client';

import { useEffect, useMemo, useState } from 'react';
import jsQR from 'jsqr';
import { CheckCircle2, ImageUp, QrCode, X } from 'lucide-react';
import { updateMerchantQris } from '@/lib/db';
import { extractMerchantInfo, SAMPLE_STATIC_QRIS } from '@/lib/qris-engine';

interface QrisSetupModalProps {
  isOpen: boolean;
  initialPayload: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function QrisSetupModal({
  isOpen,
  initialPayload,
  onClose,
  onSaved,
}: QrisSetupModalProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [decodeStatus, setDecodeStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPayload(initialPayload || SAMPLE_STATIC_QRIS);
      setDecodeStatus(null);
      setErrorMsg(null);
    }
  }, [isOpen, initialPayload]);

  const parsedInfo = useMemo(() => extractMerchantInfo(payload), [payload]);

  if (!isOpen) return null;

  const handleImageUpload = async (file: File) => {
    setErrorMsg(null);
    setDecodeStatus('Membaca gambar QRIS...');

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const maxDim = 1024;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas browser tidak tersedia.');
      }

      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height);

      if (!result || !result.data) {
        setDecodeStatus(null);
        setErrorMsg(
          'Kode QR tidak terbaca pada gambar. Pastikan QRIS tajam dan tidak terpotong, atau tempel string EMVCo di bawah.'
        );
        return;
      }

      setPayload(result.data.trim());
      setDecodeStatus('QRIS berhasil didekode dari gambar.');
    } catch {
      setDecodeStatus(null);
      setErrorMsg('Gagal memproses file gambar.');
    }
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setIsSaving(true);
    try {
      await updateMerchantQris(payload);
      onSaved?.();
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan QRIS Merchant.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pengaturan QRIS Merchant"
        className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#EA580C] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Pengaturan QRIS Statis
              </h2>
              <p className="text-xs text-slate-500">
                Upload gambar QRIS toko atau tempel payload EMVCo
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

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Image Decoder Drop/Button */}
          <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/70 p-5 cursor-pointer transition text-center">
            <ImageUp className="w-6 h-6 text-[#EA580C]" />
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">
                Pilih Foto / Screenshot QRIS Toko
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Diproses 100% lokal di browser dengan jsQR (tanpa internet)
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImageUpload(file);
              }}
            />
          </label>

          {decodeStatus && (
            <p className="text-xs font-semibold text-[#059669] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {decodeStatus}
            </p>
          )}

          {/* Raw Payload Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="qris-payload-input"
                className="text-xs font-semibold text-slate-600"
              >
                Payload EMVCo QRIS Statis
              </label>
              <button
                type="button"
                onClick={() => {
                  setPayload(SAMPLE_STATIC_QRIS);
                  setErrorMsg(null);
                  setDecodeStatus('Menggunakan contoh QRIS Toserba Laris Jaya.');
                }}
                className="text-xs font-semibold text-[#EA580C] hover:underline"
              >
                Gunakan QRIS Demo
              </button>
            </div>
            <textarea
              id="qris-payload-input"
              rows={3}
              value={payload}
              onChange={(e) => {
                setPayload(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="000201010211..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#EA580C]"
            />
          </div>

          {/* Live Parsed Preview */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600">Preview Data Merchant</span>
              <span
                className={`rounded-full px-2.5 py-0.5 font-semibold ${
                  parsedInfo.isValidQris
                    ? 'bg-emerald-50 text-[#059669] border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}
              >
                {parsedInfo.isValidQris ? 'CRC16 Valid' : 'Format / CRC Tidak Valid'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <p className="text-slate-400">Nama Merchant</p>
                <p className="font-bold text-[#0F172A]">{parsedInfo.merchantName}</p>
              </div>
              <div>
                <p className="text-slate-400">NMID</p>
                <p className="font-bold text-[#0F172A] tabular-nums">{parsedInfo.nmid}</p>
              </div>
              <div>
                <p className="text-slate-400">Kota</p>
                <p className="font-semibold text-slate-700">{parsedInfo.merchantCity}</p>
              </div>
              <div>
                <p className="text-slate-400">Tipe Awal</p>
                <p className="font-semibold text-slate-700">
                  {parsedInfo.pointOfInitiation === '11'
                    ? 'Statis (Tag 01=11)'
                    : `Tag 01=${parsedInfo.pointOfInitiation}`}
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-600">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSaving || !parsedInfo.isValidQris}
            onClick={handleSave}
            className="rounded-xl bg-[#EA580C] hover:bg-[#C2410C] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-45"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan QRIS Offline'}
          </button>
        </div>
      </div>
    </div>
  );
}
