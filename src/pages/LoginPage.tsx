import { FormEvent, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Shield, Smartphone } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import AuthLayout, { authInputCls, authLabelCls } from '@/components/AuthLayout';
import GoogleMark from '@/components/GoogleMark';

const inputCls = authInputCls;
const labelCls = authLabelCls;

function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';
  // Set by the Google callback (?error=) and by an expired session (?expired=1).
  const oauthError = searchParams.get('error');
  const sessionExpired = searchParams.get('expired') === '1';
  const redirectParam = searchParams.get('redirect');

  const {
    login,
    loginWithCompanionKey,
    loading,
    error,
    user,
    require2fa,
    tempEmail2fa,
    verify2fa,
    clearError
  } = useAuth();

  const [loginMode, setLoginMode] = useState<'account' | 'companion'>('account');
  const [email, setEmail] = useState<string>(emailParam);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Companion key
  const [companionKey, setCompanionKey] = useState<string>('');

  // 2FA code
  const [verificationCode, setVerificationCode] = useState<string>('');

  // Forgot password flow
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'none' | 'request-otp' | 'reset-password'>('none');
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetOtp, setResetOtp] = useState<string>('');
  const [resetPassword, setResetPassword] = useState<string>('');
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  const fromState = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const isInternalPath = (path: string | null | undefined): path is string =>
    !!path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');
  const nextPath = tokenParam
    ? `/accept-invitation?token=${encodeURIComponent(tokenParam)}`
    : isInternalPath(redirectParam)
      ? redirectParam
      : fromState?.pathname
        ? `${fromState.pathname}${fromState.search ?? ''}`
        : '/dashboard';

  const apiBase = useMemo(
    () => (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, ''),
    []
  );

  const startGoogleSignIn = (): void => {
    const params = new URLSearchParams();
    params.set('redirect', nextPath);
    params.set('origin', window.location.origin);
    window.location.assign(`${apiBase}/auth/google?${params.toString()}`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      const result = await login(email, password, rememberMe);
      if (!result.require2fa) {
        navigate(nextPath, { replace: true });
      }
    } catch {
      // Handled by AuthContext
    }
  };

  const handleVerify2fa = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await verify2fa(tempEmail2fa || email, verificationCode, rememberMe);
      navigate(nextPath, { replace: true });
    } catch {
      // Handled by AuthContext
    }
  };

  const handleCompanionSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await loginWithCompanionKey(companionKey);
      navigate(nextPath, { replace: true });
    } catch {
      // Handled by AuthContext
    }
  };

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setResetLoading(true);
    setResetErrorMessage(null);
    setResetSuccessMessage(null);
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
      setForgotPasswordStep('reset-password');
      setResetSuccessMessage('A password reset code has been sent to your email.');
    } catch (err) {
      const errorObj = err as { message?: string };
      setResetErrorMessage(errorObj.message || 'Failed to send verification code.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setResetLoading(true);
    setResetErrorMessage(null);
    setResetSuccessMessage(null);
    try {
      await api.post('/auth/verify-otp', { email: resetEmail, otp: resetOtp, password: resetPassword });
      setForgotPasswordStep('none');
      setResetSuccessMessage('Your password has been successfully reset. Please log in.');
      setEmail(resetEmail);
    } catch (err) {
      const errorObj = err as { message?: string };
      setResetErrorMessage(errorObj.message || 'Failed to reset password. Verify your code.');
    } finally {
      setResetLoading(false);
    }
  };

  const PasswordToggle = ({ shown, onToggle }: { shown: boolean; onToggle: () => void }) => (
    <button
      aria-label={shown ? 'Hide password' : 'Show password'}
      className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn !w-7 !h-7"
      onClick={onToggle}
      type="button"
    >
      {shown ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  const BackLink = ({ onClick, label = 'Back to sign in' }: { onClick: () => void; label?: string }) => (
    <button
      className="flex items-center justify-center gap-1.5 text-[13px] text-olive-500 hover:text-olive-900 transition-colors"
      onClick={onClick}
      type="button"
    >
      <ArrowLeft size={14} /> {label}
    </button>
  );

  const Notice = ({ tone, children }: { tone: 'success' | 'warning' | 'error'; children: React.ReactNode }) => (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={[
        'm-0 px-3 py-2.5 rounded-lg border text-[13px] leading-snug',
        tone === 'success' ? 'bg-brand-50 border-brand-200 text-brand-900' : tone === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-800'
      ].join(' ')}
    >
      {children}
    </p>
  );

  return (
    <AuthLayout>
      {require2fa ? (
        <form className="grid gap-5" onSubmit={(event) => void handleVerify2fa(event)}>
          <div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 flex items-center justify-center mb-5">
              <Shield size={19} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-olive-950 m-0">Check your email</h1>
            <p className="text-olive-500 text-sm mt-1.5 mb-0">
              We sent a 6-digit code to <span className="font-medium text-olive-800">{tempEmail2fa || email}</span>.
            </p>
          </div>

          <label className={labelCls}>
            <span>Verification code</span>
            <input
              autoFocus
              autoComplete="one-time-code"
              className={`${inputCls} text-center tracking-[0.5em] font-mono !text-lg`}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setVerificationCode(event.target.value)}
              placeholder="000000"
              required
              type="text"
              value={verificationCode}
            />
          </label>

          {error ? <Notice tone="error">{error}</Notice> : null}

          <button className="btn btn-primary btn-lg w-full" disabled={loading} type="submit">
            {loading ? 'Verifying…' : 'Verify and sign in'}
          </button>

          <BackLink
            onClick={() => {
              clearError();
              window.location.reload();
            }}
          />
        </form>
      ) : forgotPasswordStep === 'request-otp' ? (
        <form className="grid gap-5" onSubmit={(event) => void handleRequestOtp(event)}>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-olive-950 m-0">Reset your password</h1>
            <p className="text-olive-500 text-sm mt-1.5 mb-0">Enter your account email and we'll send you a reset code.</p>
          </div>

          <label className={labelCls}>
            <span>Email</span>
            <input
              autoFocus
              autoComplete="email"
              className={inputCls}
              onChange={(event) => setResetEmail(event.target.value)}
              placeholder="you@company.com"
              required
              type="email"
              value={resetEmail}
            />
          </label>

          {resetErrorMessage ? <Notice tone="error">{resetErrorMessage}</Notice> : null}

          <button className="btn btn-primary btn-lg w-full" disabled={resetLoading} type="submit">
            {resetLoading ? 'Sending…' : 'Send reset code'}
          </button>

          <BackLink
            onClick={() => {
              setForgotPasswordStep('none');
              setResetErrorMessage(null);
            }}
          />
        </form>
      ) : forgotPasswordStep === 'reset-password' ? (
        <form className="grid gap-5" onSubmit={(event) => void handleResetPassword(event)}>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-olive-950 m-0">Choose a new password</h1>
            <p className="text-olive-500 text-sm mt-1.5 mb-0">Enter the code from your inbox and a new password.</p>
          </div>

          {resetSuccessMessage ? <Notice tone="success">{resetSuccessMessage}</Notice> : null}

          <label className={labelCls}>
            <span>Reset code</span>
            <input
              autoFocus
              autoComplete="one-time-code"
              className={`${inputCls} font-mono tracking-widest`}
              inputMode="numeric"
              onChange={(event) => setResetOtp(event.target.value)}
              placeholder="6-digit code"
              required
              type="text"
              value={resetOtp}
            />
          </label>

          <label className={labelCls}>
            <span>New password</span>
            <div className="relative">
              <input
                className={`${inputCls} !pr-10`}
                autoComplete="new-password"
                maxLength={72}
                minLength={8}
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                type={showResetPassword ? 'text' : 'password'}
                value={resetPassword}
              />
              <PasswordToggle shown={showResetPassword} onToggle={() => setShowResetPassword(!showResetPassword)} />
            </div>
          </label>

          {resetErrorMessage ? <Notice tone="error">{resetErrorMessage}</Notice> : null}

          <button className="btn btn-primary btn-lg w-full" disabled={resetLoading} type="submit">
            {resetLoading ? 'Updating…' : 'Update password'}
          </button>

          <BackLink
            label="Cancel"
            onClick={() => {
              setForgotPasswordStep('none');
              setResetErrorMessage(null);
              setResetSuccessMessage(null);
            }}
          />
        </form>
      ) : (
        <div className="grid gap-6">
          <div>
            <h1 className="display-serif text-[40px] text-olive-950 m-0">Welcome back</h1>
            <p className="text-olive-500 text-sm mt-2 mb-0">Sign in to pick up where you left off.</p>
          </div>

          {resetSuccessMessage ? <Notice tone="success">{resetSuccessMessage}</Notice> : null}
          {oauthError || sessionExpired ? (
            <Notice tone="warning">{oauthError || 'Your session has expired. Please sign in again.'}</Notice>
          ) : null}

          <button className="btn btn-secondary btn-lg w-full" disabled={loading} onClick={startGoogleSignIn} type="button">
            <GoogleMark />
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <hr className="flex-1 border-0 h-px bg-olive-200" />
            <span className="text-olive-400 text-xs">or</span>
            <hr className="flex-1 border-0 h-px bg-olive-200" />
          </div>

          {loginMode === 'account' ? (
            <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
              <label className={labelCls}>
                <span>Email</span>
                <input
                  autoComplete="email"
                  className={inputCls}
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  required
                  type="email"
                  value={email}
                />
              </label>

              <div className={labelCls}>
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password">Password</label>
                  <button
                    className="text-[13px] font-normal text-brand-700 hover:text-brand-900 transition-colors"
                    onClick={() => {
                      setForgotPasswordStep('request-otp');
                      setResetEmail(email);
                      clearError();
                    }}
                    type="button"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    autoComplete="current-password"
                    className={`${inputCls} !pr-10`}
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                <input
                  checked={rememberMe}
                  className="w-4 h-4 accent-brand-600"
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                <span className="text-[13px] text-olive-600">Keep me signed in</span>
              </label>

              {user != null ? <p className="text-olive-500 text-xs m-0 text-center">You're already signed in. Redirecting…</p> : null}
              {error ? <Notice tone="error">{error}</Notice> : null}

              <button className="btn btn-primary btn-lg w-full mt-1" disabled={loading} type="submit">
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form className="grid gap-4" onSubmit={(event) => void handleCompanionSubmit(event)}>
              <label className={labelCls}>
                <span>Companion device ID</span>
                <input
                  autoFocus
                  className={inputCls}
                  name="companion-key"
                  onChange={(event) => setCompanionKey(event.target.value)}
                  placeholder="Paste the ID from your primary device"
                  required
                  type="password"
                  value={companionKey}
                />
                <span className="text-xs font-normal text-olive-500">Generate one in Settings → Security on a device that's already signed in.</span>
              </label>
              {error ? <Notice tone="error">{error}</Notice> : null}
              <button className="btn btn-primary btn-lg w-full" disabled={loading} type="submit">
                {loading ? 'Authorizing…' : 'Authorize this device'}
              </button>
            </form>
          )}

          <button
            className="flex items-center justify-center gap-1.5 text-[13px] text-olive-500 hover:text-olive-900 transition-colors"
            onClick={() => {
              setLoginMode(loginMode === 'account' ? 'companion' : 'account');
              clearError();
            }}
            type="button"
          >
            {loginMode === 'account' ? <Smartphone size={14} /> : <Shield size={14} />}
            {loginMode === 'account' ? 'Sign in with a companion device' : 'Sign in with email and password'}
          </button>

          <p className="text-olive-500 m-0 text-[13px] text-center pt-4 border-t border-olive-100">
            New to Pristine?{' '}
            <Link
              className="font-medium text-brand-700 hover:text-brand-900"
              to={tokenParam ? `/register?token=${tokenParam}&email=${encodeURIComponent(emailParam)}` : '/register'}
            >
              Create an account
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  );
}

export default LoginPage;