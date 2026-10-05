import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import logoImg from '@/assets/logo.png';

interface InvitationDetails {
  token: string;
  email: string;
  projectName: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  isRegistered: boolean;
}

function AcceptInvitationPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [accepting, setAccepting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided. Please check your link.');
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.get<{ data: InvitationDetails }>(
          `/invitations/verify?token=${token}`
        );
        const data = response.data.data;
        setDetails(data);

        // If user is logged in, and the invitation is already accepted, redirect them
        if (data.status === 'ACCEPTED') {
          setSuccess(true);
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 3000);
        }
      } catch (err: unknown) {
        const errorObj = err as { response?: { data?: { error?: string } } };
        const msg = errorObj.response?.data?.error || 'Invalid or expired invitation token.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    void verifyToken();
  }, [token, navigate]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      await api.post('/invitations/accept', { token });
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      const msg = errorObj.response?.data?.error || 'Failed to accept invitation.';
      setError(msg);
    } finally {
      setAccepting(false);
    }
  };

  const handleLogout = () => {
    logout();
    // After logging out, reload or redirect to force correct login state
    if (details) {
      navigate(`/login?token=${token}&email=${encodeURIComponent(details.email)}`, { replace: true });
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-olive-950 via-neutral-900 to-olive-900 relative p-6 select-none font-sans overflow-hidden">
      {/* Glowing abstract backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-olive-700/10 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="w-full max-w-[500px] bg-white/10 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-md relative z-10 text-white flex flex-col items-center">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 shadow-md">
            <img src={logoImg} alt="Pristine Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-black tracking-[0.25em] text-lg">PRISTINE</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-olive-200 text-sm font-semibold tracking-wider uppercase">
              Verifying your invitation...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-8 text-center gap-4">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mb-2">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">Verification Failed</h2>
            <p className="text-olive-300 text-sm leading-relaxed max-w-[340px]">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-6 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-bold hover:bg-white/20 transition-all active:scale-[0.98]"
            >
              Go to Dashboard
            </button>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center py-8 text-center gap-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-2">
              <CheckCircle2 size={32} className="animate-bounce" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">Welcome Aboard!</h2>
            <p className="text-olive-300 text-sm">
              You are now a member of <strong>{details?.projectName}</strong>.
            </p>
            <p className="text-emerald-400/80 text-xs font-semibold uppercase tracking-widest mt-2 animate-pulse">
              Redirecting you to dashboard...
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <h2 className="text-3xl font-black text-center tracking-tight text-white mb-2">
              Project Invitation
            </h2>
            <p className="text-olive-200 text-sm text-center mb-6">
              You have been invited to join a collaborative space on Pristine.
            </p>

            <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-6 mb-8 text-center">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-olive-400">
                Project Name
              </span>
              <h3 className="text-xl font-bold text-white mt-1 mb-4">
                {details?.projectName}
              </h3>

              <div className="flex justify-center gap-6 text-xs border-t border-white/5 pt-4 text-olive-300">
                <div>
                  <span className="block text-[11px] font-extrabold uppercase tracking-widest text-olive-400 mb-0.5">
                    Invited Role
                  </span>
                  <span className="font-bold text-white uppercase tracking-wider">
                    {details?.role}
                  </span>
                </div>
                <div className="w-px bg-white/5" />
                <div>
                  <span className="block text-[11px] font-extrabold uppercase tracking-widest text-olive-400 mb-0.5">
                    Invited Email
                  </span>
                  <span className="font-bold text-white">{details?.email}</span>
                </div>
              </div>
            </div>

            {/* Auth check logic */}
            {user ? (
              user.email.toLowerCase() === details?.email.toLowerCase() ? (
                /* Logged in as correct user */
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600/50 text-olive-950 font-black rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 text-sm uppercase tracking-wider active:scale-[0.98]"
                >
                  {accepting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Accepting...
                    </>
                  ) : (
                    <>
                      Accept & Join Project <ArrowRight size={18} />
                    </>
                  )}
                </button>
              ) : (
                /* Logged in as WRONG user */
                <div className="w-full flex flex-col gap-4">
                  <div className="flex gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-300 text-xs leading-relaxed">
                    <AlertTriangle size={18} className="shrink-0" />
                    <div>
                      You are logged in as <strong className="text-white">{user.email}</strong>,
                      but this invitation was sent to <strong className="text-white">{details?.email}</strong>.
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 text-sm active:scale-[0.98]"
                  >
                    <LogOut size={16} /> Logout & Switch Accounts
                  </button>
                </div>
              )
            ) : (
              /* NOT logged in */
              <div className="w-full flex flex-col gap-3">
                {details?.isRegistered ? (
                  <>
                    <button
                      onClick={() =>
                        navigate(
                          `/login?token=${token}&email=${encodeURIComponent(details?.email || '')}`
                        )
                      }
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-olive-950 font-black rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 text-sm uppercase tracking-wider active:scale-[0.98]"
                    >
                      Login to Accept <ArrowRight size={18} />
                    </button>
                    <p className="text-center text-xs text-olive-400 mt-2">
                      An account already exists for {details?.email}.
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() =>
                        navigate(
                          `/register?token=${token}&email=${encodeURIComponent(details?.email || '')}`
                        )
                      }
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-olive-950 font-black rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 text-sm uppercase tracking-wider active:scale-[0.98]"
                    >
                      Create Account to Join <ArrowRight size={18} />
                    </button>
                    <p className="text-center text-xs text-olive-400 mt-2">
                      You will be automatically added to the project after registration.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default AcceptInvitationPage;
