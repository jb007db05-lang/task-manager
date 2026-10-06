import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';

/** Codes already sent: the code is single-use and StrictMode runs effects twice. */
const redeemedCodes = new Map<string, Promise<void>>();

const safePath = (value: string | null): string =>
  value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/dashboard';

/**
 * Landing page after Google sign-in. The backend redirects here with a
 * single-use `code`, which is exchanged for a session; tokens never appear
 * in the URL.
 */
function GoogleOAuthCallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeGoogleSignIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const redirectTo = safePath(params.get('redirect'));

    if (!code) {
      setError('Google sign-in did not return a sign-in code. Please try again.');
      return;
    }

    // Drop the code from the address bar and history right away.
    window.history.replaceState(null, '', location.pathname);

    let cancelled = false;
    let pending = redeemedCodes.get(code);
    if (!pending) {
      pending = completeGoogleSignIn(code);
      redeemedCodes.set(code, pending);
    }
    pending.then(
      () => {
        if (!cancelled) navigate(redirectTo === '/' ? '/dashboard' : redirectTo, { replace: true });
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(typeof err === 'string' ? err : 'Unable to complete Google sign-in. Please try again.');
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [completeGoogleSignIn, location.pathname, location.search, navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-6 font-sans">
      {error ? (
        <div className="max-w-sm text-center grid gap-4">
          <p role="alert" className="m-0 text-sm font-medium text-red-600">
            {error}
          </p>
          <Link to="/login" replace className="text-sm font-bold text-olive-800 underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 justify-items-center text-sm text-olive-700">
          <Loader />
          <p className="m-0">Finishing Google sign-in…</p>
        </div>
      )}
    </main>
  );
}

export default GoogleOAuthCallbackPage;
