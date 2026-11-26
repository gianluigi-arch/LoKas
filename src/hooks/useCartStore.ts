'use client';

import { create } from 'zustand';
import type { PaymentMethod, ProductRecord } from '@/lib/db';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  maxStock: number;
  icon: ProductRecord['icon'];
  imageUrl?: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  paymentMethod: PaymentMethod;
  addItem: (product: ProductRecord) => void;
  decrementItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  setDiscount: (discount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  discount: 0,
  paymentMethod: 'QRIS',

  addItem: (product) =>
    set((state) => {
      if (product.stock <= 0) return state;
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return state;
        return {
          items: state.items.map((i) =>
            i.productId === product.id
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  maxStock: product.stock,
                  price: product.price,
                  imageUrl: product.imageUrl,
                }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            maxStock: product.stock,
            icon: product.icon,
            imageUrl: product.imageUrl,
            quantity: 1,
          },
        ],
      };
    }),

  decrementItem: (productId) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === productId);
      if (!existing) return state;
      if (existing.quantity <= 1) {
        const nextItems = state.items.filter((i) => i.productId !== productId);
        const nextSubtotal = nextItems.reduce(
          (s, i) => s + i.price * i.quantity,
          0
        );
        return {
          items: nextItems,
          discount: Math.min(state.discount, nextSubtotal),
        };
      }
      const nextItems = state.items.map((i) =>
        i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
      );
      const nextSubtotal = nextItems.reduce(
        (s, i) => s + i.price * i.quantity,
        0
      );
      return {
        items: nextItems,
        discount: Math.min(state.discount, nextSubtotal),
      };
    }),

  setQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        const nextItems = state.items.filter((i) => i.productId !== productId);
        const nextSubtotal = nextItems.reduce(
          (s, i) => s + i.price * i.quantity,
          0
        );
        return {
          items: nextItems,
          discount: Math.min(state.discount, nextSubtotal),
        };
      }
      const nextItems = state.items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(quantity, i.maxStock) }
          : i
      );
      const nextSubtotal = nextItems.reduce(
        (s, i) => s + i.price * i.quantity,
        0
      );
      return {
        items: nextItems,
        discount: Math.min(state.discount, nextSubtotal),
      };
    }),

  removeItem: (productId) =>
    set((state) => {
      const nextItems = state.items.filter((i) => i.productId !== productId);
      const nextSubtotal = nextItems.reduce(
        (s, i) => s + i.price * i.quantity,
        0
      );
      return {
        items: nextItems,
        discount: Math.min(state.discount, nextSubtotal),
      };
    }),

  setDiscount: (discount) =>
    set((state) => {
      const subtotal = state.items.reduce(
        (s, i) => s + i.price * i.quantity,
        0
      );
      const clamped = Math.max(
        0,
        Math.min(Math.round(discount || 0), subtotal)
      );
      return { discount: clamped };
    }),

  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

  clearCart: () => set({ items: [], discount: 0 }),
}));

export function selectCartTotals(items: CartItem[], discount: number) {
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const safeDiscount = Math.max(0, Math.min(discount, subtotal));
  const total = Math.max(0, subtotal - safeDiscount);
  return { totalCount, subtotal, discount: safeDiscount, total };
}
