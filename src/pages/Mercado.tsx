import React, { useState, useMemo, useEffect } from 'react';
import { useMercadoStore } from '../store/useMercadoStore';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { Trash2 } from 'lucide-react';
import { useServicosStore } from '../store/useServicosStore';

export default function Mercado() {
  const { concorrentes, precosBaseAuzen, addConcorrente, removeConcorrente, addPrecoAuzen, removePrecoAuzen } = useMercadoStore();
  const { servicos: servicosCatalogo } = useServicosStore();

  const [nomeEstabelecimento, setNomeEstabelecimento] = useState('');
  const [servico, setServico] = useState('');
  const [preco, setPreco] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [bairro, setBairro] = useState('');
  const [tipoEstabelecimento, setTipoEstabelecimento] = useState('Só Creche');
  const [promocao, setPromocao] = useState('');
  const [observacao, setObservacao] = useState('');

  const [servicoBase, setServicoBase] = useState('');
  const [precoBase, setPrecoBaseValue] = useState('');
  const [observacaoBase, setObservacaoBase] = useState('');
  const [promocaoBase, setPromocaoBase] = useState('');

  // Estados para o gráfico de evolução
  const [servicoSelecionado, setServicoSelecionado] = useState('');
  const [concorrentesSelecionados, setConcorrentesSelecionados] = useState<string[]>([]);

  const handleSubmitConcorrente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEstabelecimento || !servico || !preco || !data) return;

    addConcorrente({
      nomeEstabelecimento,
      servico,
      preco: parseFloat(preco),
      data,
      bairro,
      tipoEstabelecimento,
      promocao: promocao || 'Nenhuma',
      observacao: observacao || 'Geral',
    });

    setNomeEstabelecimento('');
    setServico('');
    setPreco('');
    setData(new Date().toISOString().split('T')[0]);
    setBairro('');
    setTipoEstabelecimento('Só Creche');
    setPromocao('');
    setObservacao('');
  };

  const handleSubmitPrecoBase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicoBase || !precoBase) return;

    addPrecoAuzen({
      servico: servicoBase,
      preco: parseFloat(precoBase),
      observacao: observacaoBase || 'Geral',
      promocao: promocaoBase || 'Nenhuma',
    });

    setServicoBase('');
    setPrecoBaseValue('');
    setObservacaoBase('');
    setPromocaoBase('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Nomes de todos os estabelecimentos únicos
  const todosEstabelecimentos = useMemo(() => {
    return Array.from(new Set(concorrentes.map(c => c.nomeEstabelecimento)));
  }, [concorrentes]);

  // Serviços únicos (do catálogo + os que já tem registros)
  const todosServicos = useMemo(() => {
    const servicosNoMercado = concorrentes.map(c => c.servico);
    const servicosNaAuzen = precosBaseAuzen.map(p => p.servico);
    const nomesCatalogo = servicosCatalogo.map(s => s.nome);
    return Array.from(new Set([...servicosNoMercado, ...servicosNaAuzen, ...nomesCatalogo]));
  }, [concorrentes, precosBaseAuzen, servicosCatalogo]);

  // Inicializar servicoSelecionado se vazio
  useEffect(() => {
    if (!servicoSelecionado && todosServicos.length > 0) {
      setServicoSelecionado(todosServicos[0]);
    }
  }, [todosServicos, servicoSelecionado]);

  const toggleConcorrente = (nome: string) => {
    setConcorrentesSelecionados(prev => {
      if (prev.includes(nome)) {
        return prev.filter(n => n !== nome);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, nome];
    });
  };

  // Dados para o LineChart (Evolução Temporal)
  const dataEvolucao = useMemo(() => {
    if (!servicoSelecionado) return [];

    // Pegar todas as datas únicas para o serviço selecionado
    const datas = Array.from(new Set(
      concorrentes
        .filter(c => c.servico === servicoSelecionado)
        .map(c => c.data)
    )).sort();

    return datas.map(dt => {
      const point: any = {
        dataOriginal: dt,
        data: new Date(dt + 'T12:00:00Z').toLocaleDateString('pt-BR')
      };

      // Adicionar preços de cada concorrente selecionado nesta data
      concorrentesSelecionados.forEach(nome => {
        const reg = concorrentes.find(c => c.servico === servicoSelecionado && c.nomeEstabelecimento === nome && c.data === dt);
        if (reg) {
          point[nome] = reg.preco;
        }
      });

      // Adicionar preço base da Auzen (primeiro que combine com o serviço)
      const pAuzen = precosBaseAuzen.find(p => p.servico === servicoSelecionado);
      if (pAuzen) {
        point['Auzên'] = pAuzen.preco;
      }

      return point;
    });
  }, [concorrentes, servicoSelecionado, concorrentesSelecionados, precosBaseAuzen]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-auzen-text mb-6">Análise de Mercado</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Área A: Formulários */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-auzen-white p-6 rounded-xl shadow-sm border border-auzen-primary/10">
            <h2 className="text-xl font-bold text-auzen-text mb-4">Novo Registro</h2>

            <form onSubmit={handleSubmitConcorrente} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Nome do Estabelecimento</label>
                <input
                  type="text"
                  value={nomeEstabelecimento}
                  onChange={(e) => setNomeEstabelecimento(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                  placeholder="Ex: Pet Shop XYZ"
                  list="estabelecimentos-list"
                  required
                />
                <datalist id="estabelecimentos-list">
                  {todosEstabelecimentos.map(e => <option key={e} value={e} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Serviço/Produto</label>
                <input
                  type="text"
                  value={servico}
                  onChange={(e) => setServico(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                  placeholder="Ex: Diária Creche"
                  list="servicos-list"
                  required
                />
                <datalist id="servicos-list">
                  {servicosCatalogo.map(s => <option key={s.id} value={s.nome} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Bairro</label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                  placeholder="Ex: Vila Mariana"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Tipo de Estabelecimento</label>
                <select
                  value={tipoEstabelecimento}
                  onChange={(e) => setTipoEstabelecimento(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                  required
                >
                  <option value="Só Creche">Só Creche</option>
                  <option value="Clínica e PetShop">Clínica e PetShop</option>
                  <option value="Hospital 24h">Hospital 24h</option>
                  <option value="PetShop">PetShop</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Promoção Vigente</label>
                <input
                  type="text"
                  value={promocao}
                  onChange={(e) => setPromocao(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                  placeholder="Ex: 10% no 1º mês (Opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Pacote/Observação</label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                  placeholder="Ex: 3x na semana / Plano Mensal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-auzen-text mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                    placeholder="0.00"
                    required
                  />
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
              </div>

              <button
                type="submit"
                className="w-full bg-auzen-primary hover:bg-auzen-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm cursor-pointer mt-2"
              >
                Salvar Registro
              </button>
            </form>
          </div>

          <div className="bg-auzen-white p-6 rounded-xl shadow-sm border border-auzen-primary/10">
            <h2 className="text-xl font-bold text-auzen-text mb-4">Preço Base Auzên</h2>
            <form onSubmit={handleSubmitPrecoBase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Serviço</label>
                <select
                  value={servicoBase}
                  onChange={(e) => setServicoBase(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                  required
                >
                  <option value="" disabled>Selecione...</option>
                  {servicosCatalogo.map(s => (
                    <option key={s.id} value={s.nome}>{s.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Preço Base (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precoBase}
                  onChange={(e) => setPrecoBaseValue(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Pacote/Obs (Auzên)</label>
                <input
                  type="text"
                  value={observacaoBase}
                  onChange={(e) => setObservacaoBase(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                  placeholder="Ex: Avulso / Pacote Mensal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-auzen-text mb-1">Promoção Ativa</label>
                <input
                  type="text"
                  value={promocaoBase}
                  onChange={(e) => setPromocaoBase(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                  placeholder="Ex: Desconto de inauguração"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-auzen-mint hover:bg-auzen-mint/90 text-green-800 font-medium py-3 px-4 rounded-lg transition-colors shadow-sm cursor-pointer mt-2"
              >
                Adicionar Preço Auzên
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
              <h3 className="text-sm font-bold text-auzen-text mb-2">Tabela de Preços Auzên</h3>
              {precosBaseAuzen.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-auzen-bg/50 p-3 rounded-lg border border-auzen-primary/5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-auzen-text">{p.servico}</span>
                    <span className="text-[10px] text-gray-400">{p.observacao}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-auzen-primary">{formatCurrency(p.preco)}</span>
                    <button
                      onClick={() => removePrecoAuzen(p.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Área B: Gráfico de Evolução */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-auzen-white rounded-xl shadow-sm border border-auzen-primary/10 overflow-hidden flex flex-col h-fit">
            <div className="p-6 border-b border-gray-100 bg-auzen-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-auzen-text">Evolução de Preços</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-500 whitespace-nowrap">Serviço:</label>
                <select
                  value={servicoSelecionado}
                  onChange={(e) => setServicoSelecionado(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 bg-white"
                >
                  {todosServicos.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <p className="text-sm font-medium text-auzen-text mb-3">Compare até 3 empresas:</p>
              <div className="flex flex-wrap gap-2">
                {todosEstabelecimentos.map(nome => (
                  <button
                    key={nome}
                    onClick={() => toggleConcorrente(nome)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${concorrentesSelecionados.includes(nome)
                        ? 'bg-auzen-primary text-white border-auzen-primary shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-auzen-primary/30'
                      } ${!concorrentesSelecionados.includes(nome) && concorrentesSelecionados.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 min-h-[400px]">
              {dataEvolucao.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dataEvolucao} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="data" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v}`} />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend />

                    {/* Linha da Auzen */}
                    <Line
                      type="monotone"
                      dataKey="Auzên"
                      stroke="var(--color-auzen-primary)"
                      strokeWidth={3}
                      dot={{ r: 6, fill: "var(--color-auzen-primary)" }}
                      activeDot={{ r: 8 }}
                    />

                    {/* Linhas dos concorrentes */}
                    {concorrentesSelecionados.map((nome, index) => {
                      const colors = ['#6B7280', '#9CA3AF', '#4B5563'];
                      return (
                        <Line
                          key={nome}
                          type="monotone"
                          dataKey={nome}
                          stroke={colors[index % colors.length]}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 space-y-2">
                  <span className="text-4xl">📈</span>
                  <p>Selecione empresas acima para visualizar a evolução temporal.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Área C: Tabela de Raio-X */}
      <div className="bg-auzen-white p-6 rounded-xl shadow-sm border border-auzen-primary/10 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-auzen-text">Raio-X da Concorrência</h2>
          <span className="bg-auzen-primary/10 text-auzen-primary px-3 py-1 rounded-full text-xs font-bold">
            {concorrentes.length} Registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-auzen-bg/50">
              <tr>
                <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Estabelecimento</th>
                <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Bairro</th>
                <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Tipo</th>
                <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Serviço/Pacote</th>
                <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Preço</th>
                <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Promoção</th>
                <th className="px-6 py-3 font-semibold text-sm text-auzen-text text-right">Data</th>
                <th className="px-6 py-3 font-semibold text-sm text-center text-auzen-text">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {concorrentes.map((c) => (
                <tr key={c.id} className="hover:bg-auzen-lilac/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-auzen-text">{c.nomeEstabelecimento}</td>
                  <td className="px-6 py-4 text-sm text-auzen-text">{c.bairro}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">
                      {c.tipoEstabelecimento}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-auzen-text">
                    <div className="flex flex-col">
                      <span className="font-medium">{c.servico}</span>
                      <span className="text-[10px] text-gray-400 italic">{c.observacao}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-auzen-text">{formatCurrency(c.preco)}</td>
                  <td className="px-6 py-4 text-sm">
                    {c.promocao && c.promocao !== 'Nenhuma' ? (
                      <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 rounded text-xs">
                        🔥 {c.promocao}
                      </span>
                    ) : (
                      <span className="text-gray-400">---</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">
                    {new Date(c.data + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => removeConcorrente(c.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer p-1"
                      title="Excluir registro"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {concorrentes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                    Nenhum registro de concorrência encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
