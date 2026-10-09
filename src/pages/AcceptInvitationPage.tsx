import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import AuthLayout from '@/components/AuthLayout';

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

  const handleLogout = async () => {
    await logout();
    // After logging out, reload or redirect to force correct login state
    if (details) {
      navigate(`/login?token=${token}&email=${encodeURIComponent(details.email)}`, { replace: true });
    }
  };

  const loginHref = `/login?token=${token}&email=${encodeURIComponent(details?.email || '')}`;
  const registerHref = `/register?token=${token}&email=${encodeURIComponent(details?.email || '')}`;

  return (
    <AuthLayout>
      {loading ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
          <p className="text-olive-500 text-sm m-0">Checking your invitation…</p>
        </div>
      ) : error ? (
        <div className="grid gap-5">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100 flex items-center justify-center">
            <AlertTriangle size={19} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-olive-950 m-0">This invitation can't be used</h1>
            <p className="text-olive-500 text-sm mt-1.5 mb-0">{error}</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-lg w-full" type="button">
            Go to dashboard
          </button>
        </div>
      ) : success ? (
        <div className="grid gap-5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 flex items-center justify-center">
            <CheckCircle2 size={19} />
          </div>
          <div>
            <h1 className="display-serif text-[40px] text-olive-950 m-0">You're in</h1>
            <p className="text-olive-500 text-sm mt-2 mb-0">
              You're now a member of <span className="font-medium text-olive-900">{details?.projectName}</span>. Taking you to your dashboard…
            </p>
          </div>
          <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6">
          <div>
            <p className="text-sm text-olive-500 m-0 mb-1">You've been invited to join</p>
            <h1 className="display-serif text-[40px] text-olive-950 m-0 break-words">{details?.projectName}</h1>
          </div>

          <dl className="m-0 rounded-xl border border-olive-200 divide-y divide-olive-100 text-[13px]">
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-olive-500">Role</dt>
              <dd className="m-0"><span className={`badge ${details?.role === 'ADMIN' ? 'badge-green' : 'badge-slate'}`}>{details?.role === 'ADMIN' ? 'Admin' : 'Member'}</span></dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-olive-500">Invitation for</dt>
              <dd className="m-0 font-medium text-olive-900 truncate">{details?.email}</dd>
            </div>
          </dl>

          {user ? (
            user.email.toLowerCase() === details?.email.toLowerCase() ? (
              <button onClick={handleAccept} disabled={accepting} className="btn btn-primary btn-lg w-full" type="button">
                {accepting ? <Loader2 size={16} className="animate-spin" /> : null}
                {accepting ? 'Joining…' : 'Accept and join project'}
                {!accepting && <ArrowRight size={16} />}
              </button>
            ) : (
              <div className="grid gap-3">
                <p className="m-0 flex gap-2.5 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-[13px] text-amber-900 leading-snug">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>
                    You're signed in as <strong className="font-medium">{user.email}</strong>, but this invitation is for{' '}
                    <strong className="font-medium">{details?.email}</strong>.
                  </span>
                </p>
                <button onClick={handleLogout} className="btn btn-secondary btn-lg w-full" type="button">
                  <LogOut size={16} /> Sign out and switch account
                </button>
              </div>
            )
          ) : details?.isRegistered ? (
            <div className="grid gap-2">
              <button onClick={() => navigate(loginHref)} className="btn btn-primary btn-lg w-full" type="button">
                Sign in to accept <ArrowRight size={16} />
              </button>
              <p className="text-center text-xs text-olive-500 m-0">An account already exists for {details?.email}.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              <button onClick={() => navigate(registerHref)} className="btn btn-primary btn-lg w-full" type="button">
                Create an account to join <ArrowRight size={16} />
              </button>
              <p className="text-center text-xs text-olive-500 m-0">You'll be added to the project as soon as you sign up.</p>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  );
}

export default AcceptInvitationPage;
