import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Concorrente {
  id: string;
  nomeEstabelecimento: string;
  servico: string;
  preco: number;
  data: string;
  bairro: string;
  tipoEstabelecimento: string;
  promocao: string;
  observacao: string;
}

export interface PrecoAuzen {
  id: string;
  servico: string;
  preco: number;
  observacao: string;
  promocao: string;
}

interface MercadoState {
  concorrentes: Concorrente[];
  precosBaseAuzen: PrecoAuzen[];
  addConcorrente: (concorrente: Omit<Concorrente, 'id'>) => void;
  removeConcorrente: (id: string) => void;
  addPrecoAuzen: (preco: Omit<PrecoAuzen, 'id'>) => void;
  removePrecoAuzen: (id: string) => void;
}

export const useMercadoStore = create<MercadoState>()(
  persist(
    (set) => ({
      concorrentes: [
        { id: '1', nomeEstabelecimento: 'Pet Shop XYZ', servico: 'Consulta Vet', preco: 150, data: '2026-01-10', bairro: 'Centro', tipoEstabelecimento: 'PetShop', promocao: 'Nenhuma', observacao: 'Geral' },
        { id: '1b', nomeEstabelecimento: 'Pet Shop XYZ', servico: 'Consulta Vet', preco: 160, data: '2026-03-15', bairro: 'Centro', tipoEstabelecimento: 'PetShop', promocao: 'Nenhuma', observacao: 'Geral' },
        { id: '2', nomeEstabelecimento: 'Clínica Saúde Animal', servico: 'Consulta Vet', preco: 180, data: '2026-02-01', bairro: 'Jardins', tipoEstabelecimento: 'Clínica e PetShop', promocao: '10% no 1º mês', observacao: 'Especialista' },
        { id: '2b', nomeEstabelecimento: 'Clínica Saúde Animal', servico: 'Consulta Vet', preco: 190, data: '2026-04-10', bairro: 'Jardins', tipoEstabelecimento: 'Clínica e PetShop', promocao: 'Nenhuma', observacao: 'Especialista' },
        { id: '3', nomeEstabelecimento: 'Hotelzinho Dog Feliz', servico: 'Diária Creche', preco: 80, data: '2026-01-20', bairro: 'Vila Mariana', tipoEstabelecimento: 'Só Creche', promocao: 'Nenhuma', observacao: 'Pacote 5x' },
        { id: '3b', nomeEstabelecimento: 'Hotelzinho Dog Feliz', servico: 'Diária Creche', preco: 95, data: '2026-04-05', bairro: 'Vila Mariana', tipoEstabelecimento: 'Só Creche', promocao: 'Nenhuma', observacao: 'Pacote 5x' },
      ],
      precosBaseAuzen: [
        { id: 'a1', servico: 'Consulta Vet', preco: 200, observacao: 'Geral', promocao: 'Nenhuma' },
        { id: 'a2', servico: 'Diária Creche', preco: 100, observacao: 'Avulso', promocao: 'Nenhuma' },
      ],
      addConcorrente: (concorrente) =>
        set((state) => ({
          concorrentes: [
            { ...concorrente, id: crypto.randomUUID() },
            ...state.concorrentes,
          ],
        })),
      removeConcorrente: (id) =>
        set((state) => ({
          concorrentes: state.concorrentes.filter((c) => c.id !== id),
        })),
      addPrecoAuzen: (preco) =>
        set((state) => ({
          precosBaseAuzen: [
            { ...preco, id: crypto.randomUUID() },
            ...state.precosBaseAuzen,
          ],
        })),
      removePrecoAuzen: (id) =>
        set((state) => ({
          precosBaseAuzen: state.precosBaseAuzen.filter((p) => p.id !== id),
        })),
    }),
    { name: 'auzen-mercado-storage' }
  )
);
