import { useState, useEffect } from 'react';
import { Trash2, MessageSquare, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';

export default function CommentsSection() {
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const LIMIT = 30;

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/comments', { params: { page, limit: LIMIT } });
      setComments(res.data.comments);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load comments'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/comments/${id}`);
      setComments(prev => prev.filter(c => c.id !== id));
      setTotal(t => t - 1);
      toast.success('Comment deleted');
    } catch { toast.error('Failed'); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-red-500" />
          <span className="font-semibold text-gray-900">{total} total comments</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="space-y-0 divide-y divide-gray-50">
            {[...Array(8)].map((_, i) => <div key={i} className="px-5 py-4 h-16 skeleton" />)}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {comments.map(c => (
              <div key={c.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors group">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {c.user_name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900">{c.user_name}</span>
                    <span className="text-xs text-gray-400">on</span>
                    <button onClick={() => navigate(`/paintings/${c.painting_id}`)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5 font-medium">
                      {c.painting_title} <ExternalLink size={10} />
                    </button>
                    <span className="text-xs text-gray-400 ml-auto">{new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{c.text}</p>
                </div>
                <button onClick={() => handleDelete(c.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-center text-gray-400 py-12 text-sm">No comments found</p>
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
