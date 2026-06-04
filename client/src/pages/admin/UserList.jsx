import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, deactivateUser } from '../../api/usersApi';
import { useToast } from '../../components/common/Toast';
import { formatDate } from '../../utils/formatters';

export default function UserList() {
  const { addToast } = useToast();
  const [data, setData] = useState([]);

  const load = () => getUsers({ limit: 200 }).then(r => setData(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function handleDeactivate(id, username) {
    if (!confirm(`Deactivate account "${username}"?`)) return;
    try {
      await deactivateUser(id);
      addToast('Account deactivated');
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed', 'error');
    }
  }

  const roleColor = { admin: 'bg-red-100 text-red-700', staff: 'bg-orange-100 text-orange-700', member: 'bg-blue-100 text-blue-700' };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link to="/admin/users/new" className="btn-primary">+ Create Account</Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Username</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Linked Member</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No users found</td></tr>}
              {data.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.member_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/admin/users/${u.id}/edit`} className="text-xs text-primary-600 hover:underline">Edit</Link>
                      {u.is_active && (
                        <button onClick={() => handleDeactivate(u.id, u.username)} className="text-xs text-red-600 hover:underline">Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
