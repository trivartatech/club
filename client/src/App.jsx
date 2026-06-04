import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleGuard from './components/common/RoleGuard';
import AppShell from './components/layout/AppShell';

import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';

import MemberList from './pages/members/MemberList';
import MemberCreate from './pages/members/MemberCreate';
import MemberDetail from './pages/members/MemberDetail';
import MemberEdit from './pages/members/MemberEdit';
import MemberIdCard from './pages/members/MemberIdCard';

import RecordPayment from './pages/payments/RecordPayment';
import PaymentHistory from './pages/payments/PaymentHistory';
import MemberPayments from './pages/payments/MemberPayments';

import DuesOutstanding from './pages/reports/DuesOutstanding';
import LifetimeEligible from './pages/reports/LifetimeEligible';
import Receipt from './pages/reports/Receipt';

import UserList from './pages/admin/UserList';
import UserCreate from './pages/admin/UserCreate';
import UserEdit from './pages/admin/UserEdit';
import FeeConfig from './pages/admin/FeeConfig';
import MemberNumberConfig from './pages/admin/MemberNumberConfig';
import MemberImport from './pages/admin/MemberImport';

import MyProfile from './pages/profile/MyProfile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/change-password" element={<ChangePassword />} />
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<Dashboard />} />

                <Route element={<RoleGuard roles={['admin', 'staff']} />}>
                  <Route path="/members" element={<MemberList />} />
                  <Route path="/members/new" element={<MemberCreate />} />
                  <Route path="/members/:id" element={<MemberDetail />} />
                  <Route path="/members/:id/edit" element={<MemberEdit />} />
                  <Route path="/payments/record" element={<RecordPayment />} />
                  <Route path="/payments/history" element={<PaymentHistory />} />
                  <Route path="/reports/dues" element={<DuesOutstanding />} />
                  <Route path="/reports/lifetime-eligible" element={<LifetimeEligible />} />
                </Route>

                <Route path="/payments/member/:member_id" element={<MemberPayments />} />
                <Route path="/reports/receipt/:id" element={<Receipt />} />
                <Route path="/members/:id/id-card" element={<MemberIdCard />} />

                <Route element={<RoleGuard roles={['member']} />}>
                  <Route path="/profile" element={<MyProfile />} />
                </Route>

                <Route element={<RoleGuard roles={['admin']} />}>
                  <Route path="/admin/users" element={<UserList />} />
                  <Route path="/admin/users/new" element={<UserCreate />} />
                  <Route path="/admin/users/:id/edit" element={<UserEdit />} />
                  <Route path="/admin/fee-config" element={<FeeConfig />} />
                  <Route path="/admin/member-number" element={<MemberNumberConfig />} />
                  <Route path="/admin/import" element={<MemberImport />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
