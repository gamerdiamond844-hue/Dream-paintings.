import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('Login cancelled.');
      setTimeout(() => window.close(), 1500);
      return;
    }

    if (!code) {
      setStatus('No auth code received.');
      setTimeout(() => window.close(), 1500);
      return;
    }

    // Exchange code for credential via backend
    api.post('/auth/google/exchange', {
      code,
      redirect_uri: `${window.location.origin}/auth/google/callback`,
    })
      .then(res => {
        // Send token back to the opener (parent window)
        if (window.opener) {
          window.opener.postMessage(
            { type: 'GOOGLE_AUTH_SUCCESS', credential: res.data.credential },
            window.location.origin
          );
        }
        setStatus('Success! Closing...');
        window.close();
      })
      .catch(err => {
        setStatus(err.response?.data?.message || 'Authentication failed.');
        setTimeout(() => window.close(), 2000);
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <svg className="animate-spin w-10 h-10 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-gray-600 font-medium">{status}</p>
      </div>
    </div>
  );
}
