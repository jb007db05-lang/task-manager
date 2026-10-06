import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import logoImg from '@/assets/logo.png';

const inputCls =
  'w-full bg-white border border-olive-200 rounded-xl text-olive-950 px-4 py-3 transition-all duration-200 focus:outline-none focus:border-olive-500 focus:ring-4 focus:ring-olive-500/10 placeholder:text-olive-400/80';
const labelCls = 'grid gap-1.5 font-bold text-xs uppercase tracking-widest text-olive-800';

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

          <div>
            <h1 className="text-3xl font-black tracking-tight text-olive-950 m-0">Create Account</h1>
            <p className="text-olive-500 text-sm mt-1.5">
              Get started with Pristine today. Experience seamless task sync.
            </p>
          </div>

          {/* Google OAuth */}
          <button
            className="w-full py-3 bg-white border border-olive-200 rounded-xl text-olive-800 font-bold hover:bg-olive-50 flex items-center justify-center gap-2.5 shadow-sm transition-all duration-250 active:scale-[0.98]"
            disabled={loading}
            onClick={startGoogleSignIn}
            type="button"
          >
            Sign up with Google
          </button>

          <div className="flex items-center gap-3 my-1">
            <hr className="flex-1 border-olive-200/60" />
            <span className="text-olive-400 text-xs font-bold uppercase tracking-widest">or</span>
            <hr className="flex-1 border-olive-200/60" />
          </div>

          {/* Registration Form */}
          <form className="grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
            <div className="grid grid-cols-2 gap-4">
              <label className={labelCls}>
                <span>First name</span>
                <input
                  autoComplete="given-name"
                  className={inputCls}
                  name="firstName"
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="John"
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
                  name="lastName"
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Doe"
                  required
                  type="text"
                  value={lastName}
                />
              </label>
            </div>

            <label className={labelCls}>
              <span>Email</span>
              <input
                autoComplete="email"
                className={`${inputCls} ${emailParam ? 'bg-olive-50/50 cursor-not-allowed opacity-80' : ''}`}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                readOnly={!!emailParam}
                type="email"
                value={email}
              />
            </label>

            <label className={labelCls}>
              <span>Password</span>
              <div className="relative">
                <input
                  autoComplete="new-password"
                  className={inputCls}
                  minLength={8}
                  maxLength={72}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
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
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <p className="text-olive-500 m-0 text-xs text-center">
            Already registered?{' '}
            <Link
              className="text-olive-800 font-bold hover:underline"
              to={
                tokenParam
                  ? `/login?token=${tokenParam}&email=${encodeURIComponent(emailParam)}`
                  : '/login'
              }
            >
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default RegisterPage;