'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Banknote,
  Calendar,
  ChevronDown,
  QrCode,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { db, type ShiftType } from '@/lib/db';
import {
  formatDateId,
  formatRupiah,
  formatTimeHHMM,
  getLocalDateKey,
  shortInvoice,
} from '@/lib/format';
import { useNetworkSync } from '@/hooks/useNetworkSync';
import { AppShell } from '@/components/shared/AppShell';

type ShiftFilter = 'Semua' | ShiftType;

const SHIFT_FILTERS: Array<{ value: ShiftFilter; label: string }> = [
  { value: 'Semua', label: 'Semua Shift' },
  { value: 'Pagi', label: 'Pagi' },
  { value: 'Siang', label: 'Siang' },
  { value: 'Malam', label: 'Malam' },
];

export default function LaporanPage() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useNetworkSync();
  const [dateScope, setDateScope] = useState<'today' | 'all'>('today');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('Semua');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const transactions = useLiveQuery(
    () => db.transactions.orderBy('createdAt').reverse().toArray(),
    [],
    []
  );

  const allItems = useLiveQuery(() => db.transactionItems.toArray(), [], []);

  const itemsByTxId = useMemo(() => {
    const map = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const existing = map.get(item.transactionId) ?? [];
      existing.push(item);
      map.set(item.transactionId, existing);
    }
    return map;
  }, [allItems]);

  const todayKey = getLocalDateKey(Date.now());
  const todayLabel = formatDateId(new Date());

  const scopedTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesDate =
        dateScope === 'all' || getLocalDateKey(t.createdAt) === todayKey;
      const txShift = t.shift ?? 'Pagi';
      const matchesShift =
        shiftFilter === 'Semua' || txShift === shiftFilter;
      return matchesDate && matchesShift;
    });
  }, [transactions, dateScope, shiftFilter, todayKey]);

  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let cashTotal = 0;
    let cashCount = 0;
    let qrisTotal = 0;
    let qrisCount = 0;

    for (const tx of scopedTransactions) {
      totalRevenue += tx.total;
      if (tx.paymentMethod === 'CASH') {
        cashTotal += tx.total;
        cashCount += 1;
      } else {
        qrisTotal += tx.total;
        qrisCount += 1;
      }
    }

    return {
      totalRevenue,
      totalCount: scopedTransactions.length,
      cashTotal,
      cashCount,
      qrisTotal,
      qrisCount,
    };
  }, [scopedTransactions]);

  const handleManualSync = async () => {
    setSyncNotice(null);
    const result = await syncNow();
    if (result.error) {
      setSyncNotice(result.error);
    } else if (result.synced > 0) {
      setSyncNotice(`${result.synced} transaksi berhasil disinkronkan.`);
    } else {
      setSyncNotice('Semua data sudah tersinkron.');
    }
  };

  return (
    <AppShell>
      <main className="max-w-3xl w-full mx-auto p-4 lg:p-6 space-y-5">
        {/* Top Header */}
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-[#0F172A]">Laporan Harian</h1>

            <button
              type="button"
              disabled={isSyncing || pendingCount === 0}
              onClick={handleManualSync}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#EA580C] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#EA580C] hover:bg-orange-50 transition disabled:opacity-50 tabular-nums"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>
                {isSyncing
                  ? 'Menyinkronkan...'
                  : `Sync Sekarang (${pendingCount})`}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() =>
                setDateScope((prev) => (prev === 'today' ? 'all' : 'today'))
              }
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-slate-50 transition"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {dateScope === 'today'
                  ? `Hari Ini • ${todayLabel}`
                  : 'Semua Tanggal'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <span
              className={`text-xs font-semibold ${
                isOnline ? 'text-[#059669]' : 'text-[#D97706]'
              }`}
            >
              {isOnline ? '• Online' : '• Mode Offline'}
            </span>
          </div>

          {/* Shift Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {SHIFT_FILTERS.map((f) => {
              const active = shiftFilter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setShiftFilter(f.value)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {syncNotice && (
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700">
              {syncNotice}
            </div>
          )}
        </header>

        {/* Bento Metrics Grid */}
        <section className="space-y-3">
          {/* Primary Revenue Card */}
          <div className="rounded-2xl bg-[#0F172A] text-white p-5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                {dateScope === 'today'
                  ? `Total Omzet Hari Ini${shiftFilter !== 'Semua' ? ` (Shift ${shiftFilter})` : ''}`
                  : `Total Semua Omzet${shiftFilter !== 'Semua' ? ` (Shift ${shiftFilter})` : ''}`}
              </span>
              <span className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-[#EA580C]">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>

            <p className="text-3xl font-extrabold tracking-tight tabular-nums">
              {formatRupiah(metrics.totalRevenue)}
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-300 tabular-nums">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              <span>{metrics.totalCount} Transaksi Sukses</span>
            </div>
          </div>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Banknote className="w-4 h-4 text-slate-500" />
                <span>Tunai</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-[#0F172A] tabular-nums">
                {formatRupiah(metrics.cashTotal)}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {metrics.cashCount} tx
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <QrCode className="w-4 h-4 text-[#EA580C]" />
                <span>QRIS Dinamis</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-[#0F172A] tabular-nums">
                {formatRupiah(metrics.qrisTotal)}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {metrics.qrisCount} tx
              </p>
            </div>
          </div>
        </section>

        {/* Recent Transactions Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F172A]">
              Riwayat Transaksi
            </h2>
            <span className="text-xs font-medium text-slate-500 tabular-nums">
              {scopedTransactions.length} transaksi
            </span>
          </div>

          {scopedTransactions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              Belum ada transaksi tercatat pada filter ini.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
              {scopedTransactions.map((tx) => {
                const isExpanded = expandedTxId === tx.id;
                const lineItems = itemsByTxId.get(tx.id) ?? [];
                const isSynced = tx.syncStatus === 'SYNCED';
                const txShift = tx.shift ?? 'Pagi';
                const txCashier = tx.cashierName || 'Rina';

                return (
                  <div key={tx.id} className="transition">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTxId(isExpanded ? null : tx.id)
                      }
                      className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 transition"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-500 tabular-nums">
                          {shortInvoice(tx.invoiceNumber)} •{' '}
                          {formatTimeHHMM(tx.createdAt)} • Shift {txShift} (
                          {txCashier})
                        </p>
                        <p className="text-sm font-bold text-[#0F172A] tabular-nums">
                          {tx.paymentMethod === 'QRIS' ? 'QRIS' : 'Tunai'} •{' '}
                          {formatRupiah(tx.total)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 ${
                          isSynced
                            ? 'bg-emerald-50 text-[#059669] border border-emerald-200'
                            : 'bg-amber-50 text-[#D97706] border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSynced ? 'bg-[#059669]' : 'bg-[#D97706]'
                          }`}
                        />
                        {isSynced ? 'Tersinkron' : 'Menunggu Sync'}
                      </span>
                    </button>

                    {isExpanded && lineItems.length > 0 && (
                      <div className="px-4 pb-3.5 pt-1.5 bg-slate-50/70 border-t border-slate-100 space-y-1.5">
                        <p className="text-[11px] font-semibold text-slate-500">
                          Shift {txShift} • Kasir: {txCashier}
                        </p>
                        {lineItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs text-slate-600 tabular-nums"
                          >
                            <span>
                              {item.quantity}× {item.productName}
                            </span>
                            <span className="font-semibold text-[#0F172A]">
                              {formatRupiah(item.subtotal)}
                            </span>
                          </div>
                        ))}
                        {tx.discount > 0 && (
                          <div className="flex items-center justify-between text-xs text-[#EA580C] tabular-nums">
                            <span>Diskon Manual</span>
                            <span>-{formatRupiah(tx.discount)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
