import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';

interface AuthLayoutProps {
  children: ReactNode;
}

const previewRows = [
  { title: 'Finalize Q4 launch plan', status: 'In progress', dot: 'bg-amber-400', who: 'AK' },
  { title: 'Review onboarding copy', status: 'In review', dot: 'bg-blue-300', who: 'MR' },
  { title: 'Migrate billing webhooks', status: 'Done', dot: 'bg-brand-400', who: 'JS' },
];

/** Split layout for sign-in, sign-up and invitation screens. */
function AuthLayout({ children }: AuthLayoutProps): JSX.Element {
  return (
    <main className="min-h-screen grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] bg-white">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-950 text-white px-14 py-12 select-none">
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden="true" />
        <div className="absolute -right-40 -bottom-40 w-[520px] h-[520px] rounded-full bg-brand-700/30 blur-3xl" aria-hidden="true" />

        <Link to="/" className="relative flex items-center gap-2.5 w-fit">
          <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <img src={logoImg} alt="" className="w-5 h-5 object-contain" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">Pristine</span>
        </Link>

        <div className="relative max-w-[480px]">
          <h2 className="display-serif text-[52px] text-white m-0">
            Calm, organized work for teams that <em className="text-brand-300">ship</em>.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/60 max-w-[420px]">
            Plan projects, track every task against its SLA, and let AI handle the busywork — all in one quiet place.
          </p>

          <div className="mt-10 rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-1.5 backdrop-blur-sm">
            <div className="flex items-center justify-between px-3 py-2 text-xs text-white/50">
              <span>Today · Website relaunch</span>
              <span>3 tasks</span>
            </div>
            <ul className="m-0 p-0 list-none rounded-lg bg-white/[0.04] divide-y divide-white/[0.06]">
              {previewRows.map((row) => (
                <li key={row.title} className="flex items-center gap-3 px-3 py-2.5">
                  <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                  <span className={`flex-1 text-[13px] ${row.status === 'Done' ? 'text-white/40 line-through' : 'text-white/85'}`}>{row.title}</span>
                  <span className="text-[11px] text-white/40">{row.status}</span>
                  <span className="w-6 h-6 rounded-full bg-white/10 text-[10px] font-semibold flex items-center justify-center text-white/70">{row.who}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="relative m-0 text-xs text-white/35">© {new Date().getFullYear()} Pristine</p>
      </aside>

      {/* Form column */}
      <section className="flex flex-col min-h-screen px-6 sm:px-10">
        <div className="lg:hidden flex items-center gap-2.5 pt-8">
          <img src={logoImg} alt="" className="w-7 h-7 object-contain" />
          <span className="text-base font-semibold tracking-tight text-olive-950">Pristine</span>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
      </section>
    </main>
  );
}

export const authInputCls = 'input-base !h-10';
export const authLabelCls = 'grid gap-1.5 text-[13px] font-medium text-olive-700';

export default AuthLayout;
