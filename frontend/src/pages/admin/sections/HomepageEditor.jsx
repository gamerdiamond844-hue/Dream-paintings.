import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Eye, EyeOff, Star, Users, RefreshCw, Check } from 'lucide-react';
import api from '../../../utils/api';

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-red-500' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </div>
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </label>
);

const Input = ({ label, value, onChange, textarea }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
    {textarea ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400 resize-none" />
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
    )}
  </div>
);

const EMPTY_T = { name: '', role: '', quote: '', avatar_url: '' };

export default function HomepageEditor() {
  const [config, setConfig] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [artists, setArtists] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newT, setNewT] = useState(EMPTY_T);
  const [editT, setEditT] = useState(null);
  const [tab, setTab] = useState('sections');

  const load = () => {
    api.get('/admin/homepage/config').then(r => setConfig(r.data));
    api.get('/admin/homepage/testimonials').then(r => setTestimonials(r.data));
    api.get('/admin/master-artists').then(r => setArtists(r.data));
  };

  useEffect(() => { load(); }, []);

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.post('/admin/homepage/config', config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const addTestimonial = async () => {
    if (!newT.name || !newT.quote) return;
    const r = await api.post('/admin/homepage/testimonials', newT);
    setTestimonials(t => [r.data, ...t]);
    setNewT(EMPTY_T);
  };

  const saveTestimonial = async () => {
    const r = await api.put(`/admin/homepage/testimonials/${editT.id}`, editT);
    setTestimonials(t => t.map(x => x.id === r.data.id ? r.data : x));
    setEditT(null);
  };

  const deleteTestimonial = async (id) => {
    await api.delete(`/admin/homepage/testimonials/${id}`);
    setTestimonials(t => t.filter(x => x.id !== id));
  };

  const toggleMasterArtist = async (artist) => {
    await api.put(`/admin/users/${artist.id}/master-artist`, { is_master_artist: !artist.is_master_artist });
    setArtists(a => a.map(x => x.id === artist.id ? { ...x, is_master_artist: !x.is_master_artist } : x));
  };

  if (!config) return (
    <div className="grid grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );

  const TABS = [
    { id: 'sections', label: 'Sections & Titles' },
    { id: 'artists', label: 'Master Artists' },
    { id: 'testimonials', label: 'Testimonials' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-900">Homepage Editor</h2>
          <p className="text-sm text-gray-500 mt-0.5">Control what appears on the public homepage</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-red-300 hover:text-red-600 transition-all">
            <RefreshCw size={14} /> Refresh
          </button>
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-red-300 hover:text-red-600 transition-all">
            <Eye size={14} /> Preview
          </a>
          <button onClick={saveConfig} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl text-sm font-semibold shadow hover:shadow-red-200 transition-all disabled:opacity-60">
            {saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sections & Titles */}
      {tab === 'sections' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Section Toggles */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">Enable / Disable Sections</h3>
            <Toggle checked={!!config.section_featured} onChange={v => set('section_featured', v)} label="Featured Paintings" />
            <Toggle checked={!!config.section_trending} onChange={v => set('section_trending', v)} label="Trending Now" />
            <Toggle checked={!!config.section_artists} onChange={v => set('section_artists', v)} label="Master Artists" />
            <Toggle checked={!!config.section_recent} onChange={v => set('section_recent', v)} label="Recent Launch" />
            <Toggle checked={!!config.section_testimonials} onChange={v => set('section_testimonials', v)} label="Testimonials" />
          </div>

          {/* Section Titles */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">Section Titles</h3>
            <Input label="Featured Title" value={config.featured_title || ''} onChange={v => set('featured_title', v)} />
            <Input label="Trending Title" value={config.trending_title || ''} onChange={v => set('trending_title', v)} />
            <Input label="Artists Title" value={config.artists_title || ''} onChange={v => set('artists_title', v)} />
            <Input label="Recent Launch Title" value={config.recent_title || ''} onChange={v => set('recent_title', v)} />
            <Input label="Testimonials Title" value={config.testimonials_title || ''} onChange={v => set('testimonials_title', v)} />
          </div>
        </div>
      )}

      {/* Master Artists */}
      {tab === 'artists' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm text-gray-500">Toggle artists to show them in the "Master Artists" section on homepage.</p>
          </div>
          {artists.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>No artists registered yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {artists.map(a => (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-red-100 to-rose-100 flex-shrink-0">
                    {a.avatar_url
                      ? <img src={a.avatar_url} alt={a.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-red-500 font-bold">{a.name?.[0]}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.painting_count} paintings</p>
                  </div>
                  <button
                    onClick={() => toggleMasterArtist(a)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      a.is_master_artist
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <Star size={12} fill={a.is_master_artist ? 'currentColor' : 'none'} />
                    {a.is_master_artist ? 'Master Artist' : 'Set as Master'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Testimonials */}
      {tab === 'testimonials' && (
        <div className="space-y-4">
          {/* Add New */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wider">Add Testimonial</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Name" value={newT.name} onChange={v => setNewT(t => ({ ...t, name: v }))} />
              <Input label="Role (e.g. Artist, Collector)" value={newT.role} onChange={v => setNewT(t => ({ ...t, role: v }))} />
              <Input label="Avatar URL (optional)" value={newT.avatar_url} onChange={v => setNewT(t => ({ ...t, avatar_url: v }))} />
            </div>
            <div className="mt-4">
              <Input label="Quote" value={newT.quote} onChange={v => setNewT(t => ({ ...t, quote: v }))} textarea />
            </div>
            <button onClick={addTestimonial} disabled={!newT.name || !newT.quote}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:shadow-red-200 hover:shadow-lg transition-all">
              <Plus size={14} /> Add Testimonial
            </button>
          </div>

          {/* List */}
          {testimonials.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <Star size={40} className="mx-auto mb-3 opacity-30" />
              <p>No testimonials yet. Add one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testimonials.map(t => (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  {editT?.id === t.id ? (
                    <div className="space-y-3">
                      <div className="grid md:grid-cols-2 gap-3">
                        <Input label="Name" value={editT.name} onChange={v => setEditT(e => ({ ...e, name: v }))} />
                        <Input label="Role" value={editT.role || ''} onChange={v => setEditT(e => ({ ...e, role: v }))} />
                        <Input label="Avatar URL" value={editT.avatar_url || ''} onChange={v => setEditT(e => ({ ...e, avatar_url: v }))} />
                      </div>
                      <Input label="Quote" value={editT.quote} onChange={v => setEditT(e => ({ ...e, quote: v }))} textarea />
                      <Toggle checked={!!editT.is_active} onChange={v => setEditT(e => ({ ...e, is_active: v }))} label="Active (visible on homepage)" />
                      <div className="flex gap-2">
                        <button onClick={saveTestimonial} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">Save</button>
                        <button onClick={() => setEditT(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                          {t.role && <span className="text-xs text-gray-400">· {t.role}</span>}
                          {!t.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Hidden</span>}
                        </div>
                        <p className="text-sm text-gray-600 italic line-clamp-2">"{t.quote}"</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setEditT(t)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          {t.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                        <button onClick={() => deleteTestimonial(t.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
