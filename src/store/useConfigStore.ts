import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
  diasAlertaVencimento: number;
  setDiasAlertaVencimento: (dias: number) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      diasAlertaVencimento: 5,
      setDiasAlertaVencimento: (dias) => set({ diasAlertaVencimento: dias }),
    }),
    { name: 'auzen-config-storage' }
  )
);
