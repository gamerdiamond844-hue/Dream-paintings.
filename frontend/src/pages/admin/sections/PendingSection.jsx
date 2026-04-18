import { useState, useEffect } from 'react';
import { Check, X, Eye, Clock, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

export default function PendingSection({ onUpdate }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/pending-paintings');
      setPending(res.data);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handle = async (id, status, message = '') => {
    try {
      await api.put(`/admin/paintings/${id}`, { status, admin_message: message });
      setPending(prev => prev.filter(p => p.id !== id));
      toast.success(`Painting ${status}!`);
      onUpdate?.();
    } catch { toast.error('Failed'); }
  };

  const handleBulkApprove = async () => {
    if (!selected.length) return;
    try {
      await api.post('/admin/paintings/bulk', { ids: selected, action: 'approve' });
      setPending(prev => prev.filter(p => !selected.includes(p.id)));
      setSelected([]);
      toast.success(`${selected.length} paintings approved!`);
      onUpdate?.();
    } catch { toast.error('Failed'); }
  };

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-32 skeleton" />)}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={preview.image_url} alt="" className="w-full h-64 object-cover" />
            <div className="p-5">
              <h3 className="font-display font-bold text-xl text-gray-900">{preview.title}</h3>
              <p className="text-sm text-gray-500 mt-1">by {preview.artist_name} · {preview.artist_email}</p>
              <p className="text-sm text-gray-600 mt-2">{preview.description}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-red-600 font-bold text-lg">₹{parseFloat(preview.price).toLocaleString('en-IN')}</span>
                {preview.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{preview.category}</span>}
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { handle(preview.id, 'approved'); setPreview(null); }}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                  <Check size={15} /> Approve
                </button>
                <button onClick={() => {
                  const msg = prompt('Rejection reason (optional):') || '';
                  handle(preview.id, 'rejected', msg);
                  setPreview(null);
                }}
                  className="flex-1 py-2.5 bg-red-100 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-200 transition-colors flex items-center justify-center gap-2">
                  <X size={15} /> Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pending.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-500" />
          </div>
          <h3 className="font-display font-bold text-gray-900 text-xl">All caught up!</h3>
          <p className="text-gray-500 mt-1">No pending painting submissions.</p>
        </div>
      ) : (
        <>
          {/* Bulk bar */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-yellow-500" />
              <span className="font-semibold text-gray-900">{pending.length} pending submissions</span>
            </div>
            {selected.length > 0 && (
              <button onClick={handleBulkApprove}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                <CheckSquare size={14} /> Approve {selected.length} Selected
              </button>
            )}
          </div>

          <div className="space-y-4">
            {pending.map(p => (
              <div key={p.id} className={`bg-white rounded-2xl border p-5 flex gap-4 items-start shadow-sm hover:shadow-md transition-all
                ${selected.includes(p.id) ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'}`}>
                <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)}
                  className="mt-1 w-4 h-4 accent-red-600 cursor-pointer flex-shrink-0" />
                <div className="relative flex-shrink-0 cursor-pointer" onClick={() => setPreview(p)}>
                  <img src={p.image_url} alt={p.title} className="w-24 h-24 rounded-xl object-cover hover:opacity-90 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30 rounded-xl">
                    <Eye size={18} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{p.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">by <span className="font-medium text-gray-700">{p.artist_name}</span> · {p.artist_email}</p>
                  <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{p.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-red-600 font-bold">₹{parseFloat(p.price).toLocaleString('en-IN')}</span>
                    {p.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.category}</span>}
                    <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => handle(p.id, 'approved')}
                    className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors shadow-sm">
                    <Check size={14} /> Approve
                  </button>
                  <button onClick={() => {
                    const msg = prompt('Rejection reason (optional):') || '';
                    handle(p.id, 'rejected', msg);
                  }}
                    className="flex items-center gap-1.5 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
