'use client';

import { create } from 'zustand';

interface UiState {
  isQrisModalOpen: boolean;
  openQrisModal: () => void;
  closeQrisModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isQrisModalOpen: false,
  openQrisModal: () => set({ isQrisModalOpen: true }),
  closeQrisModal: () => set({ isQrisModalOpen: false }),
}));
