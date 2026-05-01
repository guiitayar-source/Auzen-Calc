import React, { useState, useMemo } from 'react';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useLancamentosStore, ensureIds } from '../store/useLancamentosStore';
import { useConfigStore } from '../store/useConfigStore';
import { useServicosStore } from '../store/useServicosStore';
import { useAuthStore } from '../store/useAuthStore';
import { useMercadoStore } from '../store/useMercadoStore';
import { useGoogleLogin } from '@react-oauth/google';
import { uploadBackup, downloadBackup } from '../services/googleDriveService';
import type { TipoCategoria, CentroDeCusto } from '../data/categories';
import { Trash2, Download, AlertTriangle, Cloud, LogIn, LogOut, RefreshCw } from 'lucide-react';

export default function Configuracoes() {
  const { categorias, addCategoria, deleteCategoria } = useCategoriasStore();
  const { lancamentos, clearLancamentos } = useLancamentosStore();
  const { diasAlertaVencimento, setDiasAlertaVencimento } = useConfigStore();

  const { servicos, addServico, removeServico } = useServicosStore();
  const { accessToken, userEmail, ultimoBackup, login, logout, setUltimoBackup } = useAuthStore();

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoCategoria>('Despesa');
  const [centroDeCusto, setCentroDeCusto] = useState<CentroDeCusto>('Geral');
  const [nomeServico, setNomeServico] = useState('');
  
  const [confirmText, setConfirmText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;

    addCategoria({
      nome,
      tipo,
      centroDeCusto
    });

    setNome('');
  };

  const handleExcluir = (id: string, nomeCat: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a categoria "${nomeCat}"?`)) {
      deleteCategoria(id);
    }
  };

  const linkDownloadCSV = useMemo(() => {
    try {
      const dataLancamentos = lancamentos;
      const dataCategorias = categorias;
      
      const headers = ['Data', 'Descricao', 'Valor', 'Tipo', 'Categoria', 'Centro de Custo', 'Status'];
      const rows = dataLancamentos.map(l => {
        const cat = dataCategorias.find(c => c.id === l.categoriaId);
        const catNome = cat ? cat.nome : 'Sem Categoria';
        const catCentro = cat ? cat.centroDeCusto : 'N/A';
        
        const valorNumerico = Number(l.valor);
        const valorSeguro = isNaN(valorNumerico) ? 0 : valorNumerico;
        const valorFormatado = valorSeguro.toFixed(2).replace('.', ',');

        return [
          l.data,
          `"${l.descricao.replace(/"/g, '""')}"`,
          `"${valorFormatado}"`,
          l.tipo,
          `"${catNome.replace(/"/g, '""')}"`,
          catCentro,
          l.status
        ].join(';');
      });

      const csvString = [headers.join(';'), ...rows].join('\n');
      return 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent(csvString);
    } catch (error) {
      console.error(error);
      return '#';
    }
  }, [lancamentos, categorias]);

  const handleClearAll = () => {
    if (confirmText === 'CONFIRMAR') {
      clearLancamentos();
      setConfirmText('');
      alert('Todos os lançamentos foram apagados.');
    }
  };

  const handleSubmitServico = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeServico) return;
    addServico(nomeServico);
    setNomeServico('');
  };

  const handleGoogleLogin = async () => {
    // Se estiver no Electron, usa o fluxo de loopback
    if ((window as any).ipcRenderer?.googleLogin) {
      try {
        const token = await (window as any).ipcRenderer.googleLogin();
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userInfo = await res.json();
        login(token, userInfo.email);
        alert('Login realizado com sucesso!');
      } catch (error: any) {
        console.error('Erro no login Electron:', error);
        alert('Erro ao realizar login no Desktop: ' + (error.message || 'Erro desconhecido'));
      }
    } else {
      // No navegador, usa o fluxo padrão da biblioteca
      googleLogin();
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await res.json();
        login(tokenResponse.access_token, userInfo.email);
        alert('Login realizado com sucesso!');
      } catch (error) {
        console.error('Erro ao obter dados do usuário:', error);
        alert('Erro ao realizar login.');
      }
    },
    scope: 'https://www.googleapis.com/auth/drive.file',
  });

  const handleBackup = async () => {
    if (!accessToken) return;
    try {
      const backupData = {
        lancamentos: useLancamentosStore.getState().lancamentos,
        categorias: useCategoriasStore.getState().categorias,
        concorrentes: useMercadoStore.getState().concorrentes,
        precosBaseAuzen: useMercadoStore.getState().precosBaseAuzen,
        config: useConfigStore.getState(),
        servicos: useServicosStore.getState().servicos,
      };

      const result = await uploadBackup(accessToken, backupData);
      const now = new Date().toLocaleString('pt-BR');
      setUltimoBackup(now);
      
      let msg = 'Backup realizado com sucesso no Google Drive!';
      if (result.recoveryCreated) {
        msg += '\n\n✅ Ponto de recuperação criado com sucesso (auzen_backup_RECUPERACAO.json).';
      }
      alert(msg);
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar backup.');
    }
  };

  const handleRestore = async () => {
    if (!accessToken) return;
    if (!window.confirm('ATENÇÃO: Isso irá substituir TODOS os seus dados atuais pelos dados do backup. Deseja continuar?')) return;

    try {
      const data = await downloadBackup(accessToken);
      
      if (data.lancamentos) useLancamentosStore.setState({ lancamentos: ensureIds(data.lancamentos) });
      if (data.categorias) useCategoriasStore.setState({ categorias: data.categorias });
      if (data.concorrentes) useMercadoStore.setState({ concorrentes: data.concorrentes });
      if (data.precosBaseAuzen) useMercadoStore.setState({ precosBaseAuzen: data.precosBaseAuzen });
      if (data.config) useConfigStore.setState(data.config);
      if (data.servicos) useServicosStore.setState({ servicos: data.servicos });

      alert('Backup restaurado com sucesso! A página será atualizada.');
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Erro ao restaurar backup. Verifique se o arquivo existe no seu Drive.');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-auzen-text mb-6">Configurações</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Área A: Formulário de Adição */}
        <div className="lg:col-span-1 bg-auzen-white p-6 rounded-xl shadow-sm border border-auzen-primary/10 h-fit">
          <h2 className="text-xl font-bold text-auzen-text mb-4">Nova Categoria</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-auzen-text mb-1">Nome da Categoria</label>
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                placeholder="Ex: Banho e Tosa"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-auzen-text mb-1">Tipo</label>
              <select 
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoCategoria)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
              >
                <option value="Receita">Receita</option>
                <option value="Despesa">Despesa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-auzen-text mb-1">Centro de Custo</label>
              <select 
                value={centroDeCusto}
                onChange={(e) => setCentroDeCusto(e.target.value as CentroDeCusto)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
              >
                <option value="Creche">Creche</option>
                <option value="Clínica">Clínica</option>
                <option value="Geral">Geral</option>
              </select>
            </div>

            <button 
              type="submit"
              className="w-full bg-auzen-primary hover:bg-auzen-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm cursor-pointer mt-2"
            >
              Adicionar Categoria
            </button>
          </form>
        </div>

        {/* Área B: Listagem */}
        <div className="lg:col-span-2 bg-auzen-white rounded-xl shadow-sm border border-auzen-primary/10 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-auzen-white">
            <h2 className="text-xl font-bold text-auzen-text">Categorias Cadastradas</h2>
            <span className="bg-auzen-mint/20 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
              {categorias.length} Categorias
            </span>
          </div>
          
          <div className="overflow-y-auto max-h-[500px]">
            <table className="w-full text-left">
              <thead className="bg-auzen-bg/50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Nome</th>
                  <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Tipo</th>
                  <th className="px-6 py-3 font-semibold text-sm text-auzen-text">Centro de Custo</th>
                  <th className="px-6 py-3 font-semibold text-sm text-center text-auzen-text w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categorias.map(cat => (
                  <tr key={cat.id} className="hover:bg-auzen-lilac/30 transition-colors bg-auzen-white">
                    <td className="px-6 py-4 text-sm font-medium text-auzen-text">
                      {cat.nome}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        cat.tipo === 'Receita' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cat.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-auzen-text">
                      <span className="bg-auzen-bg border border-gray-200 px-2 py-1 rounded-md text-xs font-medium">
                        {cat.centroDeCusto}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleExcluir(cat.id, cat.nome)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 mx-auto cursor-pointer"
                        title="Excluir categoria"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {categorias.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma categoria cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Novo: Gerenciador de Serviços do Catálogo */}
      <div className="bg-auzen-white p-6 rounded-xl shadow-sm border border-auzen-primary/10">
        <h2 className="text-xl font-bold text-auzen-text mb-4">Catálogo de Serviços (Auzên)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Cadastre aqui os serviços que você oferece. Eles serão usados como base para a Análise de Mercado e Comparação de Preços.
            </p>
            <form onSubmit={handleSubmitServico} className="flex gap-2">
              <input 
                type="text" 
                value={nomeServico}
                onChange={(e) => setNomeServico(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary transition-colors bg-auzen-white text-auzen-text"
                placeholder="Ex: Pacote Mensal 3x na semana"
                required
              />
              <button 
                type="submit"
                className="bg-auzen-primary hover:bg-auzen-primary/90 text-white font-medium py-2 px-6 rounded-lg transition-colors cursor-pointer"
              >
                Cadastrar
              </button>
            </form>
          </div>
          <div className="flex flex-wrap gap-2 content-start">
            {servicos.map(s => (
              <div key={s.id} className="flex items-center gap-2 bg-auzen-bg border border-auzen-primary/10 px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-auzen-text">{s.nome}</span>
                <button 
                  onClick={() => removeServico(s.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {servicos.length === 0 && (
              <p className="text-sm text-gray-400 italic">Nenhum serviço cadastrado no catálogo.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Módulo: Backup em Nuvem */}
        <div className="bg-auzen-white p-6 rounded-xl shadow-sm border border-auzen-primary/10 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="text-auzen-primary" size={24} />
            <h2 className="text-lg font-bold text-auzen-text">Backup em Nuvem</h2>
          </div>
          
          {!accessToken ? (
            <div className="flex-1 flex flex-col">
              <p className="text-sm text-gray-500 mb-6 flex-1">
                Mantenha seus dados seguros. Conecte sua conta Google para salvar backups automáticos no seu Google Drive.
              </p>
              <button 
                onClick={() => handleGoogleLogin()}
                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-100 hover:border-auzen-primary/30 text-auzen-text font-medium py-3 px-4 rounded-lg transition-all shadow-sm cursor-pointer"
              >
                <LogIn size={18} className="text-auzen-primary" />
                Fazer login com Google
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="bg-auzen-bg/50 p-3 rounded-lg border border-auzen-primary/5">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Conectado como</p>
                <p className="text-sm font-medium text-auzen-text truncate">{userEmail}</p>
                <p className="text-[10px] text-gray-400 mt-2">Último backup: {ultimoBackup || 'Nunca'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleBackup}
                  className="flex items-center justify-center gap-2 bg-auzen-primary hover:bg-auzen-primary/90 text-white text-xs font-bold py-3 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} />
                  Fazer Backup
                </button>
                <button 
                  onClick={handleRestore}
                  className="flex items-center justify-center gap-2 bg-auzen-mint hover:bg-auzen-mint/90 text-green-800 text-xs font-bold py-3 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  Restaurar
                </button>
              </div>

              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-red-500 text-xs font-medium py-2 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                Desconectar conta
              </button>
            </div>
          )}
        </div>

        {/* Módulo A: Alertas de Caixa */}
        {/* Módulo A: Alertas de Caixa */}
        <div className="bg-auzen-white p-6 rounded-xl shadow-sm border border-auzen-primary/10">
          <h2 className="text-lg font-bold text-auzen-text mb-2">Alertas de Caixa</h2>
          <p className="text-sm text-gray-500 mb-4">
            Com quantos dias de antecedência o Dashboard deve alertar sobre contas a vencer?
          </p>
          <div className="flex items-center gap-3">
            <input 
              type="number"
              min="0"
              max="30"
              value={diasAlertaVencimento}
              onChange={(e) => setDiasAlertaVencimento(Number(e.target.value))}
              className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-auzen-primary/20 focus:border-auzen-primary"
            />
            <span className="text-sm text-auzen-text font-medium">dias</span>
          </div>
        </div>

        {/* Módulo B: Exportação Contábil */}
        <div className="bg-auzen-white p-6 rounded-xl shadow-sm border border-auzen-primary/10 flex flex-col">
          <h2 className="text-lg font-bold text-auzen-text mb-2">Exportação Contábil</h2>
          <p className="text-sm text-gray-500 mb-4 flex-1">
            Baixe todos os lançamentos em formato CSV compatível com Excel para análise avançada e contabilidade.
          </p>
          <a 
            href={linkDownloadCSV} 
            download="Auzen_Financeiro.csv"
            className="w-full flex items-center justify-center gap-2 bg-auzen-primary hover:bg-auzen-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer"
          >
            <Download size={18} />
            Baixar Relatório Completo (.csv)
          </a>
        </div>

        {/* Módulo C: Zona de Perigo */}
        <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-200 flex flex-col">
          <h2 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle size={20} />
            Zona de Perigo
          </h2>
          <p className="text-sm text-red-600/80 mb-4 flex-1">
            Apagar todos os lançamentos financeiros do sistema. Esta ação é irreversível. Para confirmar, digite <strong>CONFIRMAR</strong> abaixo.
          </p>
          <div className="space-y-3">
            <input 
              type="text"
              placeholder="Digite CONFIRMAR"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border border-red-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white text-red-900 placeholder:text-red-300"
            />
            <button 
              onClick={handleClearAll}
              disabled={confirmText !== 'CONFIRMAR'}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Apagar Todos os Lançamentos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
