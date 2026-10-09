import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  Clock3,
  FolderKanban,
  Gauge,
  MessageCircle,
  Plug,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import logoImg from '@/assets/logo.png';
import {
  Comparison,
  DeepDives,
  DevelopersSection,
  FactBand,
  HowItWorks,
  PlannerShowcase,
  PromptShowcase,
  SecurityGrid,
  TeamsStrip,
  UseCases,
} from '@/components/landing/LandingSections';

type Level = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type Urgency = 'NORMAL' | 'NEAR_BREACH' | 'BREACHED';
type Impact = 'LOW' | 'MEDIUM' | 'HIGH';

const BASE_POINTS: Record<Level, number> = { LOW: 10, MEDIUM: 30, HIGH: 60, CRITICAL: 90 };
const URGENCY_POINTS: Record<Urgency, number> = { NORMAL: 0, NEAR_BREACH: 20, BREACHED: 40 };
const IMPACT_POINTS: Record<Impact, number> = { LOW: 5, MEDIUM: 15, HIGH: 30 };

const features: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: FolderKanban, title: 'Projects, epics and tasks', body: 'Break work down the way your team thinks about it. Switch between a focused list and a drag-and-drop board.' },
  { icon: Clock3, title: 'SLA tracking built in', body: 'Every task carries response and resolution targets. Timers pause automatically while a task is blocked.' },
  { icon: Gauge, title: 'Priority that keeps up', body: 'Priority is recalculated from severity, SLA pressure, impact and the work waiting downstream.' },
  { icon: BrainCircuit, title: 'AI planning and search', body: 'Describe a goal and get a draft plan. Find related work by meaning, not just matching keywords.' },
  { icon: MessageCircle, title: 'Chat and approvals', body: 'Discuss work next to the work. Route sensitive changes through ordered sign-offs.' },
  { icon: ShieldCheck, title: 'A tamper-evident history', body: 'Every change is chained with SHA-256 hashes and can be verified in one click, with retention and legal hold.' },
];

const searchPresets = [
  {
    query: 'auth latency problems',
    results: [
      { title: 'Optimize Redis access-token cache', score: 0.94 },
      { title: 'Review request queue delay in API client', score: 0.88 },
      { title: '2FA code delivery gateway timeout', score: 0.81 },
    ],
  },
  {
    query: 'SLA breach warnings',
    results: [
      { title: 'Escalate legal-hold override request', score: 0.96 },
      { title: 'Audit blocked tasks on the database layer', score: 0.89 },
      { title: 'Check priority offset logs', score: 0.83 },
    ],
  },
  {
    query: 'audit log verification',
    results: [
      { title: 'Verify activity hash-chain integrity', score: 0.98 },
      { title: 'Lock project record retention', score: 0.85 },
    ],
  },
];

