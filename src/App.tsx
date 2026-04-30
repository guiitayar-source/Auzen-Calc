import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Lancamentos from './pages/Lancamentos';
import Mercado from './pages/Mercado';
import Configuracoes from './pages/Configuracoes';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="lancamentos" element={<Lancamentos />} />
          <Route path="mercado" element={<Mercado />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
