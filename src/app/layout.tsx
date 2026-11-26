import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { ServiceWorkerRegistrar } from '@/components/shared/ServiceWorkerRegistrar';
import './globals.css';

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

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
    <html lang="id" className={jakartaSans.variable}>
      <body className="font-sans bg-[#F8FAFC] text-[#0F172A] antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
