import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Trash2, Edit3, Star, TrendingUp, RefreshCw, ChevronLeft, ChevronRight, X, Check, Tag, Calendar, Eye, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

const CATEGORIES = ['Abstract', 'Portrait', 'Landscape', 'Modern', 'Classical', 'Watercolor', 'Oil', 'Digital', 'Other'];

function EditModal({ painting, onClose, onSave }) {
  const [form, setForm] = useState({
    title: painting.title || '',
    price: painting.price || '',
    category: painting.category || '',
    discount_percent: painting.discount_percent || 0,
    offer_start: painting.offer_start ? painting.offer_start.slice(0, 16) : '',
    offer_end: painting.offer_end ? painting.offer_end.slice(0, 16) : '',
    is_featured: painting.is_featured || false,
    is_trending: painting.is_trending || false,
    status: painting.status || 'pending',
    admin_message: painting.admin_message || '',
  });
  const [saving, setSaving] = useState(false);

  const discountedPrice = form.discount_percent > 0
    ? (parseFloat(form.price) * (1 - form.discount_percent / 100)).toFixed(2)
    : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/paintings/${painting.id}`, form);
      toast.success('Painting updated!');
      onSave();
      onClose();
    } catch { toast.error('Failed to update'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-display font-bold text-gray-900">Edit Painting</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Preview */}
          <img src={painting.image_url} alt="" className="w-full h-40 object-cover rounded-xl" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Price & Offer */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Tag size={14} className="text-red-500" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Price & Offer</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Price (₹)</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Discount %</label>
                <input type="number" min="0" max="100" value={form.discount_percent}
                  onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white" />
              </div>
            </div>
            {discountedPrice && (
              <div className="flex items-center gap-2 text-sm">
                <span className="line-through text-gray-400">₹{parseFloat(form.price).toLocaleString('en-IN')}</span>
                <span className="font-bold text-green-600">₹{parseFloat(discountedPrice).toLocaleString('en-IN')}</span>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">{form.discount_percent}% OFF</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Offer Start</label>
                <input type="datetime-local" value={form.offer_start}
                  onChange={e => setForm(f => ({ ...f, offer_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Offer End</label>
                <input type="datetime-local" value={form.offer_end}
                  onChange={e => setForm(f => ({ ...f, offer_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white" />
              </div>
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-3">
            <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all
              ${form.is_featured ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-yellow-200'}`}>
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="hidden" />
              <Star size={15} className={form.is_featured ? 'text-yellow-500' : 'text-gray-400'} />
              <span className="text-sm font-medium text-gray-700">Featured</span>
            </label>
            <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all
              ${form.is_trending ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}>
              <input type="checkbox" checked={form.is_trending} onChange={e => setForm(f => ({ ...f, is_trending: e.target.checked }))} className="hidden" />
              <TrendingUp size={15} className={form.is_trending ? 'text-red-500' : 'text-gray-400'} />
              <span className="text-sm font-medium text-gray-700">Trending</span>
            </label>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {form.status === 'rejected' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Rejection Reason</label>
              <textarea value={form.admin_message} onChange={e => setForm(f => ({ ...f, admin_message: e.target.value }))}
                rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none" />
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaintingsSection() {
  const [paintings, setPaintings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const LIMIT = 12;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, sort, include_deleted: includeDeleted };
      if (search) params.search = search;
      if (status) params.status = status;
      if (category) params.category = category;
      const res = await api.get('/admin/paintings', { params });
      setPaintings(res.data.paintings);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load paintings'); }
    setLoading(false);
  }, [page, search, status, category, sort, includeDeleted]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status, category, sort, includeDeleted]);

  const handleDelete = async (id) => {
    if (!confirm('Soft-delete this painting?')) return;
    try {
      await api.delete(`/admin/paintings/${id}`);
      toast.success('Painting deleted');
      load();
    } catch { toast.error('Failed'); }
  };

  const handleRestore = async (id) => {
    try {
      await api.put(`/admin/paintings/${id}/restore`);
      toast.success('Painting restored');
      load();
    } catch { toast.error('Failed'); }
  };

  const handleBulk = async () => {
    if (!selected.length || !bulkAction) return;
    try {
      await api.post('/admin/paintings/bulk', { ids: selected, action: bulkAction });
      toast.success(`Bulk ${bulkAction} done`);
      setSelected([]);
      setBulkAction('');
      load();
    } catch { toast.error('Failed'); }
  };

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const selectAll = () => setSelected(paintings.map(p => p.id));
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      {editing && <EditModal painting={editing} onClose={() => setEditing(null)} onSave={load} />}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search paintings..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white min-w-32">
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white min-w-36">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white min-w-36">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_high">Price: High→Low</option>
            <option value="price_low">Price: Low→High</option>
            <option value="views">Most Viewed</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm cursor-pointer hover:border-red-300 transition-colors">
            <input type="checkbox" checked={includeDeleted} onChange={e => setIncludeDeleted(e.target.checked)} />
            Show Deleted
          </label>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-red-700">{selected.length} selected</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
            className="px-3 py-2 border border-red-200 rounded-xl text-sm bg-white">
            <option value="">Choose action...</option>
            <option value="approve">Approve All</option>
            <option value="reject">Reject All</option>
            <option value="feature">Mark Featured</option>
            <option value="trending">Mark Trending</option>
            <option value="delete">Delete All</option>
          </select>
          <button onClick={handleBulk} disabled={!bulkAction}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40">
            Apply
          </button>
          <button onClick={() => setSelected([])} className="text-sm text-red-500 hover:text-red-700">Clear</button>
          <button onClick={selectAll} className="text-sm text-red-500 hover:text-red-700 ml-auto">Select All</button>
        </div>
      )}

      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{total} paintings found</p>
        <button onClick={load} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-64 skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paintings.map(p => {
            const isDeleted = !!p.deleted_at;
            const hasOffer = p.discount_percent > 0 && (!p.offer_end || new Date(p.offer_end) > new Date());
            const discounted = hasOffer ? (p.price * (1 - p.discount_percent / 100)).toFixed(0) : null;
            return (
              <div key={p.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group
                ${selected.includes(p.id) ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-100'}
                ${isDeleted ? 'opacity-60' : ''}`}>
                <div className="relative overflow-hidden">
                  <img src={p.image_url} alt={p.title} className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500" />
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {p.is_featured && <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Star size={9} />Featured</span>}
                    {p.is_trending && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><TrendingUp size={9} />Trending</span>}
                    {isDeleted && <span className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full font-bold">Deleted</span>}
                  </div>
                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                      ${p.status === 'approved' ? 'bg-green-100 text-green-700' :
                        p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'}`}>{p.status}</span>
                  </div>
                  {/* Select checkbox */}
                  <div className="absolute bottom-2 left-2">
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 accent-red-600 cursor-pointer" />
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">{p.title}</h4>
                  <p className="text-xs text-gray-500 truncate">by {p.artist_name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {hasOffer ? (
                      <>
                        <span className="text-xs line-through text-gray-400">₹{parseFloat(p.price).toLocaleString('en-IN')}</span>
                        <span className="text-sm font-bold text-green-600">₹{parseFloat(discounted).toLocaleString('en-IN')}</span>
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">{p.discount_percent}%</span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-red-600">₹{parseFloat(p.price).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-0.5"><Eye size={10} />{p.views}</span>
                    <span className="flex items-center gap-0.5"><Heart size={10} />{p.likes_count}</span>
                  </div>
                  <div className="flex gap-1.5 mt-3">
                    {isDeleted ? (
                      <button onClick={() => handleRestore(p.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors">
                        <RefreshCw size={11} /> Restore
                      </button>
                    ) : (
                      <>
                        <button onClick={() => setEditing(p)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors">
                          <Edit3 size={11} /> Edit
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-xl border border-gray-200 hover:border-red-300 disabled:opacity-40 transition-colors">
            <ChevronLeft size={16} />
          </button>
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl text-sm font-medium transition-all
                  ${page === p ? 'bg-red-600 text-white shadow-md shadow-red-200' : 'border border-gray-200 hover:border-red-300 text-gray-600'}`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-xl border border-gray-200 hover:border-red-300 disabled:opacity-40 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
