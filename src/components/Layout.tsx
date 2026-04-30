import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, Settings, BarChart3 } from 'lucide-react';
import zezeLogo from '../assets/zeze.jpg';

export default function Layout() {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={24} /> },
    { to: '/lancamentos', label: 'Lançamentos', icon: <ReceiptText size={24} /> },
    { to: '/mercado', label: 'Mercado', icon: <BarChart3 size={24} /> },
    { to: '/configuracoes', label: 'Configurações', icon: <Settings size={24} /> },
  ];

  return (
    <div className="flex h-screen bg-auzen-bg text-auzen-text">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-auzen-white border-r border-auzen-primary/10">
        <div className="p-6 flex items-center gap-3 border-b border-auzen-primary/10">
          <img src={zezeLogo} alt="Auzen Logo" className="w-10 h-10 rounded-full object-cover border border-auzen-primary/20 shadow-sm" />
          <h2 className="text-xl font-bold text-auzen-primary">Auzên Calc</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                  isActive
                    ? 'bg-auzen-primary text-white shadow-sm'
                    : 'text-auzen-text hover:bg-auzen-lilac/50'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Bottom Bar Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-auzen-white border-t border-auzen-primary/10 flex justify-around items-center h-16 px-2 pb-safe z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-auzen-primary' : 'text-auzen-text/60'
              }`
            }
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
