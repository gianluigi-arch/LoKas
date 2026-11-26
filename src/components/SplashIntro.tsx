'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const SPLASH_SESSION_KEY = 'lokas_splash_seen';

const L_FRAME_PATH =
  'M26 26H44V83H102V101H44C34.059 101 26 92.941 26 83V26ZM63 89H83V91C83 93.209 81.209 95 79 95H67C64.791 95 63 93.209 63 91V89Z';

const K_STEP_PATH =
  'M50 51H64V39H74V26H100L78 52L97 76H78L68 63L64 68V76H50V51Z';

export function SplashIntro() {
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (sessionStorage.getItem(SPLASH_SESSION_KEY)) return;
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch {
      return;
    }

    const reducedByMedia =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (prefersReducedMotion || reducedByMedia) return;

    setIsVisible(true);
    const timer = window.setTimeout(() => {
      setIsVisible(false);
    }, 950);

    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="lokas-splash"
          aria-hidden="true"
          initial={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            scale: 1.02,
            pointerEvents: 'none',
            transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed inset-0 z-[100] bg-[#F8FAFC] flex flex-col items-center justify-center select-none"
        >
          {/* Step 1: Burnt-orange rounded square + LK monogram stroke-to-fill build */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="w-[72px] h-[72px] rounded-2xl bg-[#EA580C] shadow-lg shadow-orange-600/25 flex items-center justify-center overflow-hidden"
          >
            <svg
              viewBox="0 0 128 128"
              fill="none"
              className="w-full h-full"
            >
              {/* L cash-drawer frame */}
              <motion.path
                d={L_FRAME_PATH}
                fill="#FFFFFF"
                fillRule="evenodd"
                clipRule="evenodd"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                strokeLinejoin="round"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: 1 }}
                transition={{
                  pathLength: { duration: 0.32, delay: 0.08, ease: [0.22, 1, 0.36, 1] },
                  fillOpacity: { duration: 0.18, delay: 0.24 },
                }}
              />

              {/* Stepped K */}
              <motion.path
                d={K_STEP_PATH}
                fill="#FFFFFF"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                strokeLinejoin="round"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: 1 }}
                transition={{
                  pathLength: { duration: 0.3, delay: 0.18, ease: [0.22, 1, 0.36, 1] },
                  fillOpacity: { duration: 0.18, delay: 0.32 },
                }}
              />
            </svg>
          </motion.div>

          {/* Step 2: Wordmark & offline-first POS pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 text-center"
          >
            <p className="text-3xl font-extrabold tracking-tight text-[#0F172A]">
              LoKas
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-500 shadow-xs"
          >
            LokalKas • Offline-First POS
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
