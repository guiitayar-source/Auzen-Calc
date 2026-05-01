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
  updateLancamento: (id: string, lancamento: Omit<Lancamento, 'id'>) => void;
  removeLancamento: (id: string) => void;
  clearLancamentos: () => void;
}

/**
 * Garante que todos os lançamentos possuem um id único.
 * Necessário para migrar dados antigos do Drive que não tinham id.
 */
function ensureIds(lancamentos: Lancamento[]): Lancamento[] {
  let migrated = false;
  const result = lancamentos.map((l) => {
    if (!l.id) {
      migrated = true;
      return { ...l, id: crypto.randomUUID() };
    }
    return l;
  });
  if (migrated) {
    console.info('[Auzên] IDs gerados automaticamente para lançamentos antigos.');
  }
  return result;
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
      updateLancamento: (id, lancamento) =>
        set((state) => ({
          lancamentos: state.lancamentos.map((l) =>
            l.id === id ? { ...lancamento, id } : l
          ),
        })),
      removeLancamento: (id) =>
        set((state) => ({
          lancamentos: state.lancamentos.filter((l) => l.id !== id),
        })),
      clearLancamentos: () => set({ lancamentos: [] }),
    }),
    {
      name: 'auzen-lancamentos-storage',
      onRehydrateStorage: () => (state) => {
        // Ao carregar do localStorage, garante que todos os itens tenham id
        if (state && state.lancamentos) {
          const migrated = ensureIds(state.lancamentos);
          if (migrated !== state.lancamentos) {
            useLancamentosStore.setState({ lancamentos: migrated });
          }
        }
      },
    }
  )
);

/**
 * Função utilitária para garantir IDs ao restaurar dados do Drive.
 * Usada no handleRestore da página Configurações.
 */
export { ensureIds };
