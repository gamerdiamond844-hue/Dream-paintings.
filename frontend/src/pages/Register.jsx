import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Palette, User, Brush } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import GoogleAuthButton from '../components/GoogleAuthButton';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: searchParams.get('role') || 'user' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const user = await register(form.name, form.email, form.password, form.role);
      toast.success(`Welcome, ${user.name}! 🎉`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="content-layer min-h-screen flex items-center justify-center pt-16 hero-bg py-12">
      <div className="w-full max-w-md px-4">
        <div className="glass rounded-3xl p-8 shadow-2xl shadow-red-100 border border-red-100">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-700 rounded-2xl flex items-center justify-center mx-auto mb-4 glow-red">
              <Palette size={26} className="text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-500 mt-2 text-sm">Join the Dream Paintings community</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { value: 'user', label: 'Buyer', icon: User, desc: 'Browse & buy art' },
              { value: 'artist', label: 'Artist', icon: Brush, desc: 'Sell your art' },
            ].map(({ value, label, icon: Icon, desc }) => (
              <button key={value} type="button" onClick={() => setForm(p => ({ ...p, role: value }))}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${form.role === value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}>
                <Icon size={20} className={form.role === value ? 'text-red-600' : 'text-gray-400'} />
                <p className={`font-semibold text-sm mt-2 ${form.role === value ? 'text-red-700' : 'text-gray-700'}`}>{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Your name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm pr-11 transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 mt-2">
              {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-red-600 font-semibold hover:underline">Sign in</Link>
          </p>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <GoogleAuthButton />
        </div>
      </div>
    </div>
  );
}
