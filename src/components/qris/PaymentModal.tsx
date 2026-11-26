'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  QrCode,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  executeAtomicCheckout,
  generateNextInvoiceNumber,
  type TransactionRecord,
} from '@/lib/db';
import { selectCartTotals, useCartStore } from '@/hooks/useCartStore';
import { useShiftStore } from '@/hooks/useShiftStore';
import { formatRupiah } from '@/lib/format';
import {
  convertStaticToDynamicQris,
  parseEmvTlv,
  SAMPLE_STATIC_QRIS,
} from '@/lib/qris-engine';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onAfterCheckout?: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  isOnline,
  onAfterCheckout,
}: PaymentModalProps) {
  const { items, discount, paymentMethod, setPaymentMethod, clearCart } =
    useCartStore();
  const { shift, cashierName } = useShiftStore();
  const totals = selectCartTotals(items, discount);

  const merchant = useLiveQuery(() => db.merchant.get('default'));

  const [invoiceNumber, setInvoiceNumber] = useState<string>('#INV-000');
  const [cashInput, setCashInput] = useState<string>('');
  const [showTlvInspector, setShowTlvInspector] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedTx, setCompletedTx] = useState<TransactionRecord | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCompletedTx(null);
      setErrorMessage(null);
      setShowTlvInspector(false);
      return;
    }

    setCashInput(String(totals.total));
    void generateNextInvoiceNumber().then(setInvoiceNumber);
  }, [isOpen, totals.total]);

  const staticQris = merchant?.staticQrisPayload || SAMPLE_STATIC_QRIS;
  const merchantName = merchant?.merchantName || 'TOSERBA LARIS JAYA';
  const merchantNmid = merchant?.nmid || 'ID10260089123';

  const dynamicQrisPayload = useMemo(() => {
    if (totals.total <= 0) return '';
    try {
      return convertStaticToDynamicQris(staticQris, totals.total);
    } catch {
      return '';
    }
  }, [staticQris, totals.total]);

  const parsedTags = useMemo(() => {
    if (!dynamicQrisPayload) return [];
    try {
      return parseEmvTlv(dynamicQrisPayload);
    } catch {
      return [];
    }
  }, [dynamicQrisPayload]);

  const cashReceivedNum = Number.parseInt(cashInput.replace(/\D/g, ''), 10) || 0;
  const changeAmount = Math.max(0, cashReceivedNum - totals.total);
  const isCashSufficient = cashReceivedNum >= totals.total;

  if (!isOpen) return null;

  const handleConfirmPayment = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const tx = await executeAtomicCheckout({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        discount: totals.discount,
        paymentMethod,
        cashReceived: paymentMethod === 'CASH' ? cashReceivedNum : null,
        dynamicQrisPayload: paymentMethod === 'QRIS' ? dynamicQrisPayload : null,
        invoiceNumber,
        shift,
        cashierName,
      });

      clearCart();
      setCompletedTx(tx);
      onAfterCheckout?.();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal memproses transaksi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completedTx) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-0 sm:p-4">
        <div className="bg-[#F8FAFC] sm:bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl sm:border sm:border-slate-200 p-6 flex flex-col justify-between sm:shadow-2xl">
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">Pembayaran Berhasil</h2>
            <p className="text-xs font-medium text-slate-500 mt-1 tabular-nums">
              {completedTx.invoiceNumber} •{' '}
              {completedTx.paymentMethod === 'QRIS' ? 'QRIS Dinamis' : 'Tunai'}
            </p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">
              Shift {completedTx.shift} • Kasir: {completedTx.cashierName}
            </p>

            <div className="w-full rounded-2xl border border-slate-200 bg-white sm:bg-slate-50 p-4 mt-6 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Total Dibayar</span>
                <span className="font-bold text-[#0F172A] tabular-nums">
                  {formatRupiah(completedTx.total)}
                </span>
              </div>
              {completedTx.paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>Uang Diterima</span>
                    <span className="font-semibold text-slate-700 tabular-nums">
                      {formatRupiah(completedTx.cashReceived ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Kembalian</span>
                    <span className="font-bold text-[#059669] tabular-nums">
                      {formatRupiah(completedTx.changeAmount ?? 0)}
                    </span>
                  </div>
                </>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-xs">
                <span className="text-slate-500">Status Penyimpanan</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold ${
                    isOnline
                      ? 'bg-emerald-50 text-[#059669]'
                      : 'bg-amber-50 text-[#D97706]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-[#059669]' : 'bg-[#D97706]'
                    }`}
                  />
                  {isOnline ? 'Tersimpan & Disinkronkan' : 'Tersimpan Offline (Antrean)'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-sm py-3.5 shadow-sm shadow-orange-600/20 transition"
          >
            Transaksi Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pembayaran"
        className="bg-[#F8FAFC] w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md sm:rounded-3xl sm:border sm:border-slate-200 flex flex-col overflow-hidden sm:shadow-2xl"
      >
        {/* Top Header */}
        <header className="px-4 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Kembali"
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-[#0F172A] hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-[#0F172A] leading-tight">
                Pembayaran
              </h1>
              <p className="text-[11px] text-slate-500">
                Shift {shift} • Kasir: {cashierName}
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            {invoiceNumber}
          </span>
        </header>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Locked Total Card */}
          <div className="bg-white rounded-2xl border border-slate-200 py-4 px-5 text-center">
            <p className="text-xs font-medium text-slate-500">Total Tagihan Terkunci</p>
            <p className="text-3xl font-extrabold text-[#0F172A] mt-1 tabular-nums">
              {formatRupiah(totals.total)}
            </p>
          </div>

          {/* Payment Method Switcher */}
          <div className="bg-slate-200/70 p-1 rounded-2xl grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setPaymentMethod('QRIS')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                paymentMethod === 'QRIS'
                  ? 'bg-white text-[#EA580C] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>QRIS Dinamis</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
                paymentMethod === 'CASH'
                  ? 'bg-white text-[#EA580C] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Tunai</span>
            </button>
          </div>

          {paymentMethod === 'QRIS' ? (
            <>
              {/* Dynamic QRIS Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col items-center text-center">
                <span className="rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-[11px] font-semibold text-[#EA580C]">
                  QRIS • Nominal Otomatis Terisi
                </span>

                <p className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase mt-2.5 tabular-nums">
                  {merchantName} • NMID {merchantNmid}
                </p>

                <div className="relative mt-4 p-4 rounded-2xl border border-slate-200 bg-white">
                  {dynamicQrisPayload ? (
                    <>
                      <QRCodeSVG
                        value={dynamicQrisPayload}
                        size={196}
                        level="H"
                        fgColor="#0F172A"
                        bgColor="#FFFFFF"
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-extrabold tracking-wider text-[#0F172A] shadow-sm">
                          QRIS
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-xs text-red-500">
                      Payload QRIS tidak valid
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-4 leading-relaxed max-w-xs tabular-nums">
                  Pelanggan cukup scan—nominal{' '}
                  <span className="font-semibold text-[#0F172A]">
                    {formatRupiah(totals.total)}
                  </span>{' '}
                  otomatis muncul tanpa ketik manual.
                </p>

                {/* Collapsible EMVCo Tag Verification */}
                <button
                  type="button"
                  onClick={() => setShowTlvInspector((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  <span>Detail EMVCo Payload</span>
                  {showTlvInspector ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showTlvInspector && dynamicQrisPayload && (
                  <div className="w-full mt-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3 text-left space-y-1.5">
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                      {parsedTags
                        .filter((t) => ['01', '53', '54', '59', '63'].includes(t.tag))
                        .map((t) => (
                          <span
                            key={t.tag}
                            className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-slate-700"
                          >
                            Tag {t.tag}: {t.value}
                          </span>
                        ))}
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 break-all">
                      {dynamicQrisPayload}
                    </p>
                  </div>
                )}
              </div>

              {/* Offline Warning Banner */}
              <div
                className={`rounded-2xl border p-3.5 flex items-start gap-2.5 text-xs leading-relaxed ${
                  isOnline
                    ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
                <span>
                  {isOnline
                    ? 'Pastikan notifikasi mutasi masuk di HP toko sudah diterima sebelum menekan konfirmasi.'
                    : 'Mode Offline: Periksa notifikasi mutasi masuk di HP toko sebelum menekan konfirmasi.'}
                </span>
              </div>
            </>
          ) : (
            /* Tunai (Cash) Payment Panel */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div>
                <label
                  htmlFor="cash-received"
                  className="block text-xs font-semibold text-slate-600 mb-1.5"
                >
                  Uang Tunai Diterima (Rp)
                </label>
                <input
                  id="cash-received"
                  type="number"
                  min={0}
                  step={500}
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-lg font-bold text-[#0F172A] tabular-nums focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Quick Cash Denominations */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCashInput(String(totals.total))}
                  className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-[#EA580C] hover:bg-orange-100"
                >
                  Uang Pas
                </button>
                {[20000, 50000, 100000, 200000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCashInput(String(preset))}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 tabular-nums"
                  >
                    {formatRupiah(preset)}
                  </button>
                ))}
              </div>

              {/* Change Output */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Kembalian</span>
                <span
                  className={`text-lg font-extrabold tabular-nums ${
                    isCashSufficient ? 'text-[#059669]' : 'text-red-500'
                  }`}
                >
                  {isCashSufficient
                    ? formatRupiah(changeAmount)
                    : `Kurang ${formatRupiah(totals.total - cashReceivedNum)}`}
                </span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-600">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Bottom Primary CTA */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <button
            type="button"
            disabled={
              isSubmitting ||
              (paymentMethod === 'CASH' && !isCashSufficient) ||
              (paymentMethod === 'QRIS' && !dynamicQrisPayload)
            }
            onClick={handleConfirmPayment}
            className="w-full rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-sm py-3.5 px-4 shadow-sm shadow-orange-600/20 transition disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? 'Menyimpan Transaksi...'
              : paymentMethod === 'QRIS'
                ? 'Konfirmasi Dana Masuk'
                : 'Konfirmasi Pembayaran Tunai'}
          </button>
        </div>
      </div>
    </div>
  );
}
