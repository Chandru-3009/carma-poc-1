import { NavLink } from 'react-router-dom';
import { FaUsers, FaTools, FaEnvelopeOpenText, FaChartPie } from 'react-icons/fa';

function Sidebar() {
  const items = [
    { to: '/dashboard', label: 'Dashboard', icon: FaChartPie },
    { to: '#', label: 'Clients', icon: FaUsers },
    { to: '#', label: 'Subcontractors', icon: FaTools },
    { to: '#', label: 'Email', icon: FaEnvelopeOpenText }
  ];

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0">
      <div className="h-16 flex items-center px-5 border-b border-gray-200">
        <span className="text-xl font-bold text-blue-700">CARMA</span>
      </div>
      <nav className="p-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto p-4 text-xs text-gray-400">© 2025 Carma</div>
    </aside>
  );
}

export default Sidebar;


