import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    // Google returns tokens in the URL hash for implicit flow
    // e.g. #access_token=...&id_token=...&token_type=Bearer
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');
    const error = params.get('error');

    console.log('[GoogleCallback] hash params:', hash ? 'present' : 'empty');
    console.log('[GoogleCallback] id_token:', idToken ? 'received' : 'missing');
    console.log('[GoogleCallback] error:', error || 'none');

    if (error) {
      toast.error('Google login was cancelled.');
      navigate('/login', { replace: true });
      return;
    }

    if (!idToken) {
      // Also check query params (some flows use ?code= instead)
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get('code');
      if (code) {
        // Fallback: code flow — exchange via backend
        console.log('[GoogleCallback] falling back to code exchange');
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        api.post('/auth/google/exchange', { code, redirect_uri: redirectUri })
          .then(({ data }) => completeLogin(data.credential))
          .catch(err => {
            console.error('[GoogleCallback] exchange error:', err.response?.data || err.message);
            toast.error(err.response?.data?.message || 'Google sign-in failed.');
            navigate('/login', { replace: true });
          });
        return;
      }

      toast.error('No token received from Google. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    completeLogin(idToken);
  }, []);

  const completeLogin = (credential) => {
    console.log('[GoogleCallback] sending credential to backend...');
    api.post('/auth/google', { credential })
      .then(({ data }) => {
        console.log('[GoogleCallback] login success, user:', data.user?.email);
        // Persist token + user
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        updateUser(data.user);
        toast.success(`Welcome, ${data.user.name}! 🎉`);
        navigate(data.user.role === 'admin' ? '/super-admin-portal-xyz' : '/', { replace: true });
      })
      .catch(err => {
        console.error('[GoogleCallback] auth error:', err.response?.data || err.message);
        toast.error(err.response?.data?.message || 'Google sign-in failed. Please try again.');
        navigate('/login', { replace: true });
      });
  };

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
