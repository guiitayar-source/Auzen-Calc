import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TipoCategoria } from '../data/categories';

export interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: TipoCategoria;
  categoriaId: string;
  status: 'Pago' | 'Pendente';
  recorrencia: 'Única' | 'Mensal';
}

interface LancamentosState {
  lancamentos: Lancamento[];
  addLancamento: (lancamento: Omit<Lancamento, 'id'>) => void;
  clearLancamentos: () => void;
}

export const useLancamentosStore = create<LancamentosState>()(
  persist(
    (set) => ({
      lancamentos: [],
      addLancamento: (lancamento) =>
        set((state) => ({
          lancamentos: [
            { ...lancamento, id: crypto.randomUUID() },
            ...state.lancamentos,
          ],
        })),
      clearLancamentos: () => set({ lancamentos: [] }),
    }),
    { name: 'auzen-lancamentos-storage' }
  )
);
