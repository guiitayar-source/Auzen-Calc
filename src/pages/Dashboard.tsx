import { useMemo } from 'react';
import { useLancamentosStore } from '../store/useLancamentosStore';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useConfigStore } from '../store/useConfigStore';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { lancamentos } = useLancamentosStore();
  const { categorias } = useCategoriasStore();
  const { diasAlertaVencimento } = useConfigStore();

  const { totalReceitas, totalDespesas, saldoAtual, dataPieChart, dataBarChart, projecaoGastos, alertas, ticketMedioClinica, ticketMedioCreche } = useMemo(() => {
    let rec = 0;
    let des = 0;
    let projG = 0;
    let recClinica = 0;
    let countClinica = 0;
    let recCreche = 0;
    let countCreche = 0;
    const centroDeCustoMap: Record<string, number> = {
      'Creche': 0,
      'Clínica': 0,
      'Geral': 0
    };

    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const dataHojeFormatada = hoje.toISOString().split('T')[0];

    const alertasPendentes: any[] = [];

    lancamentos.forEach(l => {
      if (l.tipo === 'Receita') {
        rec += l.valor;
        const categoria = categorias.find(c => c.id === l.categoriaId);
        if (categoria) {
          centroDeCustoMap[categoria.centroDeCusto] += l.valor;
          if (categoria.centroDeCusto === 'Clínica') {
            recClinica += l.valor;
            countClinica++;
          } else if (categoria.centroDeCusto === 'Creche') {
            recCreche += l.valor;
            countCreche++;
          }
        }
      } else {
        des += l.valor;
        
        if (l.status === 'Pendente') {
          const [anoL, mesL] = l.data.split('-');
          if (parseInt(anoL) === anoAtual && parseInt(mesL) - 1 === mesAtual) {
            projG += l.valor;
          }

          if (l.data < dataHojeFormatada) {
            alertasPendentes.push({ ...l, estadoAlerta: 'Atrasado' });
          } else {
            const dateL = new Date(l.data + 'T12:00:00Z');
            const dataHojeSemHora = new Date(dataHojeFormatada + 'T12:00:00Z');
            const diffTime = dateL.getTime() - dataHojeSemHora.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= diasAlertaVencimento) {
              alertasPendentes.push({ ...l, estadoAlerta: 'A Vencer' });
            }
          }
        }
      }
    });

    const pieData = Object.entries(centroDeCustoMap)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const barData = [
      { name: 'Receitas', value: rec },
      { name: 'Despesas', value: des }
    ];

    const ticketMedioClinica = countClinica > 0 ? recClinica / countClinica : 0;
    const ticketMedioCreche = countCreche > 0 ? recCreche / countCreche : 0;

    return {
      totalReceitas: rec,
      totalDespesas: des,
      saldoAtual: rec - des,
      dataPieChart: pieData,
      dataBarChart: barData,
      projecaoGastos: projG,
      alertas: alertasPendentes.sort((a, b) => a.data.localeCompare(b.data)),
      ticketMedioClinica,
      ticketMedioCreche
    };
  }, [lancamentos, categorias]);

  const ultimosLancamentos = lancamentos.slice(0, 5);

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

  const PIE_COLORS = ['var(--color-auzen-primary)', 'var(--color-auzen-mint)', '#FCD34D'];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-auzen-text mb-6">Dashboard</h1>

      {/* Área A: Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-auzen-white rounded-xl p-6 shadow-sm border border-auzen-primary/10">
          <h2 className="text-sm font-semibold mb-2 text-auzen-text/70 uppercase tracking-wider">Receitas</h2>
          <p className="text-3xl font-bold text-green-700 bg-auzen-mint/20 inline-block px-3 py-1 rounded-md">
            {formatCurrency(totalReceitas)}
          </p>
        </div>
        <div className="bg-auzen-white rounded-xl p-6 shadow-sm border border-auzen-primary/10">
          <h2 className="text-sm font-semibold mb-2 text-auzen-text/70 uppercase tracking-wider">Despesas (Total)</h2>
          <p className="text-3xl font-bold text-red-600 bg-red-50 inline-block px-3 py-1 rounded-md">
            {formatCurrency(totalDespesas)}
          </p>
        </div>
        <div className="bg-auzen-white rounded-xl p-6 shadow-sm border border-auzen-primary/10">
          <h2 className="text-sm font-semibold mb-2 text-auzen-text/70 uppercase tracking-wider">Projeção (Mês Atual)</h2>
          <p className="text-3xl font-bold text-auzen-text inline-block px-3 py-1 bg-gray-100 rounded-md">
            {formatCurrency(projecaoGastos)}
          </p>
        </div>
        <div className="bg-auzen-primary text-white rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-2 opacity-90 uppercase tracking-wider">Saldo Atual</h2>
          <p className="text-3xl font-bold">
            {formatCurrency(saldoAtual)}
          </p>
        </div>
      </div>

      {/* Ticket Médio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-auzen-white rounded-xl p-6 shadow-sm border border-auzen-primary/10 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold mb-1 text-auzen-text/70 uppercase tracking-wider">Ticket Médio Clínica</h2>
            <p className="text-2xl font-bold text-auzen-text">
              {formatCurrency(ticketMedioClinica)}
            </p>
          </div>
          <div className="bg-auzen-mint/20 text-auzen-primary p-3 rounded-full text-2xl">
            🏥
          </div>
        </div>
        <div className="bg-auzen-white rounded-xl p-6 shadow-sm border border-auzen-primary/10 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold mb-1 text-auzen-text/70 uppercase tracking-wider">Ticket Médio Creche</h2>
            <p className="text-2xl font-bold text-auzen-text">
              {formatCurrency(ticketMedioCreche)}
            </p>
          </div>
          <div className="bg-[#FCD34D]/20 text-[#F59E0B] p-3 rounded-full text-2xl">
            🐾
          </div>
        </div>
      </div>

      {/* Área B: Gráficos Interativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-auzen-white rounded-xl p-6 shadow-sm border border-auzen-primary/10 h-80 flex flex-col">
          <h2 className="text-xl font-bold text-auzen-text mb-4">Receitas por Centro de Custo</h2>
          <div className="flex-1">
            {dataPieChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataPieChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dataPieChart.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Nenhum dado de receita disponível.
              </div>
            )}
          </div>
        </div>

        <div className="bg-auzen-white rounded-xl p-6 shadow-sm border border-auzen-primary/10 h-80 flex flex-col">
          <h2 className="text-xl font-bold text-auzen-text mb-4">Fluxo de Caixa</h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataBarChart} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{fill: 'var(--color-auzen-lilac)', opacity: 0.2}} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {dataBarChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Receitas' ? 'var(--color-auzen-mint)' : 'var(--color-auzen-primary)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Área de Alertas e Lançamentos Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card de Alertas */}
        <div className="lg:col-span-1 bg-auzen-white rounded-xl shadow-sm border border-auzen-primary/10 overflow-hidden flex flex-col h-full max-h-[500px]">
          <div className="p-4 border-b border-gray-100 bg-auzen-white">
            <h2 className="text-lg font-bold text-auzen-text flex items-center gap-2">
              <span className="bg-red-100 text-red-600 p-1.5 rounded-md">⚠️</span>
              Alertas (Contas a Vencer)
            </h2>
          </div>
          <div className="overflow-y-auto p-4 space-y-3 flex-1">
            {alertas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum alerta pendente.</p>
            ) : (
              alertas.map(alerta => (
                <div key={alerta.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm text-auzen-text">{alerta.descricao}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${alerta.estadoAlerta === 'Atrasado' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                      {alerta.estadoAlerta}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">Venc: {new Date(alerta.data + 'T12:00:00Z').toLocaleDateString('pt-BR')}</span>
                    <span className="font-bold text-sm text-red-600">{formatCurrency(alerta.valor)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lançamentos Recentes */}
        <div className="lg:col-span-2 bg-auzen-white rounded-xl shadow-sm border border-auzen-primary/10 overflow-hidden flex flex-col h-full max-h-[500px]">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-auzen-white">
            <h2 className="text-lg font-bold text-auzen-text flex items-center gap-2">
              <span className="bg-auzen-mint/20 text-green-700 p-1.5 rounded-md">📄</span>
              Lançamentos Recentes
            </h2>
          </div>
        <div className="overflow-x-auto">
          {ultimosLancamentos.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>Nenhum lançamento registrado ainda.</p>
            </div>
          ) : (
            <table className="w-full text-left bg-auzen-white">
              <thead className="bg-auzen-bg/50">
                <tr>
                  <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Data</th>
                  <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Descrição</th>
                  <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Categoria</th>
                  <th className="px-6 py-3 font-semibold text-sm text-right text-auzen-text">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ultimosLancamentos.map((item) => (
                  <tr key={item.id} className="hover:bg-auzen-lilac/50 transition-colors group bg-auzen-white">
                    <td className="px-6 py-4 text-sm text-auzen-text whitespace-nowrap">
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
