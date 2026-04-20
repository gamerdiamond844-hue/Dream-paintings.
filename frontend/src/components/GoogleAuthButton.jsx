import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleAuthButton({ redirectTo = '/' }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const btnRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const handleCredentialResponse = useCallback(async ({ credential }) => {
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
  }, [loginWithGoogle, navigate, redirectTo]);

  const initGoogle = useCallback(() => {
    if (!window.google?.accounts?.id || !btnRef.current) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      ux_mode: 'popup',
    });
    window.google.accounts.id.renderButton(btnRef.current, {
      theme: 'outline',
      size: 'large',
      width: btnRef.current.offsetWidth || 380,
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
    });
    setSdkReady(true);
  }, [handleCredentialResponse]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // If SDK already loaded (cached)
    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    // Wait for the async script to finish loading
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', initGoogle);
      return () => existingScript.removeEventListener('load', initGoogle);
    }
  }, [initGoogle]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="w-full">
      {/* GIS rendered button */}
      <div ref={btnRef} className="w-full min-h-[44px]" />

      {/* Fallback custom button shown while SDK loads or if GIS fails to render */}
      {!sdkReady && (
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            // Re-attempt init in case SDK loaded after mount
            if (window.google?.accounts?.id) {
              initGoogle();
            } else {
              toast.error('Google Sign-In is loading, please try again in a moment.');
            }
          }}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm disabled:opacity-60"
        >
          {loading ? (
            <svg className="animate-spin w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </button>
      )}
    </div>
  );
}
