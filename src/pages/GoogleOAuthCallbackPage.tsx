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
    <main className="min-h-screen flex items-center justify-center bg-olive-50 p-6">
      {error ? (
        <div className="card max-w-sm w-full p-6 text-center grid gap-4">
          <p role="alert" className="m-0 text-sm text-red-700">
            {error}
          </p>
          <Link to="/login" replace className="btn btn-secondary w-full">
            Back to sign in
          </Link>
        </div>
      ) : (
        <Loader label="Finishing Google sign-in…" />
      )}
    </main>
  );
}

export default GoogleOAuthCallbackPage;