const faqs = [
  {
    q: 'What is Pristine, in one sentence?',
    a: 'A workspace for planning and tracking team work — projects, epics and tasks — with SLAs, automatic prioritization, chat, approvals and a verifiable history built in.',
  },
  {
    q: 'How is a task’s priority score calculated?',
    a: 'Pristine adds up four signals: the task’s base severity (10–90 points), SLA pressure (+20 when close to breaching, +40 once breached), downstream work it is blocking (15 points per task) and organizational impact (5–30 points). The score is capped at 200 and mapped to Low, Medium, High or Critical.',
  },
  {
    q: 'When do SLA timers pause?',
    a: 'Response and resolution timers pause while a task is marked as blocked or waiting on an approval, and resume automatically once it is unblocked.',
  },
  {
    q: 'Which AI models can I use?',
    a: 'The AI planner, prompt playground and intelligence features work with Google Gemini, OpenAI and Anthropic models. Add your own provider keys in Settings — they are stored encrypted — and choose a provider per project.',
  },
  {
    q: 'How does semantic search find related tasks?',
    a: 'Tasks and notes are converted into vector embeddings. A search compares meaning rather than exact words, so “login is slow” can surface a task called “Optimize access-token cache”.',
  },
  {
    q: 'What makes the activity history tamper-evident?',
    a: 'Each change is stored as a sequential entry whose SHA-256 hash includes the previous entry’s hash. Admins can verify the whole chain from the activity panel — any edited or missing entry breaks the chain and is reported.',
  },
  {
    q: 'Can I invite people who don’t have an account yet?',
    a: 'Yes. Invite anyone by email as an admin or member. Existing users get an in-app invitation; new users receive an email to sign up and are added to the project automatically.',
  },
  {
    q: 'Can I test the SDK locally before going live?',
    a: 'Yes. Create a sandbox integration — its key works on any localhost port, shows draft guides and surveys, and keeps its data separate from production analytics.',
  },
];

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}): JSX.Element {
  return (
    <div>
      <div className="text-[13px] font-medium text-olive-700 mb-2">{label}</div>
      <div className="flex p-0.5 rounded-lg bg-olive-100 border border-olive-200/70" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 h-8 rounded-md text-[13px] transition-colors ${
              value === opt.value ? 'bg-white shadow-xs text-olive-950 font-medium' : 'text-olive-500 hover:text-olive-800'
            }`}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Static product preview used in the hero. */
function ProductPreview(): JSX.Element {
  const rows = [
    { t: 'Audit current color tokens', s: 'In progress', d: 'bg-amber-400', p: 3, who: 'DR' },
    { t: 'Build button and input components', s: 'To do', d: 'bg-olive-400', p: 2, who: 'AK' },
    { t: 'Set up redirects for retired URLs', s: 'In review', d: 'bg-blue-400', p: 3, who: 'MS' },
    { t: 'Export blog posts from old CMS', s: 'Done', d: 'bg-brand-500', p: 2, who: 'JL' },
  ];
  return (
    <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-olive-950/10 overflow-hidden text-left">
      <div className="flex items-center gap-1.5 px-4 h-9 border-b border-olive-100 bg-olive-50">
        <span className="w-2.5 h-2.5 rounded-full bg-olive-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-olive-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-olive-200" />
      </div>
      <div className="flex min-h-[340px]">
        <div className="hidden sm:flex flex-col gap-1 w-44 shrink-0 bg-[var(--bg-sidebar)] p-3">
          <div className="flex items-center gap-2 px-1.5 pb-3">
            <span className="w-5 h-5 rounded bg-white flex items-center justify-center"><img src={logoImg} alt="" className="w-3.5 h-3.5" /></span>
            <span className="text-[12px] font-semibold text-white">Pristine</span>
          </div>
          {['Projects', 'Intelligence', 'Library', 'Playground'].map((item, i) => (
            <div key={item} className={`h-7 px-2 rounded-md flex items-center text-[11px] ${i === 0 ? 'bg-white/[0.08] text-white' : 'text-white/45'}`}>
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0 bg-olive-50/60 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-semibold text-olive-950">Website relaunch</div>
              <div className="text-[11px] text-olive-500">4 tasks scheduled today</div>
            </div>
            <span className="h-7 px-2.5 rounded-md bg-brand-700 text-white text-[11px] font-medium flex items-center">New task</span>
          </div>
          <div className="grid grid-cols-3 rounded-lg border border-olive-200 bg-white divide-x divide-olive-100 mb-3">
            {[['0', 'SLA breaches'], ['100%', 'On time'], ['6h', 'Avg. resolve']].map(([v, l]) => (
              <div key={l} className="px-3 py-2">
                <div className="text-[13px] font-semibold text-olive-950">{v}</div>
                <div className="text-[10px] text-olive-500">{l}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-olive-200 bg-white divide-y divide-olive-100">
            {rows.map((r) => (
              <div key={r.t} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-3 h-3 rounded border border-olive-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className={`text-[12px] truncate ${r.s === 'Done' ? 'text-olive-400 line-through' : 'text-olive-900'}`}>{r.t}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 h-4 px-1.5 rounded border border-olive-200 text-[9px] text-olive-600">
                      <span className={`w-1.5 h-1.5 rounded-full ${r.d}`} />
                      {r.s}
                    </span>
                    <span className="inline-flex items-end gap-[1.5px] h-2.5">
                      {[1, 2, 3].map((b) => (
                        <span key={b} className={`w-[2px] ${b <= r.p ? 'bg-orange-500' : 'bg-olive-200'}`} style={{ height: `${b * 3}px` }} />
                      ))}
                    </span>
                  </div>
                </div>
                <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-800 text-[8px] font-semibold flex items-center justify-center">{r.who}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Priority simulator
  const [basePriority, setBasePriority] = useState<Level>('MEDIUM');
  const [slaUrgency, setSlaUrgency] = useState<Urgency>('NORMAL');
  const [downstreamTasks, setDownstreamTasks] = useState(3);
  const [impact, setImpact] = useState<Impact>('MEDIUM');

  const breakdown = [
    { label: 'Base severity', points: BASE_POINTS[basePriority] },
    { label: 'SLA pressure', points: URGENCY_POINTS[slaUrgency] },
    { label: `Blocking ${downstreamTasks} ${downstreamTasks === 1 ? 'task' : 'tasks'}`, points: downstreamTasks * 15 },
    { label: 'Impact', points: IMPACT_POINTS[impact] },
  ];
  const score = Math.min(breakdown.reduce((sum, b) => sum + b.points, 0), 200);
  const level = score < 40 ? 'Low' : score < 90 ? 'Medium' : score < 140 ? 'High' : 'Critical';
  const levelTone = score < 40 ? 'text-brand-300' : score < 90 ? 'text-amber-300' : score < 140 ? 'text-orange-300' : 'text-red-300';
  const barTone = score < 40 ? 'bg-brand-400' : score < 90 ? 'bg-amber-400' : score < 140 ? 'bg-orange-400' : 'bg-red-400';

  // Semantic search demo
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const runQuery = (query: string) => {
    setActiveQuery(query);
    setSearching(true);
    window.setTimeout(() => setSearching(false), 420);
  };
  const results = searchPresets.find((p) => p.query === activeQuery)?.results ?? [];

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const primaryCta = user ? { label: 'Open dashboard', to: '/dashboard' } : { label: 'Get started free', to: '/register' };

  return (
    <div className="min-h-screen bg-olive-50 text-olive-900">
      {/* Nav */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-colors duration-200 ${
          isScrolled ? 'bg-olive-50/85 backdrop-blur border-b border-olive-200/80' : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoImg} alt="" className="w-7 h-7 object-contain" />
            <span className="text-[16px] font-semibold tracking-tight text-olive-950">Pristine</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[13px] text-olive-600">
            <a href="#features" className="hover:text-olive-950 transition-colors">Product</a>
            <a href="#how" className="hover:text-olive-950 transition-colors">How it works</a>
            <a href="#planner" className="hover:text-olive-950 transition-colors">AI</a>
            <a href="#developers" className="hover:text-olive-950 transition-colors">Developers</a>
            <a href="#use-cases" className="hover:text-olive-950 transition-colors">Use cases</a>
            <a href="#faq" className="hover:text-olive-950 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <button onClick={() => navigate('/dashboard')} className="btn btn-sm btn-primary" type="button">
                Open dashboard <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="btn btn-sm btn-ghost" type="button">Sign in</button>
                <button onClick={() => navigate('/register')} className="btn btn-sm btn-primary" type="button">Get started</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 paper-grain [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto text-center">
          <a href="#intelligence" className="inline-flex items-center gap-2 h-7 pl-1 pr-3 rounded-full bg-white ring-1 ring-olive-200 text-xs text-olive-600 hover:ring-olive-300 transition-colors">
            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-brand-50 text-brand-800 font-medium">
              <Sparkles size={11} /> New
            </span>
            AI planning and semantic search
            <ArrowRight size={12} />
          </a>
          <h1 className="display-serif text-[clamp(44px,7vw,84px)] text-olive-950 mt-6 mb-0 text-balance max-w-4xl mx-auto">
            Work that stays organized, even when <em className="text-brand-700">everything</em> is urgent.
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-olive-600 max-w-2xl mx-auto text-pretty">
            Pristine brings projects, SLAs and priorities into one calm workspace — so your team always knows what to do next, and can prove what was done.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => navigate(primaryCta.to)} className="btn btn-primary btn-lg" type="button">
              {primaryCta.label} <ArrowRight size={16} />
            </button>
            <a href="#priority" className="btn btn-secondary btn-lg">See how priority works</a>
          </div>
          <p className="mt-4 text-xs text-olive-500">Free to start · No credit card required</p>

          <div className="relative mt-16 max-w-5xl mx-auto">
            <div className="absolute -inset-x-10 -bottom-10 top-10 bg-brand-200/30 blur-3xl rounded-full" aria-hidden="true" />
            <div className="relative">
              <ProductPreview />
            </div>
          </div>
        </div>
      </section>

      <div className="pb-4">
        <TeamsStrip />
      </div>
      <FactBand />

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white border-y border-olive-200/70 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <p className="section-label m-0 text-brand-700">Product</p>
            <h2 className="display-serif text-[44px] text-olive-950 mt-3 mb-0">Everything a busy team needs. Nothing it doesn’t.</h2>
          </div>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 flex items-center justify-center">
                  <Icon size={17} strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 mb-0 text-[15px] font-semibold text-olive-950">{title}</h3>
                <p className="mt-1.5 mb-0 text-sm leading-relaxed text-olive-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />
      <DeepDives />

      {/* Priority simulator */}
      <section id="priority" className="py-24 px-6 scroll-mt-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
          <div>
            <p className="section-label m-0 text-brand-700">Priority engine</p>
            <h2 className="display-serif text-[44px] text-olive-950 mt-3 mb-0">Priorities that explain themselves.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-olive-600 max-w-md">
              No more arguing about what’s most important. Adjust the inputs and watch the score change — the same model Pristine runs on every task.
            </p>

            <div className="mt-8 grid gap-5 max-w-md">
              <Segmented
                label="Base severity"
                value={basePriority}
                onChange={setBasePriority}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' },
                ]}
              />
              <Segmented
                label="SLA status"
                value={slaUrgency}
                onChange={setSlaUrgency}
                options={[
                  { value: 'NORMAL', label: 'On track' },
                  { value: 'NEAR_BREACH', label: 'Due soon' },
                  { value: 'BREACHED', label: 'Breached' },
                ]}
              />
              <Segmented
                label="Impact"
                value={impact}
                onChange={setImpact}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                ]}
              />
              <div>
                <label htmlFor="downstream" className="flex items-center justify-between text-[13px] font-medium text-olive-700 mb-2">
                  <span>Tasks waiting on this one</span>
                  <span className="tabular-nums text-olive-950">{downstreamTasks}</span>
                </label>
                <input
                  id="downstream"
                  type="range"
                  min={0}
                  max={8}
                  value={downstreamTasks}
                  onChange={(e) => setDownstreamTasks(Number(e.target.value))}
                  className="w-full accent-brand-600"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-brand-950 text-white p-8 shadow-xl ring-1 ring-black/10">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-white/50">Priority score</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="display-serif text-[72px] leading-none tabular-nums">{score}</span>
                  <span className="text-white/40 text-sm">/ 200</span>
                </div>
              </div>
              <span className={`text-lg font-medium ${levelTone}`}>{level}</span>
            </div>
            <div className="mt-6 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${barTone}`} style={{ width: `${(score / 200) * 100}%` }} />
            </div>
            <dl className="mt-8 m-0 divide-y divide-white/10 text-sm">
              {breakdown.map((b) => (
                <div key={b.label} className="flex items-center justify-between py-2.5">
                  <dt className="text-white/60">{b.label}</dt>
                  <dd className="m-0 tabular-nums text-white/90">+{b.points}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 mb-0 text-xs text-white/40">Scores above 140 are flagged as critical and float to the top of everyone’s list.</p>
          </div>
        </div>
      </section>

      {/* Semantic search */}
      <section id="intelligence" className="py-24 px-6 bg-white border-y border-olive-200/70 scroll-mt-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
          <div className="order-2 lg:order-1 card p-2">
            <div className="flex items-center gap-2 px-3 h-11 border-b border-olive-100">
              <Search size={15} className="text-olive-400" />
              <span className={`text-sm ${activeQuery ? 'text-olive-900' : 'text-olive-400'}`}>{activeQuery ?? 'Search by meaning…'}</span>
            </div>
            <div className="min-h-[188px] p-2">
              {!activeQuery ? (
                <div className="h-[172px] flex items-center justify-center text-[13px] text-olive-400">Pick a query to try it out</div>
              ) : searching ? (
                <div className="grid gap-2 p-1">
                  {[0, 1, 2].map((i) => <div key={i} className="skeleton h-9" />)}
                </div>
              ) : (
                <ul className="m-0 p-0 list-none">
                  {results.map((r) => (
                    <li key={r.title} className="flex items-center gap-3 px-2 py-2.5 rounded-md hover:bg-olive-50 animate-in">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                      <span className="flex-1 text-[13px] text-olive-800">{r.title}</span>
                      <span className="text-xs tabular-nums text-olive-500">{Math.round(r.score * 100)}% match</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="section-label m-0 text-brand-700">Intelligence</p>
            <h2 className="display-serif text-[44px] text-olive-950 mt-3 mb-0">Find the work you meant, not the words you typed.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-olive-600 max-w-md">
              Semantic search understands what tasks are about, so related work surfaces even when nobody used the same phrasing.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {searchPresets.map((p) => (
                <button
                  key={p.query}
                  onClick={() => runQuery(p.query)}
                  className={`h-8 px-3 rounded-full text-[13px] border transition-colors ${
                    activeQuery === p.query ? 'bg-brand-50 border-brand-200 text-brand-900' : 'bg-white border-olive-200 text-olive-700 hover:border-olive-300'
                  }`}
                  type="button"
                >
                  “{p.query}”
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PlannerShowcase />
      <PromptShowcase />
      <DevelopersSection />

      {/* Audit trail */}
      <section id="trust" className="py-24 px-6 scroll-mt-16">
        <div className="max-w-6xl mx-auto rounded-3xl bg-brand-950 text-white px-8 py-14 sm:px-14 overflow-hidden relative">
          <div className="relative grid lg:grid-cols-2 gap-12 items-center">
          <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden="true" />
          <div className="relative">
            <p className="section-label m-0 text-brand-300">Audit trail</p>
            <h2 className="display-serif text-[44px] text-white mt-3 mb-0">A history you can actually trust.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/60 max-w-md">
              Every change is recorded in a hash-chained log. Verify integrity in one click, set retention periods, and place records on legal hold when you need to.
            </p>
            <ul className="mt-6 m-0 p-0 list-none grid gap-2.5 text-sm text-white/80">
              {['SHA-256 chained activity entries', 'One-click integrity verification', 'Retention policies and legal hold'].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Check size={15} className="text-brand-300" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative rounded-xl bg-white/[0.04] ring-1 ring-white/10 divide-y divide-white/[0.06] font-mono text-xs">
            {[
              ['#1042', 'Project created', 'a1f9…3c7e'],
              ['#1043', 'Task priority → Critical', '7be2…91d4'],
              ['#1044', 'Approval signed by 2 of 2', 'c04d…aa18'],
              ['#1045', 'Retention set to 7 years', 'e93a…5f02'],
            ].map(([seq, action, hash]) => (
              <div key={seq} className="flex items-center gap-4 px-4 py-3">
                <span className="text-white/35">{seq}</span>
                <span className="flex-1 font-sans text-[13px] text-white/85">{action}</span>
                <span className="text-brand-300/80">{hash}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 px-4 py-3 font-sans text-[13px] text-brand-200">
              <ShieldCheck size={15} /> Chain verified — no gaps or edits found
            </div>
          </div>
          </div>
          <SecurityGrid />
        </div>
      </section>

      <Comparison />
      <UseCases />

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 scroll-mt-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="display-serif text-[44px] text-olive-950 m-0 text-center">Questions, answered.</h2>
          <div className="mt-10 card divide-y divide-olive-100">
            {faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={faq.q}>
                  <button
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                    type="button"
                  >
                    <span className="text-[15px] font-medium text-olive-950">{faq.q}</span>
                    <ChevronDown size={17} className={`shrink-0 text-olive-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <p className="m-0 px-6 pb-5 -mt-1 text-sm leading-relaxed text-olive-600 animate-fadeIn">{faq.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto text-center rounded-3xl bg-white ring-1 ring-olive-200 px-8 py-16">
          <h2 className="display-serif text-[clamp(36px,5vw,56px)] text-olive-950 m-0">Bring calm to your team’s work.</h2>
          <p className="mt-4 text-[15px] text-olive-600">Set up your first project in under two minutes.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => navigate(primaryCta.to)} className="btn btn-primary btn-lg" type="button">
              {primaryCta.label} <ArrowRight size={16} />
            </button>
            {!user && (
              <button onClick={() => navigate('/login')} className="btn btn-secondary btn-lg" type="button">Sign in</button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-olive-200 bg-white px-6 pt-16 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <img src={logoImg} alt="" className="w-7 h-7 object-contain" />
                <span className="text-[16px] font-semibold tracking-tight text-olive-950">Pristine</span>
              </div>
              <p className="mt-4 mb-0 text-sm leading-relaxed text-olive-500 max-w-xs">
                Calm, organized work for teams that ship — with SLAs, priorities and a history you can trust.
              </p>
              <button onClick={() => navigate(primaryCta.to)} className="btn btn-sm btn-primary mt-6" type="button">
                {primaryCta.label} <ArrowRight size={14} />
              </button>
            </div>
            {[
              { title: 'Product', links: [['Features', '#features'], ['How it works', '#how'], ['Priority engine', '#priority'], ['Compare', '#compare']] },
              { title: 'Capabilities', links: [['AI planner', '#planner'], ['Semantic search', '#intelligence'], ['Prompt library', '#prompts'], ['Audit trail', '#trust']] },
              { title: 'Resources', links: [['Developers', '#developers'], ['Use cases', '#use-cases'], ['FAQ', '#faq']] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="m-0 text-[13px] font-semibold text-olive-950">{col.title}</h4>
                <ul className="m-0 mt-4 p-0 list-none grid gap-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="text-sm text-olive-500 hover:text-olive-950 transition-colors">{label}</a>
                    </li>
                  ))}
                  {col.title === 'Resources' && (
                    <li>
                      <Link to="/sdk-docs" className="text-sm text-olive-500 hover:text-olive-950 transition-colors inline-flex items-center gap-1">
                        <Plug size={13} /> SDK documentation
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-14 pt-6 border-t border-olive-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-olive-400">
            <span>© {new Date().getFullYear()} Pristine. All rights reserved.</span>
            <span>Made for teams that care about the details.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
