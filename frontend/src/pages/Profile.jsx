import { useState, useRef, useEffect } from 'react';
import { Camera, Save, ArrowRight, Star, Wallet, ShoppingBag, Eye, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import VerifiedBadge from '../components/VerifiedBadge';
import VerificationApply from '../components/VerificationApply';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '' });
  const [preview, setPreview] = useState(user?.avatar_url || null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [verifStatus, setVerifStatus] = useState(null);
  const [showVerifModal, setShowVerifModal] = useState(false);
  const fileRef = useRef();

  const loadVerifStatus = async () => {
    try {
      const r = await api.get('/verification/my-status');
      setVerifStatus(r.data);
    } catch {}
  };

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) return;
      setDashboardLoading(true);
      try {
        const res = await api.get('/users/me/dashboard');
        setDashboard(res.data);
      } catch {
        toast.error('Unable to load dashboard');
      }
      setDashboardLoading(false);
    };
    loadDashboard();
    loadVerifStatus();
  }, [user]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('bio', form.bio);
      if (file) fd.append('avatar', file);
      const res = await api.put('/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(res.data);
      setPreview(res.data.avatar_url || preview);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
    setLoading(false);
  };

  return (
    <>
      <div className="content-layer min-h-screen pt-24 pb-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col gap-4 mb-10">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-red-600 font-semibold">Dashboard</p>
            <h1 className="font-display text-5xl font-bold text-gray-900 mt-3 flex items-center gap-3">
              Welcome back, {user?.name?.split(' ')[0]}
              {user?.is_verified && <VerifiedBadge level={user?.badge_level} size="lg" />}
            </h1>
          </div>
          <p className="max-w-2xl text-gray-600">Manage your profile, orders, messages, and gallery stats from one premium workspace.</p>

          {/* Verification CTA */}
          <div className="mt-4">
            {user?.is_verified ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-full">
                <VerifiedBadge level={user?.badge_level} size="sm" tooltip={false} />
                <span className="text-sm font-semibold text-red-700">
                  {user?.badge_level === 'red' ? 'Red Premium' : 'Blue Standard'} Verified Artist
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowVerifModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-full text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Shield size={15} />
                {verifStatus?.status === 'pending' ? 'Application Pending…' : 'Apply for Verified Badge'}
              </button>
            )}
          </div>
        </div>

        {dashboardLoading ? (
          <div className="rounded-3xl bg-white p-10 shadow-sm border border-gray-100 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="glass rounded-3xl p-6 border border-red-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-red-500 font-semibold">Total Engagement</p>
                      <p className="mt-3 text-3xl font-bold text-gray-900">{dashboard?.stats?.total_views ?? 0}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-2xl text-red-600">
                      <Eye size={20} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Total profile views across your artist portfolio.</p>
                </div>
                <div className="glass rounded-3xl p-6 border border-red-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-red-500 font-semibold">Sales</p>
                      <p className="mt-3 text-3xl font-bold text-gray-900">{dashboard?.stats?.total_sales ?? 0}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-2xl text-red-600">
                      <ShoppingBag size={20} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Completed orders and collector purchases.</p>
                </div>
              </div>

              <div className="glass rounded-3xl p-6 border border-red-100 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-red-500 font-semibold">Earnings</p>
                    <p className="mt-3 text-4xl font-bold text-gray-900">₹{(dashboard?.stats?.total_earnings ?? 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-2xl text-red-600">
                    <Wallet size={20} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl bg-white p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Paintings</p>
                    <p className="mt-3 text-lg font-semibold text-gray-900">{dashboard?.stats?.total_paintings ?? 0}</p>
                  </div>
                  <div className="rounded-3xl bg-white p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Rating</p>
                    <p className="mt-3 text-lg font-semibold text-gray-900">{Number(dashboard?.stats?.avg_rating ?? 0).toFixed(1)}</p>
                  </div>
                  <div className="rounded-3xl bg-white p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Reviews</p>
                    <p className="mt-3 text-lg font-semibold text-gray-900">{dashboard?.stats?.review_count ?? 0}</p>
                  </div>
                </div>
                {(user?.role === 'artist' || user?.role === 'admin') && (
                  <button
                    onClick={() => navigate('/withdrawals')}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <Wallet size={16} /> Withdraw Earnings
                  </button>
                )}
              </div>

              {user?.role === 'artist' ? (
                <div className="glass rounded-3xl p-6 border border-red-100 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-red-500 font-semibold">Top Artworks</p>
                      <p className="mt-3 text-lg text-gray-900 font-semibold">Your best performing pieces</p>
                    </div>
                    <Star size={20} className="text-red-600" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(dashboard?.topPaintings || []).slice(0, 4).map(item => (
                      <div key={item.id} className="rounded-3xl bg-white p-4 border border-gray-100">
                        <p className="font-semibold text-sm text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-1">₹{parseFloat(item.price).toLocaleString()}</p>
                      </div>
                    ))}
                    {(dashboard?.topPaintings || []).length === 0 && (
                      <p className="text-sm text-gray-500 col-span-2">You don't have enough sales yet. Create new art to boost your profile.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="glass rounded-3xl p-6 border border-red-100 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-red-500 font-semibold">Buyer summary</p>
                      <p className="mt-3 text-lg text-gray-900 font-semibold">Your wishlist and recent orders</p>
                    </div>
                    <ArrowRight size={20} className="text-red-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-3xl bg-white p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase">Wishlist items</p>
                      <p className="mt-2 text-lg font-semibold text-gray-900">{dashboard?.wishlist?.length ?? 0}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase">Recent orders</p>
                      <p className="mt-2 text-lg font-semibold text-gray-900">{dashboard?.orders?.length ?? 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="glass rounded-3xl p-8 shadow-xl shadow-red-50 border border-red-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white">
                  <Camera size={22} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-red-500 font-semibold">Profile Settings</p>
                  <h2 className="font-semibold text-2xl text-gray-900">Personal details & avatar</h2>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={user?.email} disabled
                    className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                </div>
                {user?.role === 'artist' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio / About</label>
                    <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                      rows={4} placeholder="Tell collectors about yourself and your art..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all resize-none" />
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-3xl overflow-hidden bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center">
                      {preview ? <img src={preview} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-white text-3xl font-bold">{user?.name?.[0]}</span>}
                    </div>
                    <button type="button" onClick={() => fileRef.current.click()}
                      className="absolute -bottom-2 -right-2 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-700 transition-colors">
                      <Camera size={16} />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                  </div>
                  <button type="submit" disabled={loading}
                    className="btn-primary py-3 px-6 rounded-3xl font-semibold disabled:opacity-50">
                    {loading ? <LoadingSpinner size="sm" /> : 'Save profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </div>

      {showVerifModal && (
        <VerificationApply
          currentStatus={verifStatus}
          onClose={() => setShowVerifModal(false)}
          onSuccess={loadVerifStatus}
        />
      )}
    </>
  );
}
