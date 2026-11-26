'use client';

import { RefreshCw } from 'lucide-react';

interface NetworkBadgeProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSyncClick?: () => void;
}

export function NetworkBadge({
  isOnline,
  pendingCount,
  isSyncing,
  onSyncClick,
}: NetworkBadgeProps) {
  if (isOnline) {
    if (pendingCount === 0) {
      return (
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-[#ECFDF5] px-3 py-1.5 text-xs font-semibold text-[#059669]">
          <span className="h-2 w-2 rounded-full bg-[#059669]" />
          <span className="hidden sm:inline">Online • Semua Data Tersinkron</span>
          <span className="sm:hidden">Online • Tersinkron</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={onSyncClick}
        disabled={isSyncing}
        title="Klik untuk sinkronisasi transaksi tertunda"
        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-[#ECFDF5] px-3 py-1.5 text-xs font-semibold text-[#059669] transition hover:bg-emerald-100/80 disabled:opacity-70"
      >
        {isSyncing ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#059669]" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-[#059669]" />
        )}
        <span className="tabular-nums">
          {isSyncing ? 'Menyinkronkan...' : `Online • ${pendingCount} Antrean`}
        </span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-[#FEF3C7] px-3 py-1.5 text-xs font-semibold text-[#D97706]">
      <span className="h-2 w-2 rounded-full bg-[#D97706]" />
      <span className="tabular-nums">
        {pendingCount > 0 ? `Offline • ${pendingCount} Antrean` : 'Mode Offline'}
      </span>
    </div>
  );
}
