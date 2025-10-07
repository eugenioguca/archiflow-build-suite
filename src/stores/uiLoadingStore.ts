/**
 * Global UI loading state store
 * Manages loading overlays to prevent stuck/frozen UI states
 */
import { create } from 'zustand';

interface UILoadingState {
  isActive: boolean;
  start: () => void;
  stop: () => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

export const useUILoadingStore = create<UILoadingState>((set) => ({
  isActive: false,
  
  start: () => set({ isActive: true }),
  
  stop: () => set({ isActive: false }),
  
  withLoading: async <T>(fn: () => Promise<T>): Promise<T> => {
    set({ isActive: true });
    try {
      return await fn();
    } finally {
      set({ isActive: false });
    }
  },
}));
