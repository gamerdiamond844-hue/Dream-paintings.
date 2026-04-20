import { useState, useEffect } from 'react';
import { Search, Trash2, Shield, UserX, UserCheck, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

const RoleBadge = ({ role }) => (
  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
    ${role === 'admin' ? 'bg-red-100 text-red-700' :
      role === 'artist' ? 'bg-purple-100 text-purple-700' :
      'bg-blue-100 text-blue-700'}`}>{role}</span>
);

const AuthBadge = ({ provider }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full
    ${provider === 'google' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-gray-100 text-gray-500'}`}>
    {provider === 'google' ? (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ) : '✉'}
    {provider === 'google' ? 'Google' : 'Email'}
  </span>
);

export default function UsersSection() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionMenu, setActionMenu] = useState(null);

  useEffect(() => {
    const close = () => setActionMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
      setFiltered(res.data);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let f = users;
    if (search) f = f.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter) f = f.filter(u => u.role === roleFilter);
    setFiltered(f);
  }, [search, roleFilter, users]);

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this user and all their data?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success('User deleted');
    } catch { toast.error('Failed'); }
  };

  const handleBan = async (id, ban) => {
    try {
      await api.put(`/admin/users/${id}/ban`, { ban });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: ban } : u));
      toast.success(ban ? 'User banned' : 'User unbanned');
    } catch { toast.error('Failed'); }
  };

  const handlePromote = async (id, role) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
      toast.success(`Role updated to ${role}`);
      setActionMenu(null);
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="">All Roles</option>
          <option value="user">Buyers</option>
          <option value="artist">Artists</option>
          <option value="admin">Admins</option>
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{filtered.length}</span> users
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['User', 'Email', 'Role', 'Login Via', 'Paintings', 'Purchases', 'Joined', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-5 py-4"><div className="h-8 skeleton rounded-lg" /></td></tr>
                ))
              ) : filtered.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.is_banned ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-sm text-gray-900 whitespace-nowrap">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 max-w-40 truncate">{u.email}</td>
                  <td className="px-5 py-4"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-4"><AuthBadge provider={u.auth_provider || 'email'} /></td>
                  <td className="px-5 py-4 text-sm text-gray-600 text-center">{u.painting_count || 0}</td>
                  <td className="px-5 py-4 text-sm text-gray-600 text-center">{u.purchase_count || 0}</td>
                  <td className="px-5 py-4 text-sm text-gray-400 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-4">
                    {u.is_banned ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Banned</span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {u.role !== 'admin' && (
                      <div className="flex items-center gap-1.5">
                        {/* Role dropdown */}
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === u.id ? null : u.id); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors">
                            <Shield size={12} /> Role <ChevronDown size={10} />
                          </button>
                          {actionMenu === u.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-10 overflow-hidden min-w-32">
                              {['user', 'artist'].filter(r => r !== u.role).map(r => (
                                <button key={r} onClick={() => handlePromote(u.id, r)}
                                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 hover:text-red-600 transition-colors capitalize">
                                  → {r}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Ban toggle */}
                        <button onClick={() => handleBan(u.id, !u.is_banned)}
                          className={`p-1.5 rounded-lg transition-colors ${u.is_banned ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-orange-50 text-orange-500 hover:bg-orange-100'}`}
                          title={u.is_banned ? 'Unban' : 'Ban'}>
                          {u.is_banned ? <UserCheck size={14} /> : <UserX size={14} />}
                        </button>
                        {/* Delete */}
                        <button onClick={() => handleDelete(u.id)}
                          className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <p className="text-center text-gray-400 py-12 text-sm">No users found</p>
          )}
        </div>
      </div>
    </div>
  );
}
