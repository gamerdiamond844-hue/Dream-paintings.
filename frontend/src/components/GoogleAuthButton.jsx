import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '456044016552-smhrefuqv5m5vuv6h1uai7kk8bog5kg0.apps.googleusercontent.com';

export default function GoogleAuthButton({ redirectTo = '/' }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Listen for the token coming back from the OAuth popup window
  useEffect(() => {
    const onMessage = async (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'GOOGLE_AUTH_SUCCESS') return;

      const { credential } = event.data;
      if (!credential) return;

      setLoading(true);
      try {
        const user = await loginWithGoogle(credential);
        toast.success(`Welcome, ${user.name}! 🎉`);
        navigate(user.role === 'admin' ? '/super-admin-portal-xyz' : redirectTo);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [loginWithGoogle, navigate, redirectTo]);

  const handleClick = () => {
    if (loading) return;

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
      access_type: 'online',
    });

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'GoogleLogin',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed) {
      toast.error('Popup was blocked. Please allow popups for this site and try again.');
      return;
    }

    setLoading(true);

    // Poll to detect if user closed the popup without completing login
    const pollClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollClosed);
        setLoading(false);
      }
    }, 500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <svg className="animate-spin w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Signing in...
        </>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </>
      )}
    </button>
  );
}
