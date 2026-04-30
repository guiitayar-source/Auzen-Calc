import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  userEmail: string | null;
  ultimoBackup: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
  setUltimoBackup: (data: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      userEmail: null,
      ultimoBackup: null,
      login: (token, email) => set({ accessToken: token, userEmail: email }),
      logout: () => set({ accessToken: null, userEmail: null }),
      setUltimoBackup: (data) => set({ ultimoBackup: data }),
    }),
    { name: 'auzen-auth-storage' }
  )
);
