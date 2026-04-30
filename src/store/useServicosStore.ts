import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Servico {
  id: string;
  nome: string;
}

interface ServicosState {
  servicos: Servico[];
  addServico: (nome: string) => void;
  removeServico: (id: string) => void;
}

export const useServicosStore = create<ServicosState>()(
  persist(
    (set) => ({
      servicos: [
        { id: '1', nome: 'Consulta Vet' },
        { id: '2', nome: 'Diária Creche' },
        { id: '3', nome: 'Banho e Tosa' },
      ],
      addServico: (nome) =>
        set((state) => ({
          servicos: [
            ...state.servicos,
            { id: crypto.randomUUID(), nome },
          ],
        })),
      removeServico: (id) =>
        set((state) => ({
          servicos: state.servicos.filter((s) => s.id !== id),
        })),
    }),
    { name: 'auzen-servicos-storage' }
  )
);
