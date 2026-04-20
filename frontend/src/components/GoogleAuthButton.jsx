import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleAuthButton({ redirectTo = '/' }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const btnRef = useRef(null);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      ux_mode: 'popup',
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      theme: 'outline',
      size: 'large',
      width: btnRef.current?.offsetWidth || 400,
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
    });
  }, []);

  const handleCredentialResponse = async ({ credential }) => {
    setDisabled(true);
    try {
      const user = await loginWithGoogle(credential);
      toast.success(`Welcome, ${user.name}! 🎉`);
      navigate(user.role === 'admin' ? '/super-admin-portal-xyz' : redirectTo);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setDisabled(false);
    }
  };

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className={`w-full transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div ref={btnRef} className="w-full" />
    </div>
  );
}
