import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import AuthLayout, { authInputCls, authLabelCls } from '@/components/AuthLayout';
import GoogleMark from '@/components/GoogleMark';

const inputCls = authInputCls;
const labelCls = authLabelCls;

function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const { register, loading, error, user } = useAuth();
  const [email, setEmail] = useState<string>(emailParam);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const apiBase = useMemo(
    () => (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, ''),
    []
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await register({ email, password, firstName, lastName });
      if (tokenParam) {
        navigate(`/accept-invitation?token=${encodeURIComponent(tokenParam)}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      // Handled by AuthContext
    }
  };

  const startGoogleSignIn = (): void => {
    const params = new URLSearchParams();
    params.set('redirect', tokenParam ? `/accept-invitation?token=${encodeURIComponent(tokenParam)}` : '/dashboard');
    params.set('origin', window.location.origin);
    window.location.assign(`${apiBase}/auth/google?${params.toString()}`);
  };

  return (
    <AuthLayout>
      <div className="grid gap-6">
        <div>
          <h1 className="display-serif text-[40px] text-olive-950 m-0">Create your account</h1>
          <p className="text-olive-500 text-sm mt-2 mb-0">
            {tokenParam ? 'Sign up to accept your project invitation.' : 'Get your team organized in a couple of minutes.'}
          </p>
        </div>

        <button className="btn btn-secondary btn-lg w-full" disabled={loading} onClick={startGoogleSignIn} type="button">
          <GoogleMark />
          Sign up with Google
        </button>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-0 h-px bg-olive-200" />
          <span className="text-olive-400 text-xs">or</span>
          <hr className="flex-1 border-0 h-px bg-olive-200" />
        </div>

        <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>
              <span>First name</span>
              <input
                autoComplete="given-name"
                className={inputCls}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Jane"
                required
                type="text"
                value={firstName}
              />
            </label>
            <label className={labelCls}>
              <span>Last name</span>
              <input
                autoComplete="family-name"
                className={inputCls}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Doe"
                required
                type="text"
                value={lastName}
              />
            </label>
          </div>

          <label className={labelCls}>
            <span>Work email</span>
            <input
              autoComplete="email"
              className={inputCls}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className={labelCls}>
            <span>Password</span>
            <div className="relative">
              <input
                autoComplete="new-password"
                className={`${inputCls} !pr-10`}
                minLength={8}
                maxLength={72}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn !w-7 !h-7"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {user != null ? <p className="text-olive-500 text-xs m-0 text-center">You're already signed in. Redirecting…</p> : null}
          {error ? (
            <p role="alert" className="m-0 px-3 py-2.5 rounded-lg border border-red-200 bg-red-50 text-[13px] text-red-800">{error}</p>
          ) : null}

          <button className="btn btn-primary btn-lg w-full mt-1" disabled={loading} type="submit">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-olive-500 m-0 text-[13px] text-center pt-4 border-t border-olive-100">
          Already have an account?{' '}
          <Link
            className="font-medium text-brand-700 hover:text-brand-900"
            to={tokenParam ? `/login?token=${tokenParam}&email=${encodeURIComponent(emailParam)}` : '/login'}
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default RegisterPage;