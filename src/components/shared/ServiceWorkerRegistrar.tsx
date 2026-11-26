'use client';

import { useEffect } from 'react';
import { seedInitialDataIfEmpty } from '@/lib/db';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    void seedInitialDataIfEmpty();

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          // Service worker registration failed silently in unsupported contexts
        });
    }
  }, []);

  return null;
}
