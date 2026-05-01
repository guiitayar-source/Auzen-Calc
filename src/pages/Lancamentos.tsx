import React, { useState, useMemo } from 'react';
import { lerRecibo } from '../services/geminiService';
import type { TipoCategoria } from '../data/categories';
import { useLancamentosStore } from '../store/useLancamentosStore';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { Pencil, Trash2, X } from 'lucide-react';

type FiltroTipo = 'Todos' | 'Receita' | 'Despesa';

export default function Lancamentos() {
  const { lancamentos, addLancamento, updateLancamento, removeLancamento } = useLancamentosStore();
  const { categorias } = useCategoriasStore();

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<TipoCategoria>('Receita');
  const [categoriaId, setCategoriaId] = useState('');
  const [status, setStatus] = useState<'Pago' | 'Pendente'>('Pago');
  const [recorrencia, setRecorrencia] = useState<'Única' | 'Mensal'>('Única');
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'success' | 'partial' | 'error'>('idle');

  // Estado de edição
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filtro de visualização
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('Todos');

  const categoriasFiltradas = categorias.filter(cat => cat.tipo === tipo);

  const lancamentosFiltrados = useMemo(() => {
    if (filtroTipo === 'Todos') return lancamentos;
    return lancamentos.filter(l => l.tipo === filtroTipo);
  }, [lancamentos, filtroTipo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !valor || !data || !categoriaId) return;

    if (editingId) {
      // Modo edição: atualiza o lançamento existente
      updateLancamento(editingId, {
        descricao,
        valor: parseFloat(valor),
        data,
        tipo,
        categoriaId,
        status,
        recorrencia,
      });
      setEditingId(null);
    } else {
      // Modo criação: adiciona novo lançamento
      addLancamento({
        descricao,
        valor: parseFloat(valor),
        data,
        tipo,
        categoriaId,
        status,
        recorrencia,
      });
    }

    // Limpar form
    setDescricao('');
    setValor('');
    setCategoriaId('');
    setStatus('Pago');
    setRecorrencia('Única');
  };

  const handleEditar = (item: typeof lancamentos[0]) => {
    setEditingId(item.id);
    setDescricao(item.descricao);
    setValor(item.valor.toString());
    setData(item.data);
    setTipo(item.tipo);
    setCategoriaId(item.categoriaId);
    setStatus(item.status);
    setRecorrencia(item.recorrencia);
  };

  const handleCancelarEdicao = () => {
    setEditingId(null);
    setDescricao('');
    setValor('');
    setCategoriaId('');
    setStatus('Pago');
    setRecorrencia('Única');
  };

  const handleEliminar = (id: string) => {
    if (window.confirm('Tem a certeza de que deseja eliminar este lançamento?')) {
      removeLancamento(id);
      // Se estava editando este item, limpar o form
      if (editingId === id) {
        handleCancelarEdicao();
      }
    }
  };

  const handleLerRecibo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    setOcrStatus('idle');
    try {
      const dados = await lerRecibo(file);

      let camposPreenchidos = 0;

      if (dados.data) {
        // Converte DD/MM/AAAA -> AAAA-MM-DD para o input HTML
        const partes = dados.data.split('/');
        if (partes.length === 3) {
          setData(`${partes[2]}-${partes[1]}-${partes[0]}`);
          camposPreenchidos++;
        }
      }

      if (dados.valor !== null && dados.valor !== undefined) {
        setValor(dados.valor.toString());
        camposPreenchidos++;
      }

      if (dados.descricao) {
        setDescricao(dados.descricao);
        camposPreenchidos++;
      } else {
        setDescricao('Despesa via Recibo');
      }

      setTipo('Despesa');
      setOcrStatus(camposPreenchidos >= 2 ? 'success' : 'partial');
    } catch (error) {
      console.error('Erro no Gemini Vision:', error);
      setOcrStatus('error');
    } finally {
      setIsOcrLoading(false);
      e.target.value = '';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCategoriaNome = (id: string) => {
    const cat = categorias.find(c => c.id === id);
    return cat ? `${cat.nome} (${cat.centroDeCusto})` : '';
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-auzen-text mb-6">Lançamentos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Área A: Formulário */}
        <div className="lg:col-span-1 bg-auzen-white p-6 rounded-xl shadow-sm border border-auzen-primary/10 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-auzen-text">
              {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h2>
            {editingId && (
              <button
                onClick={handleCancelarEdicao}
                className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50 cursor-pointer"
                title="Cancelar edição"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Indicador visual de modo edição */}
          {editingId && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700 font-medium">
                ✏️ Editando lançamento. Ajuste os campos e clique em "Atualizar Lançamento".
              </p>
            </div>
          )}

          {/* Botão de Upload de Recibo — oculto em modo edição */}
          {!editingId && (
            <div className="mb-4">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                id="recibo-upload" 
                className="hidden" 
                onChange={handleLerRecibo}
                disabled={isOcrLoading}
              />
              <label 
                htmlFor="recibo-upload" 
                className={`flex items-center justify-center gap-2 font-medium py-2.5 px-4 rounded-lg cursor-pointer transition-all border border-dashed text-sm
                  ${ isOcrLoading
                    ? 'bg-auzen-bg border-auzen-primary/30 text-auzen-primary/60 cursor-not-allowed animate-pulse'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-300 hover:border-auzen-primary/40'
                  }
                `}
              >
                {isOcrLoading ? (
                  <span>⏳ Analisando com IA... Aguarde...</span>
                ) : (
                  <>
                    <span>📸</span>
                    <span>Ler Recibo com IA <span className="text-[10px] bg-auzen-primary/10 text-auzen-primary px-1.5 py-0.5 rounded-full font-bold uppercase">Gemini</span></span>
                  </>
                )}
              </label>

              {/* Feedback de resultado */}
              {ocrStatus === 'success' && (
                <p className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  ✅ Dados lidos com sucesso! Confira e ajuste se necessário.
                </p>
              )}
              {ocrStatus === 'partial' && (
                <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  ⚠️ Leitura parcial. Alguns campos precisam ser preenchidos manualmente.
                </p>
              )}
              {ocrStatus === 'error' && (
                <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  ❌ Não foi possível ler o recibo. Tente uma foto mais nítida e bem iluminada.
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo (Toggle) */}
            <div className="flex bg-auzen-bg rounded-lg p-1">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tipo === 'Receita' ? 'bg-auzen-mint/40 text-green-800 shadow-sm' : 'text-auzen-text/60 hover:text-auzen-text'}`}
                onClick={() => { setTipo('Receita'); setCategoriaId(''); }}
              >
                Receita
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tipo === 'Despesa' ? 'bg-red-100 text-red-800 shadow-sm' : 'text-auzen-text/60 hover:text-auzen-text'}`}
                onClick={() => { setTipo('Despesa'); setCategoriaId(''); }}
              >
                Despesa
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-auzen-text mb-1">Descrição</label>
              <input 
                type="text" 
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                placeholder="Ex: Consulta Dra. Maria"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-auzen-text mb-1">Valor (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-auzen-text mb-1">Data</label>
              <input 
                type="date" 
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-auzen-text mb-1">Categoria</label>
              <select 
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                required
              >
                <option value="" disabled>Selecione uma categoria...</option>
                {categoriasFiltradas.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome} ({cat.centroDeCusto})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Status</label>
                <div className="flex bg-auzen-bg rounded-lg p-1 border border-gray-200">
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${status === 'Pago' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-auzen-text/60 hover:text-auzen-text'}`}
                    onClick={() => setStatus('Pago')}
                  >
                    Pago
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${status === 'Pendente' ? 'bg-yellow-100 text-yellow-800 shadow-sm' : 'text-auzen-text/60 hover:text-auzen-text'}`}
                    onClick={() => setStatus('Pendente')}
                  >
                    Pendente
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Recorrência</label>
                <select
                  value={recorrencia}
                  onChange={(e) => setRecorrencia(e.target.value as 'Única' | 'Mensal')}
                  className="w-full border border-gray-200 rounded-lg px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                >
                  <option value="Única">Única</option>
                  <option value="Mensal">Mensal</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className={`w-full font-medium py-3 px-4 rounded-lg transition-colors shadow-sm cursor-pointer mt-2 ${
                editingId
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-auzen-primary hover:bg-auzen-primary/90 text-white'
              }`}
            >
              {editingId ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
            </button>
          </form>
        </div>

        {/* Área B: Lista */}
        <div className="lg:col-span-2 bg-auzen-white rounded-xl shadow-sm border border-auzen-primary/10 overflow-hidden flex flex-col h-fit max-h-[800px]">
          <div className="p-6 border-b border-gray-100 bg-auzen-white sticky top-0 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-auzen-text">Lançamentos Recentes</h2>
              <span className="bg-auzen-bg text-auzen-text/70 px-3 py-1 rounded-full text-xs font-bold border border-auzen-primary/10">
                {lancamentosFiltrados.length} de {lancamentos.length}
              </span>
            </div>

            {/* Filtro de tipo */}
            <div className="flex bg-auzen-bg rounded-lg p-1 border border-gray-200">
              {(['Todos', 'Receita', 'Despesa'] as FiltroTipo[]).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setFiltroTipo(opcao)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    filtroTipo === opcao
                      ? opcao === 'Receita'
                        ? 'bg-auzen-mint/40 text-green-800 shadow-sm'
                        : opcao === 'Despesa'
                          ? 'bg-red-100 text-red-800 shadow-sm'
                          : 'bg-auzen-white text-auzen-text shadow-sm'
                      : 'text-auzen-text/60 hover:text-auzen-text'
                  }`}
                >
                  {opcao === 'Todos' ? 'Todos' : opcao === 'Receita' ? 'Apenas Receitas' : 'Apenas Despesas'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto overflow-y-auto">
            {lancamentosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>
                  {lancamentos.length === 0
                    ? 'Nenhum lançamento registrado ainda.'
                    : 'Nenhum lançamento corresponde ao filtro selecionado.'
                  }
                </p>
              </div>
            ) : (
              <table className="w-full text-left bg-auzen-white">
                <thead className="bg-auzen-bg/50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Data</th>
                    <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Descrição</th>
                    <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Categoria</th>
                    <th className="px-6 py-3 font-semibold text-sm text-right text-auzen-text">Valor</th>
                    <th className="px-4 py-3 font-semibold text-sm text-center text-auzen-text w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lancamentosFiltrados.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-auzen-lilac/50 transition-colors group bg-auzen-white ${
                        editingId === item.id ? 'ring-2 ring-amber-300 ring-inset bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-auzen-text whitespace-nowrap">
                        {/* Gambiarra para evitar fuso horário que altera o dia selecionado */}
                        {new Date(item.data + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-auzen-text">
                        <div className="flex items-center gap-2">
                          {item.descricao}
                          {item.status === 'Pendente' ? (
                            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Pendente</span>
                          ) : (
                            <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Pago</span>
                          )}
                          {item.recorrencia === 'Mensal' && (
                            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Mensal</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="bg-auzen-bg px-2 py-1 rounded text-xs font-medium border border-auzen-primary/10 text-auzen-text whitespace-nowrap">
                          {getCategoriaNome(item.categoriaId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-right whitespace-nowrap">
                        {item.tipo === 'Receita' ? (
                          <span className="text-green-700 bg-auzen-mint/20 px-2 py-1 rounded">
                            {formatCurrency(item.valor)}
                          </span>
                        ) : (
                          <span className="text-red-600 bg-red-50 px-2 py-1 rounded">
                            -{formatCurrency(item.valor)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditar(item)}
                            className="text-gray-400 hover:text-amber-600 transition-colors p-1.5 rounded-full hover:bg-amber-50 cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleEliminar(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50 cursor-pointer"
                            title="Eliminar lançamento"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
