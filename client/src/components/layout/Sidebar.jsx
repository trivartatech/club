import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItem = (to, label, icon) => ({ to, label, icon });

const adminItems = [
  navItem('/dashboard', 'Dashboard', '📊'),
  navItem('/members', 'Members', '👥'),
  navItem('/admin/import', 'Bulk Import', '📥'),
  navItem('/payments/record', 'Record Payment', '💳'),
  navItem('/payments/history', 'Payment History', '📋'),
  navItem('/reports/dues', 'Dues Outstanding', '⚠️'),
  navItem('/reports/lifetime-eligible', 'Lifetime Eligible', '⭐'),
  navItem('/admin/users', 'User Accounts', '🔑'),
  navItem('/admin/fee-config', 'Fee Settings', '⚙️'),
  navItem('/admin/member-number', 'Member No. Format', '🔢'),
];

const staffItems = [
  navItem('/dashboard', 'Dashboard', '📊'),
  navItem('/members', 'Members', '👥'),
  navItem('/payments/record', 'Record Payment', '💳'),
  navItem('/payments/history', 'Payment History', '📋'),
  navItem('/reports/dues', 'Dues Outstanding', '⚠️'),
  navItem('/reports/lifetime-eligible', 'Lifetime Eligible', '⭐'),
];

const memberItems = [
  navItem('/dashboard', 'Dashboard', '📊'),
  navItem('/profile', 'My Profile', '👤'),
];

export default function Sidebar({ onClose }) {
  const { user, isAdmin, isMember } = useAuth();
  const items = isAdmin() ? adminItems : isMember() ? memberItems : staffItems;

  return (
    <div className="flex flex-col h-full bg-primary-900 text-white w-64">
      <div className="p-4 border-b border-primary-800">
        <div className="text-xs text-primary-300 uppercase tracking-wider">Chitradurga</div>
        <div className="text-lg font-bold">City Club</div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-primary-700 text-white font-medium'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-primary-800 text-xs text-primary-400">
        Logged in as <span className="text-primary-200 font-medium">{user?.username}</span>
        <div className="capitalize text-primary-300">{user?.role}</div>
      </div>
    </div>
  );
}
