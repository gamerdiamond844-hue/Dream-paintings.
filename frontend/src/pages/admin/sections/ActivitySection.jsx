import { useState, useEffect } from 'react';
import { Activity, ChevronLeft, ChevronRight, User, Palette, MessageSquare, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

const typeIcon = (type) => {
  if (type === 'user') return <User size={12} />;
  if (type === 'painting') return <Palette size={12} />;
  if (type === 'comment') return <MessageSquare size={12} />;
  return <Bell size={12} />;
};

const typeColor = (type) => {
  if (type === 'user') return 'bg-blue-100 text-blue-600';
  if (type === 'painting') return 'bg-purple-100 text-purple-600';
  if (type === 'comment') return 'bg-orange-100 text-orange-600';
  return 'bg-green-100 text-green-600';
};

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-IN');
};

export default function ActivitySection() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/activity-logs', { params: { page, limit: LIMIT } });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load logs'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-red-500" />
          <span className="font-semibold text-gray-900">{total} total actions logged</span>
        </div>
        <button onClick={load} className="text-sm text-red-500 hover:text-red-700">Refresh</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(10)].map((_, i) => <div key={i} className="px-5 py-4 h-14 skeleton" />)}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map(log => (
              <div key={log.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {log.admin_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{log.action}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{log.admin_name || 'Admin'}</p>
                </div>
                {log.target_type && (
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${typeColor(log.target_type)}`}>
                    {typeIcon(log.target_type)} {log.target_type}
                  </span>
                )}
                <span className="text-xs text-gray-400 flex-shrink-0 min-w-16 text-right">{timeAgo(log.created_at)}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-center text-gray-400 py-16 text-sm">No activity logged yet</p>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-xl border border-gray-200 hover:border-red-300 disabled:opacity-40 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600 px-3">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-xl border border-gray-200 hover:border-red-300 disabled:opacity-40 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
