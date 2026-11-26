'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export function useNetworkSync() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const pendingCount = useLiveQuery(
    () => db.transactions.where('syncStatus').equals('PENDING').count(),
    [],
    0
  );

  const syncNow = useCallback(async (): Promise<{ synced: number; error?: string }> => {
    if (typeof window === 'undefined') return { synced: 0 };
    if (!navigator.onLine) {
      setIsOnline(false);
      return { synced: 0, error: 'Perangkat sedang offline.' };
    }
    if (syncingRef.current) return { synced: 0 };

    syncingRef.current = true;
    setIsSyncing(true);
    setLastSyncError(null);

    try {
      const pending = await db.transactions
        .where('syncStatus')
        .equals('PENDING')
        .toArray();

      if (pending.length === 0) {
        return { synced: 0 };
      }

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds: pending.map((t) => t.id) }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        ok?: boolean;
        syncedIds?: string[];
        syncedAt?: number;
      };

      const syncedIds = data.syncedIds ?? pending.map((t) => t.id);
      const syncedAt = data.syncedAt ?? Date.now();

      await db.transaction('rw', db.transactions, async () => {
        for (const id of syncedIds) {
          await db.transactions.update(id, {
            syncStatus: 'SYNCED',
            syncedAt,
          });
        }
      });

      return { synced: syncedIds.length };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal sinkronisasi ke server.';
      setLastSyncError(message);
      return { synced: 0, error: message };
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      void syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncError,
    syncNow,
  };
}
