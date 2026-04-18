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
                {['User', 'Email', 'Role', 'Paintings', 'Purchases', 'Joined', 'Status', 'Actions'].map(h => (
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
