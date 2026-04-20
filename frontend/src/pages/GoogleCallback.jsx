import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const called = useRef(false); // prevent double-call in React StrictMode

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      toast.error('Google login was cancelled.');
      navigate('/login', { replace: true });
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;

    // Step 1: exchange code for id_token
    api.post('/auth/google/exchange', { code, redirect_uri: redirectUri })
      .then(({ data: { credential } }) => {
        // Step 2: verify id_token + login/create user
        return api.post('/auth/google', { credential });
      })
      .then(({ data }) => {
        // Step 3: persist JWT + user exactly like normal login
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        updateUser(data.user);
        toast.success(`Welcome, ${data.user.name}! 🎉`);
        // Step 4: redirect to home (or admin)
        navigate(data.user.role === 'admin' ? '/super-admin-portal-xyz' : '/', { replace: true });
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'Google sign-in failed. Please try again.';
        toast.error(msg);
        navigate('/login', { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <svg className="animate-spin w-12 h-12 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-gray-700 font-semibold text-lg">Signing you in with Google...</p>
        <p className="text-gray-400 text-sm">Please wait, do not close this page.</p>
      </div>
    </div>
  );
}
