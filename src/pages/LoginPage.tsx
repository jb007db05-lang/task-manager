import { FormEvent, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Shield, Smartphone, Sparkles } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import logoImg from '@/assets/logo.png';

const inputCls =
  'w-full bg-white border border-olive-200 rounded-xl text-olive-950 px-4 py-3 transition-all duration-200 focus:outline-none focus:border-olive-500 focus:ring-4 focus:ring-olive-500/10 placeholder:text-olive-400/80';
const labelCls = 'grid gap-1.5 font-bold text-xs uppercase tracking-widest text-olive-800';

function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

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

  const nextPath = tokenParam
    ? `/accept-invitation?token=${tokenParam}`
    : ((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/');

  const apiBase = useMemo(
    () => (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, ''),
    []
  );

  const startGoogleSignIn = (): void => {
    const params = new URLSearchParams();
    params.set('redirect', nextPath);
    window.location.assign(`${apiBase}/auth/google?${params.toString()}`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await login(email, password, rememberMe);
      if (!require2fa) {
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

  return (
    <main className="min-h-screen flex bg-white font-sans overflow-hidden">
      {/* Left Side (65% width) */}
      <div className="hidden lg:flex lg:w-[65%] bg-gradient-to-br from-olive-950 via-neutral-900 to-olive-900 relative p-16 flex-col justify-between overflow-hidden select-none">
        {/* Glowing abstract backgrounds */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-olive-700/10 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[6000ms]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-white/20 shadow-md p-2">
            <img src={logoImg} alt="Pristine Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-white font-black tracking-[0.25em] text-lg">PRISTINE</span>
        </div>

        {/* Visual Centerpiece (Horizontal layout of text and red outline logo container) */}
        <div className="relative z-10 my-auto w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Text Centerpiece */}
          <div className="flex flex-col gap-6 max-w-[500px]">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full w-fit backdrop-blur-sm">
              <Sparkles size={13} className="text-emerald-400" />
              <span className="text-xs font-bold text-olive-200 uppercase tracking-widest">Version 1.2 Active</span>
            </div>
            <h2 className="text-5xl font-black leading-[1.15] text-white tracking-tight">
              Elevate your workflow with{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-olive-300 bg-clip-text text-transparent">
                effortless organization
              </span>
            </h2>
            <p className="text-olive-300 text-lg leading-relaxed font-light">
              A premium, secure environment designed for high-performing teams to coordinate, automate, and synchronize
              development epics.
            </p>
          </div>

          {/* Large Premium Showcase containing the Logo */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[420px] aspect-square bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 rounded-3xl flex items-center justify-center relative overflow-hidden group transition-all duration-300 p-10 shadow-2xl backdrop-blur-sm">
              {/* Inner ambient emerald glow hover effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Logo container inside the showcase */}
              <div className="w-36 h-36 bg-white rounded-2xl flex items-center justify-center p-6 shadow-2xl relative z-10 transition-all duration-500 group-hover:scale-105 group-hover:shadow-emerald-500/10">
                <img src={logoImg} alt="Pristine Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(16,185,129,0.15)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer branding */}
        <div className="relative z-10 flex items-center justify-between text-xs text-olive-400 font-bold uppercase tracking-widest">
          <span>© 2026 Pristine</span>
        </div>
      </div>

      {/* Right Side (35% width on large screens, full width on small screens) */}
      <section className="w-full lg:w-[35%] flex items-center justify-center p-8 lg:p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-[380px] grid gap-6">
          {/* Brand Logo Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white border border-zinc-200/50 rounded-xl flex items-center justify-center p-2 shadow-md">
              <img src={logoImg} alt="Pristine Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-black tracking-[0.25em] text-lg text-olive-950">PRISTINE</span>
          </div>

          {/* 2FA view */}
          {require2fa ? (
            <form className="grid gap-6" onSubmit={(event) => void handleVerify2fa(event)}>
              <div className="text-center">
                <div className="w-12 h-12 bg-olive-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <Shield size={22} />
                </div>
                <h1 className="text-2xl font-black text-olive-950 m-0">Two-Factor Authentication</h1>
                <p className="text-olive-500 text-sm mt-2">
                  We've sent a 6-digit verification code to{' '}
                  <strong className="text-olive-700">{tempEmail2fa || email}</strong>.
                </p>
              </div>

              <label className={labelCls}>
                <span>Verification Code</span>
                <input
                  className={`${inputCls} text-center tracking-[0.2em] font-mono text-lg`}
                  maxLength={6}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  placeholder="000000"
                  required
                  type="text"
                  value={verificationCode}
                />
              </label>

              {error ? <p className="text-red-600 m-0 text-sm font-medium text-center">{error}</p> : null}

              <button
                className="w-full bg-olive-900 text-white rounded-xl py-3.5 text-sm font-bold hover:bg-olive-800 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <button
                className="flex items-center justify-center gap-2 text-olive-600 hover:text-olive-900 text-sm font-semibold transition-colors mt-2"
                onClick={() => {
                  clearError();
                  window.location.reload();
                }}
                type="button"
              >
                <ArrowLeft size={16} /> Back to Login
              </button>
            </form>
          ) : forgotPasswordStep === 'request-otp' ? (
            /* Forgot Password Request Form */
            <form className="grid gap-5" onSubmit={(event) => void handleRequestOtp(event)}>
              <div>
                <h1 className="text-2xl font-black text-olive-950 m-0">Reset Password</h1>
                <p className="text-olive-500 text-sm mt-1">
                  Enter your account email to receive a password reset OTP code.
                </p>
              </div>

              <label className={labelCls}>
                <span>Email Address</span>
                <input
                  autoComplete="email"
                  className={inputCls}
                  onChange={(event) => setResetEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={resetEmail}
                />
              </label>

              {resetErrorMessage ? (
                <p className="text-red-600 m-0 text-sm font-medium">{resetErrorMessage}</p>
              ) : null}

              <button
                className="bg-olive-900 text-white rounded-xl py-3.5 text-sm font-bold hover:bg-olive-800 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                disabled={resetLoading}
                type="submit"
              >
                {resetLoading ? 'Sending OTP...' : 'Send Reset Code'}
              </button>

              <button
                className="flex items-center justify-center gap-2 text-olive-600 hover:text-olive-900 text-sm font-semibold transition-colors mt-2"
                onClick={() => {
                  setForgotPasswordStep('none');
                  setResetErrorMessage(null);
                }}
                type="button"
              >
                <ArrowLeft size={16} /> Back to Login
              </button>
            </form>
          ) : forgotPasswordStep === 'reset-password' ? (
            /* Forgot Password Reset Form */
            <form className="grid gap-5" onSubmit={(event) => void handleResetPassword(event)}>
              <div>
                <h1 className="text-2xl font-black text-olive-950 m-0">Enter Reset OTP</h1>
                <p className="text-olive-500 text-sm mt-1">
                  Check your inbox for the OTP code and enter your new password below.
                </p>
              </div>

              {resetSuccessMessage ? (
                <p className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium">
                  {resetSuccessMessage}
                </p>
              ) : null}

              <label className={labelCls}>
                <span>Reset OTP Code</span>
                <input
                  className={`${inputCls} font-mono`}
                  onChange={(event) => setResetOtp(event.target.value)}
                  placeholder="6-digit code"
                  required
                  type="text"
                  value={resetOtp}
                />
              </label>

              <label className={labelCls}>
                <span>New Password</span>
                <div className="relative">
                  <input
                    className={inputCls}
                    onChange={(event) => setResetPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    required
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPassword}
                  />
                  <button
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-olive-400 hover:text-olive-600 transition-colors"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    type="button"
                  >
                    {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {resetErrorMessage ? (
                <p className="text-red-600 m-0 text-sm font-medium">{resetErrorMessage}</p>
              ) : null}

              <button
                className="bg-olive-900 text-white rounded-xl py-3.5 text-sm font-bold hover:bg-olive-800 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                disabled={resetLoading}
                type="submit"
              >
                {resetLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>

              <button
                className="flex items-center justify-center gap-2 text-olive-600 hover:text-olive-900 text-sm font-semibold transition-colors mt-2"
                onClick={() => {
                  setForgotPasswordStep('none');
                  setResetErrorMessage(null);
                  setResetSuccessMessage(null);
                }}
                type="button"
              >
                <ArrowLeft size={16} /> Cancel
              </button>
            </form>
          ) : (
            /* Main Login Form */
            <>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-olive-950 m-0">Sign In</h1>
                <p className="text-olive-500 text-sm mt-1.5">
                  Welcome back. Enter your credentials to manage your workflow.
                </p>
              </div>

              {resetSuccessMessage ? (
                <p className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium">
                  {resetSuccessMessage}
                </p>
              ) : null}

              {/* Google OAuth */}
              <button
                className="w-full py-3 bg-white border border-olive-200 rounded-xl text-olive-800 font-bold hover:bg-olive-50 flex items-center justify-center gap-2.5 shadow-sm transition-all duration-250 active:scale-[0.98]"
                disabled={loading}
                onClick={startGoogleSignIn}
                type="button"
              >
                Sign in with Google
              </button>

              <div className="flex items-center gap-3 my-1">
                <hr className="flex-1 border-olive-200/60" />
                <span className="text-olive-400 text-xs font-bold uppercase tracking-widest">or</span>
                <hr className="flex-1 border-olive-200/60" />
              </div>

              {/* Mode switch */}
              <div
                aria-label="Login method"
                className="flex p-1 bg-olive-100/50 border border-olive-200/30 rounded-xl gap-1"
                role="tablist"
              >
                {(
                  [
                    { key: 'account', label: 'Account', Icon: Shield },
                    { key: 'companion', label: 'Companion', Icon: Smartphone }
                  ] as const
                ).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    aria-selected={loginMode === key}
                    className={[
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200',
                      loginMode === key
                        ? 'bg-white text-olive-950 shadow-sm border border-olive-100'
                        : 'text-olive-500 hover:text-olive-700'
                    ].join(' ')}
                    onClick={() => {
                      setLoginMode(key);
                      clearError();
                    }}
                    type="button"
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {/* Account form */}
              {loginMode === 'account' ? (
                <form className="grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
                  <label className={labelCls}>
                    <span>Email</span>
                    <input
                      autoComplete="email"
                      className={inputCls}
                      name="email"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                      type="email"
                      value={email}
                    />
                  </label>

                  <label className={labelCls}>
                    <div className="flex items-center justify-between">
                      <span>Password</span>
                      <button
                        className="text-xs text-olive-600 hover:text-olive-900 transition-colors lowercase font-bold tracking-normal"
                        onClick={() => {
                          setForgotPasswordStep('request-otp');
                          setResetEmail(email);
                          clearError();
                        }}
                        type="button"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        autoComplete="current-password"
                        className={inputCls}
                        name="password"
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                      />
                      <button
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-olive-400 hover:text-olive-600 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>

                  <div className="flex items-center justify-between select-none">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        checked={rememberMe}
                        className="w-4 h-4 rounded border-olive-300 text-olive-800 focus:ring-olive-500/20"
                        onChange={(event) => setRememberMe(event.target.checked)}
                        type="checkbox"
                      />
                      <span className="text-[11px] font-extrabold text-olive-600 uppercase tracking-widest">
                        Remember Me
                      </span>
                    </label>
                  </div>

                  {user != null ? (
                    <p className="text-olive-500 text-xs m-0 text-center">
                      You already have an active session. Redirecting...
                    </p>
                  ) : null}

                  {error ? <p className="text-red-600 m-0 text-xs font-medium text-center">{error}</p> : null}

                  <button
                    className="bg-olive-900 text-white rounded-xl py-3.5 text-sm font-bold hover:bg-olive-800 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                    disabled={loading}
                    type="submit"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form className="grid gap-5" onSubmit={(event) => void handleCompanionSubmit(event)}>
                  <label className={labelCls}>
                    <span>Companion Device ID</span>
                    <input
                      className={inputCls}
                      name="companion-key"
                      onChange={(event) => setCompanionKey(event.target.value)}
                      placeholder="Paste companion device ID"
                      required
                      type="password"
                      value={companionKey}
                    />
                  </label>
                  <p className="text-olive-500 m-0 text-xs leading-relaxed">
                    Generate a companion device ID from your primary device in settings.
                  </p>
                  {error ? <p className="text-red-600 m-0 text-xs font-medium text-center">{error}</p> : null}
                  <button
                    className="bg-olive-900 text-white rounded-xl py-3.5 text-sm font-bold hover:bg-olive-800 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                    disabled={loading}
                    type="submit"
                  >
                    {loading ? 'Authorizing...' : 'Authorize Device'}
                  </button>
                </form>
              )}

              <p className="text-olive-500 m-0 text-xs text-center">
                New to Pristine?{' '}
                <Link
                  className="text-olive-800 font-bold hover:underline"
                  to={
                    tokenParam
                      ? `/register?token=${tokenParam}&email=${encodeURIComponent(emailParam)}`
                      : '/register'
                  }
                >
                  Create an account
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default LoginPage;