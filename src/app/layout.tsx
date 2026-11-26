import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ServiceWorkerRegistrar } from '@/components/shared/ServiceWorkerRegistrar';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'LoKas (LokalKas) — Kasir Offline & QRIS Dinamis',
  description:
    'LoKas (LokalKas): Aplikasi POS UMKM offline-first dengan generator QRIS Dinamis standar EMVCo.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#EA580C',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="font-sans bg-[#F8FAFC] text-[#0F172A] antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
