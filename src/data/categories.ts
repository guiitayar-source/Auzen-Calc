export type TipoCategoria = 'Receita' | 'Despesa';
export type CentroDeCusto = 'Creche' | 'Clínica' | 'Geral';

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  centroDeCusto: CentroDeCusto;
}

export const categoriasIniciais: Categoria[] = [
  // Receitas - Creche
  { id: '1', nome: 'Mensalidades', tipo: 'Receita', centroDeCusto: 'Creche' },
  { id: '2', nome: 'Diárias Avulsas', tipo: 'Receita', centroDeCusto: 'Creche' },
  { id: '3', nome: 'Avaliação Comportamental', tipo: 'Receita', centroDeCusto: 'Creche' },
  
  // Receitas - Clínica
  { id: '4', nome: 'Consultas', tipo: 'Receita', centroDeCusto: 'Clínica' },
  { id: '5', nome: 'Vacinas', tipo: 'Receita', centroDeCusto: 'Clínica' },
  { id: '6', nome: 'Exames', tipo: 'Receita', centroDeCusto: 'Clínica' },
  { id: '7', nome: 'Procedimentos', tipo: 'Receita', centroDeCusto: 'Clínica' },
  { id: '8', nome: 'Farmácia', tipo: 'Receita', centroDeCusto: 'Clínica' },
  
  // Despesas - Creche
  { id: '9', nome: 'Insumos Creche', tipo: 'Despesa', centroDeCusto: 'Creche' },
  { id: '10', nome: 'Limpeza', tipo: 'Despesa', centroDeCusto: 'Creche' },
  
  // Despesas - Clínica
  { id: '11', nome: 'Insumos Médicos', tipo: 'Despesa', centroDeCusto: 'Clínica' },
  { id: '12', nome: 'Comissões', tipo: 'Despesa', centroDeCusto: 'Clínica' },
  
  // Despesas - Geral
  { id: '13', nome: 'Aluguel', tipo: 'Despesa', centroDeCusto: 'Geral' },
  { id: '14', nome: 'Contas Fixas (Água/Luz/Internet)', tipo: 'Despesa', centroDeCusto: 'Geral' },
  { id: '15', nome: 'Folha de Pagamento', tipo: 'Despesa', centroDeCusto: 'Geral' },
  { id: '16', nome: 'Contabilidade/Impostos', tipo: 'Despesa', centroDeCusto: 'Geral' },
  { id: '17', nome: 'Marketing', tipo: 'Despesa', centroDeCusto: 'Geral' }
];
