import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { categoriasIniciais } from '../data/categories';
import type { Categoria } from '../data/categories';

interface CategoriasState {
  categorias: Categoria[];
  addCategoria: (categoria: Omit<Categoria, 'id'>) => void;
  deleteCategoria: (id: string) => void;
}

export const useCategoriasStore = create<CategoriasState>()(
  persist(
    (set) => ({
      categorias: categoriasIniciais,
      addCategoria: (categoria) =>
        set((state) => ({
          categorias: [
            ...state.categorias,
            { ...categoria, id: crypto.randomUUID() },
          ],
        })),
      deleteCategoria: (id) =>
        set((state) => ({
          categorias: state.categorias.filter((c) => c.id !== id),
        })),
    }),
    { name: 'auzen-categorias-storage' }
  )
);
