'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, LayoutGrid, Package, QrCode } from 'lucide-react';
import type { ReactNode } from 'react';
import { db } from '@/lib/db';
import { SAMPLE_STATIC_QRIS } from '@/lib/qris-engine';
import { useUiStore } from '@/hooks/useUiStore';
import { QrisSetupModal } from '@/components/qris/QrisSetupModal';

interface AppShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: '/', label: 'Kasir', icon: LayoutGrid },
  { href: '/stok', label: 'Stok', icon: Package },
  { href: '/laporan', label: 'Laporan', icon: BarChart3 },
] as const;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const merchant = useLiveQuery(() => db.merchant.get('default'));
  const { isQrisModalOpen, openQrisModal, closeQrisModal } = useUiStore();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col lg:flex-row">
      {/* Desktop Left Navigation Rail (>= 1024px) */}
      <aside className="hidden lg:flex lg:flex-col lg:justify-between lg:w-20 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-white border-r border-slate-200 py-5 px-2.5 z-30">
        <div className="flex flex-col items-center gap-6">
          <Link
            href="/"
            aria-label="LoKas Beranda"
            className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-sm shadow-orange-600/20"
          >
            <img
              src="/icons/icon.svg"
              alt="LoKas Logo"
              width={40}
              height={40}
              className="w-10 h-10"
            />
          </Link>

          <nav className="flex flex-col items-center gap-2 w-full" aria-label="Navigasi Utama">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`w-full flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-2xl text-[11px] font-semibold transition ${
                    isActive
                      ? 'bg-orange-50 text-[#EA580C]'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={openQrisModal}
          className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-2xl text-[10px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 text-center leading-tight transition"
        >
          <QrCode className="w-5 h-5" strokeWidth={1.8} />
          <span>
            Pengaturan
            <br />
            QRIS
          </span>
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 lg:pb-0">{children}</div>

      {/* Mobile Bottom Navigation Bar (< 1024px) */}
      <nav
        aria-label="Navigasi Bawah"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-around"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1 rounded-xl text-[11px] font-semibold transition ${
                isActive ? 'text-[#EA580C]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Global QRIS Setup Modal (renders on top of current route without navigation) */}
      <QrisSetupModal
        isOpen={isQrisModalOpen}
        initialPayload={merchant?.staticQrisPayload ?? SAMPLE_STATIC_QRIS}
        onClose={closeQrisModal}
      />
    </div>
  );
}
