import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/members': 'Members',
  '/payments/record': 'Record Payment',
  '/payments/history': 'Payment History',
  '/reports/dues': 'Dues Outstanding',
  '/reports/lifetime-eligible': 'Lifetime Eligible Members',
  '/admin/users': 'User Accounts',
  '/admin/fee-config': 'Fee Settings',
  '/profile': 'My Profile',
};

function getTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/members/') && pathname.endsWith('/edit')) return 'Edit Member';
  if (pathname.startsWith('/members/') && pathname.endsWith('/id-card')) return 'Member ID Card';
  if (pathname.startsWith('/members/new')) return 'Add Member';
  if (pathname.startsWith('/members/')) return 'Member Details';
  if (pathname.startsWith('/reports/receipt/')) return 'Payment Receipt';
  if (pathname.startsWith('/admin/users/')) return 'Edit User';
  return 'City Club';
}

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 print:block print:h-auto print:overflow-visible">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`no-print fixed lg:static inset-y-0 left-0 z-30 transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex-shrink-0`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden print:block print:overflow-visible">
        <TopBar onMenuClick={() => setSidebarOpen(true)} title={getTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
