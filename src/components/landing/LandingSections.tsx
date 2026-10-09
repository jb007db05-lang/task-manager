import type { ReactNode } from 'react';
import {
  ArrowRight,
  Ban,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  Code2,
  FileText,
  GitBranch,
  Headphones,
  History,
  Layers,
  ListChecks,
  MessageCircle,
  Minus,
  PauseCircle,
  Radio,
  Sparkles,
  Target,
  Users,
  Wrench,
  X,
} from 'lucide-react';

/* ---------- Shared bits ---------- */

export function SectionIntro({
  eyebrow,
  title,
  body,
  align = 'left',
  tone = 'light',
}: {
  eyebrow: string;
  title: ReactNode;
  body?: ReactNode;
  align?: 'left' | 'center';
  tone?: 'light' | 'dark';
}): JSX.Element {
  const dark = tone === 'dark';
  return (
    <div className={align === 'center' ? 'max-w-2xl mx-auto text-center' : 'max-w-2xl'}>
      <p className={`section-label m-0 ${dark ? 'text-brand-300' : 'text-brand-700'}`}>{eyebrow}</p>
      <h2 className={`display-serif text-[clamp(34px,4.4vw,48px)] mt-3 mb-0 text-balance ${dark ? 'text-white' : 'text-olive-950'}`}>{title}</h2>
      {body ? <p className={`mt-4 mb-0 text-[15px] leading-relaxed text-pretty ${dark ? 'text-white/60' : 'text-olive-600'}`}>{body}</p> : null}
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }): JSX.Element {
  return (
    <li className="flex items-start gap-2.5 text-sm text-olive-700">
      <span className="mt-0.5 w-4 h-4 rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 flex items-center justify-center shrink-0">
        <Check size={10} strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function MockFrame({ children, className = '' }: { children: ReactNode; className?: string }): JSX.Element {
  return <div className={`rounded-2xl bg-white ring-1 ring-olive-950/10 shadow-xl overflow-hidden ${className}`}>{children}</div>;
}

/* ---------- Who it's for strip ---------- */

export function TeamsStrip(): JSX.Element {
  const teams = [
    { icon: Code2, label: 'Engineering' },
    { icon: Layers, label: 'Product' },
    { icon: Headphones, label: 'Support & operations' },
    { icon: Briefcase, label: 'Agencies' },
    { icon: Wrench, label: 'IT & platform' },
  ];
  return (
    <div className="max-w-6xl mx-auto px-6">
      <p className="text-center text-xs text-olive-500 m-0">Built for teams that run on deadlines</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {teams.map(({ icon: Icon, label }) => (
          <span key={label} className="inline-flex items-center gap-2 text-[15px] font-medium text-olive-500">
            <Icon size={17} strokeWidth={1.75} className="text-olive-400" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Fact band ---------- */

export function FactBand(): JSX.Element {
  const facts = [
    { value: '6', label: 'workflow states', note: 'Backlog through Done, plus Blocked' },
    { value: '2', label: 'SLA timers per task', note: 'First response and resolution' },
    { value: '0–200', label: 'priority scale', note: 'Recalculated as work changes' },
    { value: 'SHA-256', label: 'chained audit log', note: 'Verifiable in one click' },
  ];
  return (
    <section className="px-6 py-16">
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 rounded-2xl bg-white ring-1 ring-olive-200 overflow-hidden">
        {facts.map((f, i) => (
          <div key={f.label} className={`p-6 sm:p-8 ${i > 0 ? 'border-l border-olive-100' : ''} ${i >= 2 ? 'max-lg:border-t' : ''} ${i === 2 ? 'max-lg:border-l-0' : ''}`}>
            <div className="display-serif text-[40px] text-olive-950 leading-none">{f.value}</div>
            <div className="mt-3 text-sm font-medium text-olive-900">{f.label}</div>
            <div className="mt-1 text-[13px] text-olive-500">{f.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */

export function HowItWorks(): JSX.Element {
  const steps = [
    {
      n: '01',
      title: 'Plan the work',
      body: 'Create a project, break it into epics and tasks — or describe the goal and let the AI planner draft it for you.',
      visual: (
        <div className="grid gap-1.5">
          {['Discovery & research', 'Design system', 'Launch checklist'].map((e, i) => (
            <div key={e} className={`flex items-center gap-2 h-8 px-2.5 rounded-md text-[12px] ${i === 1 ? 'bg-brand-50 ring-1 ring-brand-100 text-brand-900' : 'text-olive-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${i === 1 ? 'bg-amber-400' : 'bg-olive-300'}`} />
              {e}
              <span className="ml-auto text-[11px] text-olive-400">{[4, 7, 3][i]} tasks</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      n: '02',
      title: 'Track it as it moves',
      body: 'Every task carries an owner, a status and SLA targets. Priorities rebalance automatically as deadlines approach.',
      visual: (
        <div className="grid gap-2">
          {[
            ['Response due', 'w-[35%]', 'bg-brand-500', '2h left'],
            ['Resolution due', 'w-[72%]', 'bg-amber-400', '9h left'],
          ].map(([l, w, c, t]) => (
            <div key={l}>
              <div className="flex justify-between text-[11px] text-olive-500 mb-1"><span>{l}</span><span>{t}</span></div>
              <div className="h-1.5 rounded-full bg-olive-100 overflow-hidden"><div className={`h-full rounded-full ${w} ${c}`} /></div>
            </div>
          ))}
          <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-orange-600"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Priority raised to High</div>
        </div>
      ),
    },
    {
      n: '03',
      title: 'Prove what happened',
      body: 'Approvals, comments and every change are recorded in a hash-chained history you can verify and retain.',
      visual: (
        <div className="grid gap-1.5 font-mono text-[11px]">
          {['#212  status → Done', '#213  approved by M. Shah', '#214  retention: 7 years'].map((r) => (
            <div key={r} className="flex items-center gap-2 h-7 px-2.5 rounded-md bg-olive-50 text-olive-600">
              <CheckCircle2 size={12} className="text-brand-600 shrink-0" />
              {r}
            </div>
          ))}
        </div>
      ),
    },
  ];
  return (
    <section id="how" className="py-24 px-6 scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <SectionIntro
          align="center"
          eyebrow="How it works"
          title="From idea to done, without the chaos in between."
          body="Pristine follows the natural life of a piece of work — and quietly handles the bookkeeping at every step."
        />
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {steps.map((s) => (
            <div key={s.n} className="card p-6 flex flex-col">
              <span className="font-mono text-xs text-brand-700">{s.n}</span>
              <h3 className="mt-2 mb-0 text-lg font-semibold text-olive-950">{s.title}</h3>
              <p className="mt-2 mb-6 text-sm leading-relaxed text-olive-600">{s.body}</p>
              <div className="mt-auto rounded-xl border border-olive-200 bg-white p-3">{s.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Deep dives ---------- */

function DeepDive({
  eyebrow,
  title,
  body,
  bullets,
  visual,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: ReactNode;
  reverse?: boolean;
}): JSX.Element {
  return (
    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <div className={reverse ? 'lg:order-2' : ''}>
        <SectionIntro eyebrow={eyebrow} title={title} body={body} />
        <ul className="mt-6 m-0 p-0 list-none grid gap-3">
          {bullets.map((b) => <Bullet key={b}>{b}</Bullet>)}
        </ul>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>{visual}</div>
    </div>
  );
}

function BoardMock(): JSX.Element {
  const cols = [
    { name: 'To do', dot: 'bg-olive-400', cards: ['Audit color tokens', 'Write migration guide'] },
    { name: 'In progress', dot: 'bg-amber-400', cards: ['Build input components'] },
    { name: 'Done', dot: 'bg-brand-500', cards: ['Export blog posts', 'Set up redirects'] },
  ];
  return (
    <MockFrame className="p-4 bg-olive-50">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[13px] font-semibold text-olive-950">Website relaunch · Board</span>
        <span className="inline-flex p-0.5 rounded-md bg-olive-100 text-[11px]">
          <span className="px-2 py-0.5 text-olive-500">List</span>
          <span className="px-2 py-0.5 rounded bg-white shadow-xs text-olive-900">Board</span>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {cols.map((c) => (
          <div key={c.name} className="rounded-lg bg-olive-100/70 p-2">
            <div className="flex items-center gap-1.5 px-1 pb-2 text-[11px] font-medium text-olive-700">
              <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
              {c.name}
              <span className="text-olive-400">{c.cards.length}</span>
            </div>
            <div className="grid gap-1.5">
              {c.cards.map((card, i) => (
                <div key={card} className={`rounded-md bg-white border border-olive-200 p-2 ${c.name === 'In progress' ? 'rotate-[-1.5deg] shadow-lg ring-1 ring-brand-200' : ''}`}>
                  <div className={`text-[11px] leading-snug ${c.name === 'Done' ? 'text-olive-400 line-through' : 'text-olive-900'}`}>{card}</div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="inline-flex items-end gap-[1.5px] h-2.5">
                      {[1, 2, 3].map((b) => <span key={b} className={`w-[2px] ${b <= (i % 2 ? 2 : 3) ? 'bg-orange-500' : 'bg-olive-200'}`} style={{ height: `${b * 3}px` }} />)}
                    </span>
                    <span className="w-4 h-4 rounded-full bg-brand-100 text-[7px] font-semibold text-brand-800 flex items-center justify-center">{['AK', 'MS', 'JL'][i % 3]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

function SlaMock(): JSX.Element {
  const rows = [
    { t: 'Customer can’t reset password', s: 'Due soon', badge: 'badge-amber', w: 82, c: 'bg-amber-400' },
    { t: 'Invoice export times out', s: 'On track', badge: 'badge-green', w: 38, c: 'bg-brand-500' },
    { t: 'SSO login loop on Safari', s: 'Paused · blocked', badge: 'badge-slate', w: 55, c: 'bg-olive-300' },
    { t: 'Webhook retries failing', s: 'Breached', badge: 'badge-red', w: 100, c: 'bg-red-500' },
  ];
  return (
    <MockFrame>
      <div className="grid grid-cols-3 border-b border-olive-100 divide-x divide-olive-100">
        {[['1', 'SLA breach'], ['92%', 'Response on time'], ['5.4h', 'Avg. resolve']].map(([v, l]) => (
          <div key={l} className="px-4 py-3">
            <div className="text-[15px] font-semibold text-olive-950">{v}</div>
            <div className="text-[11px] text-olive-500">{l}</div>
          </div>
        ))}
      </div>
      <div className="divide-y divide-olive-100">
        {rows.map((r) => (
          <div key={r.t} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] text-olive-900 truncate">{r.t}</span>
              <span className={`badge ${r.badge} !h-5 !text-[10px] shrink-0`}>
                {r.s.startsWith('Paused') ? <PauseCircle size={10} /> : null}
                {r.s}
              </span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-olive-100 overflow-hidden">
              <div className={`h-full rounded-full ${r.c}`} style={{ width: `${r.w}%` }} />
            </div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

function CollabMock(): JSX.Element {
  return (
    <div className="relative">
      <MockFrame>
        <div className="flex items-center justify-between px-4 h-11 border-b border-olive-100">
          <span className="text-[13px] font-semibold text-olive-950">Website relaunch</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-olive-500"><span className="w-1.5 h-1.5 rounded-full bg-brand-500" />4 members</span>
        </div>
        <div className="p-4 grid gap-3.5">
          {[
            ['AK', 'Aisha K.', 'Pushed the new tokens — can someone review the button states?', 'bg-brand-100 text-brand-800'],
            ['MS', 'Marco S.', 'On it. Requesting approval to bump this to Critical before launch.', 'bg-amber-100 text-amber-800'],
          ].map(([i, n, m, c]) => (
            <div key={n} className="flex gap-2.5">
              <span className={`w-7 h-7 rounded-full text-[10px] font-semibold flex items-center justify-center shrink-0 ${c}`}>{i}</span>
              <div>
                <div className="text-[12px]"><span className="font-semibold text-olive-950">{n}</span> <span className="text-olive-400">10:42</span></div>
                <div className="text-[12px] text-olive-700 leading-relaxed">{m}</div>
              </div>
            </div>
          ))}
          <div className="flex gap-1 pl-9">
            <span className="h-6 px-2 rounded-full border border-brand-200 bg-brand-50 text-[11px] text-brand-800 inline-flex items-center gap-1">👍 2</span>
            <span className="h-6 px-2 rounded-full border border-olive-200 text-[11px] text-olive-600 inline-flex items-center gap-1">🚀 1</span>
          </div>
        </div>
      </MockFrame>
      <div className="absolute -bottom-8 -right-3 sm:-right-8 w-64 rounded-xl bg-white ring-1 ring-olive-950/10 shadow-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-olive-950">Priority change</span>
          <span className="badge badge-amber !h-5 !text-[10px]">Pending</span>
        </div>
        <ol className="m-0 mt-3 p-0 list-none grid gap-1.5 text-[11px]">
          <li className="flex items-center gap-2 text-olive-700"><CheckCircle2 size={13} className="text-brand-600" />Lead engineer</li>
          <li className="flex items-center gap-2 text-olive-500"><span className="w-[13px] h-[13px] rounded-full border-2 border-amber-400" />Product manager</li>
        </ol>
      </div>
    </div>
  );
}

export function DeepDives(): JSX.Element {
  return (
    <section id="product-tour" className="py-24 px-6 bg-white border-y border-olive-200/70 scroll-mt-16">
      <div className="max-w-6xl mx-auto grid gap-28">
        <DeepDive
          eyebrow="Workspace"
          title="One place for every project, epic and task."
          body="Group work into epics, then switch between a focused list and a drag-and-drop board. Filters, bulk assignment and a date navigator keep each day under control."
          bullets={[
            'List and board views with inline status changes',
            'Epics with their own notes, status and progress',
            'Subtasks, work notes and per-task comments',
            'Bulk assign, filter by status or owner, jump to any date',
          ]}
          visual={<BoardMock />}
        />
        <DeepDive
          reverse
          eyebrow="SLA tracking"
          title="Know what’s about to slip — before it does."
          body="Each task tracks a first-response and a resolution target. Pristine warns you as deadlines approach, pauses the clock while work is blocked, and reports compliance across the project."
          bullets={[
            'Response and resolution timers on every task',
            'Automatic pause while blocked or awaiting approval',
            'Breach, on-time and average-resolution metrics',
            'Priority escalates automatically as SLAs tighten',
          ]}
          visual={<SlaMock />}
        />
        <DeepDive
          eyebrow="Collaboration"
          title="Talk about the work right next to the work."
          body="Every project has a real-time chat with threads, reactions and search. Sensitive changes can require ordered sign-off from the right people."
          bullets={[
            'Live project chat with replies, reactions and search',
            'Invite teammates by email with admin or member roles',
            'Ordered approval chains for priority and retention changes',
            'In-app notifications for invitations and messages',
          ]}
          visual={<CollabMock />}
        />
      </div>
    </section>
  );
}

/* ---------- AI planner ---------- */

export function PlannerShowcase(): JSX.Element {
  return (
    <section id="planner" className="py-24 px-6 scroll-mt-16">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <SectionIntro
            eyebrow="AI planner"
            title="Describe the goal. Get a plan you can actually use."
            body="Tell the planner what you’re building in plain language. It drafts actors, modules, epics, tasks, effort and risks — then creates the project for you once you’re happy."
          />
          <ul className="mt-6 m-0 p-0 list-none grid gap-3">
            <Bullet>Works with Gemini, OpenAI or Anthropic models using your own keys</Bullet>
            <Bullet>Saved planning sessions you can revisit and refine</Bullet>
            <Bullet>One click turns a reviewed plan into a real project</Bullet>
          </ul>
        </div>
        <MockFrame>
          <div className="px-5 py-4 border-b border-olive-100 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-brand-50 ring-1 ring-brand-100 text-brand-700 flex items-center justify-center"><Sparkles size={14} /></span>
            <span className="text-[13px] font-semibold text-olive-950">AI planner</span>
          </div>
          <div className="p-5 grid gap-4">
            <div className="rounded-lg bg-olive-50 border border-olive-200 p-3 text-[12px] text-olive-700 leading-relaxed">
              “A booking app where clinics publish availability, patients book and pay, and staff manage cancellations.”
            </div>
            <div className="grid gap-2">
              {[
                ['Patient booking flow', '6 tasks · 2 weeks'],
                ['Clinic availability & calendar', '5 tasks · 1.5 weeks'],
                ['Payments & refunds', '4 tasks · 1 week'],
                ['Staff tools & notifications', '5 tasks · 1 week'],
              ].map(([epic, meta], i) => (
                <div key={epic} className="flex items-center gap-3 rounded-lg border border-olive-200 px-3 py-2.5 animate-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <GitBranch size={14} className="text-brand-600 shrink-0" />
                  <span className="flex-1 text-[12px] font-medium text-olive-900">{epic}</span>
                  <span className="text-[11px] text-olive-500">{meta}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900">
              <span>Risk: payment provider review can take 5–7 days</span>
            </div>
            <div className="flex justify-end">
              <span className="btn btn-sm btn-primary pointer-events-none">Create project <ArrowRight size={13} /></span>
            </div>
          </div>
        </MockFrame>
      </div>
    </section>
  );
}

/* ---------- Prompt library ---------- */

export function PromptShowcase(): JSX.Element {
  return (
    <section id="prompts" className="py-24 px-6 bg-white border-y border-olive-200/70 scroll-mt-16">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <MockFrame className="lg:order-1 order-2">
          <div className="grid grid-cols-[150px_1fr] min-h-[300px]">
            <div className="border-r border-olive-100 bg-olive-50 p-3 grid content-start gap-1 text-[12px]">
              <div className="section-label !text-[10px] px-2 pb-1">Folders</div>
              {['Support replies', 'Code review', 'Release notes'].map((f, i) => (
                <div key={f} className={`h-7 px-2 rounded-md flex items-center ${i === 2 ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-100' : 'text-olive-600'}`}>{f}</div>
              ))}
            </div>
            <div className="p-4 grid content-start gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-olive-950">Release note writer</span>
                <span className="font-mono text-[10px] text-olive-500">v4 · 9f2c…a1</span>
              </div>
              <div className="rounded-lg bg-olive-950 p-3 font-mono text-[11px] leading-relaxed text-olive-100">
                <span className="text-brand-300">system</span> You write concise, friendly release notes.{'\n'}
                <br />
                <span className="text-brand-300">user</span> Summarize {'{{'}<span className="text-amber-300">changes</span>{'}}'} for {'{{'}<span className="text-amber-300">audience</span>{'}}'}.
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[['changes', '12 merged PRs'], ['audience', 'customers']].map(([k, v]) => (
                  <div key={k} className="rounded-md border border-olive-200 px-2.5 py-1.5">
                    <div className="font-mono text-[10px] text-olive-500">{k}</div>
                    <div className="text-[11px] text-olive-900">{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-olive-500">
                <History size={12} /> 4 versions · last deployed 2 days ago
              </div>
            </div>
          </div>
        </MockFrame>
        <div className="lg:order-2 order-1">
          <SectionIntro
            eyebrow="Prompt library"
            title="Treat prompts like the product assets they are."
            body="Store reusable prompts with variables, keep every version, compare outputs side by side in the playground, and deploy the one that works."
          />
          <ul className="mt-6 m-0 p-0 list-none grid gap-3">
            <Bullet>Handlebars-style variables detected automatically</Bullet>
            <Bullet>Full version history with content hashes and diff view</Bullet>
            <Bullet>Playground for testing models, parameters and outputs</Bullet>
            <Bullet>Folders, tags, categories and favorites</Bullet>
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- Developers ---------- */

export function DevelopersSection(): JSX.Element {
  const cards = [
    { icon: BookOpen, title: 'Guides', body: 'Walk users through new features with in-app tours.' },
    { icon: Target, title: 'Surveys', body: 'Ask the right question at the right moment.' },
    { icon: ListChecks, title: 'Checklists', body: 'Onboard customers step by step.' },
    { icon: Radio, title: 'Events', body: 'Track product usage and inspect every payload.' },
  ];
  return (
    <section id="developers" className="py-24 px-6 scroll-mt-16">
      <div className="max-w-6xl mx-auto rounded-3xl bg-olive-950 text-white px-8 py-14 sm:px-14 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <SectionIntro
            tone="dark"
            eyebrow="For developers"
            title="Bring engagement into your own product."
            body="Install the Events SDK, connect your site with a sandbox or production key, and ship guides, surveys and checklists — all managed from Pristine."
          />
          <div className="mt-8 grid sm:grid-cols-2 gap-3">
            {cards.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-4">
                <Icon size={16} className="text-brand-300" />
                <div className="mt-2 text-sm font-medium text-white">{title}</div>
                <div className="mt-1 text-[13px] text-white/55 leading-relaxed">{body}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-black/30 ring-1 ring-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-4 h-10 border-b border-white/10 text-xs text-white/50">
            <Code2 size={13} /> app.ts
          </div>
          <pre className="m-0 p-5 font-mono text-[12.5px] leading-6 text-white/80 overflow-x-auto">
{`import { Engagement } from '@jamesbond007db05/events-sdk';

Engagement.init({
  apiKey: 'sdk_test_••••••••',
  user: { id: currentUser.id },
});

// Track what matters
await Engagement.track('signup_completed', {
  plan: 'team',
});`}
          </pre>
          <div className="px-5 py-3 border-t border-white/10 flex items-center gap-2 text-xs text-brand-200">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" /> Sandbox keys work on localhost out of the box
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Comparison ---------- */

export function Comparison(): JSX.Element {
  const rows: Array<[string, boolean | 'partial', boolean | 'partial', boolean | 'partial']> = [
    ['Projects, epics, tasks and subtasks', true, 'partial', true],
    ['List and board views', true, false, true],
    ['Response and resolution SLAs', true, false, 'partial'],
    ['Automatic, explainable priority', true, false, false],
    ['Project chat and approvals', true, false, 'partial'],
    ['Tamper-evident audit history', true, false, false],
    ['AI planning and semantic search', true, false, 'partial'],
    ['Prompt library with versions', true, false, false],
  ];
  const cell = (v: boolean | 'partial') =>
    v === true ? <Check size={16} className="mx-auto text-brand-600" strokeWidth={2.5} /> :
    v === 'partial' ? <Minus size={16} className="mx-auto text-amber-500" strokeWidth={2.5} /> :
    <X size={15} className="mx-auto text-olive-300" strokeWidth={2.5} />;
  return (
    <section id="compare" className="py-24 px-6 bg-white border-y border-olive-200/70 scroll-mt-16">
      <div className="max-w-4xl mx-auto">
        <SectionIntro align="center" eyebrow="Compare" title="More than a to-do list. Less than a mess of tools." />
        <div className="mt-12 card overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-olive-50 border-b border-olive-200">
                <th className="text-left font-medium text-olive-500 text-xs px-5 h-12">Capability</th>
                <th className="font-semibold text-brand-800 text-xs px-3 w-28">Pristine</th>
                <th className="font-medium text-olive-500 text-xs px-3 w-28">Spreadsheets</th>
                <th className="font-medium text-olive-500 text-xs px-3 w-28">Basic task apps</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, a, b, c]) => (
                <tr key={label} className="border-b border-olive-100 last:border-0">
                  <td className="px-5 py-3.5 text-olive-800">{label}</td>
                  <td className="px-3 bg-brand-50/40">{cell(a)}</td>
                  <td className="px-3">{cell(b)}</td>
                  <td className="px-3">{cell(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-center text-xs text-olive-400">
          <Minus size={11} className="inline text-amber-500" strokeWidth={3} /> partial or requires add-ons
        </p>
      </div>
    </section>
  );
}

/* ---------- Use cases ---------- */

export function UseCases(): JSX.Element {
  const cases = [
    {
      icon: Code2,
      title: 'Engineering teams',
      body: 'Plan sprints as epics, keep bugs on an SLA, and let priority reflect what’s actually blocking the release.',
      points: ['Blocked-by dependencies', 'Board view for stand-ups', 'SDK for in-product events'],
    },
    {
      icon: Headphones,
      title: 'Support & operations',
      body: 'Every request gets a response and resolution target, with breaches surfaced before customers notice.',
      points: ['Response and resolution SLAs', 'Auto-escalating priority', 'Audit trail for every change'],
    },
    {
      icon: Users,
      title: 'Agencies & client work',
      body: 'One project per client, a shared chat, and approvals so nothing changes scope without sign-off.',
      points: ['Invite clients as members', 'Ordered approval chains', 'Notes per project and epic'],
    },
  ];
  return (
    <section id="use-cases" className="py-24 px-6 bg-white border-y border-olive-200/70 scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <SectionIntro eyebrow="Use cases" title="Shaped around how real teams work." />
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {cases.map(({ icon: Icon, title, body, points }) => (
            <div key={title} className="card p-6">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 flex items-center justify-center">
                <Icon size={17} strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 mb-0 text-[17px] font-semibold text-olive-950">{title}</h3>
              <p className="mt-2 mb-5 text-sm leading-relaxed text-olive-600">{body}</p>
              <ul className="m-0 p-0 list-none grid gap-2 pt-4 border-t border-olive-100">
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-[13px] text-olive-700">
                    <Check size={13} className="text-brand-600" strokeWidth={2.5} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Security list ---------- */

export function SecurityGrid(): JSX.Element {
  const items = [
    { icon: Ban, title: 'Role-based access', body: 'Admins manage membership and settings; members work on tasks.' },
    { icon: FileText, title: 'Two-factor sign-in', body: 'Email verification codes and companion-device sign-in.' },
    { icon: MessageCircle, title: 'Encrypted provider keys', body: 'AI provider keys are stored encrypted and never shown in full.' },
    { icon: History, title: 'Retention & legal hold', body: 'Keep audit records as long as policy requires — and no less.' },
  ];
  return (
    <div className="relative mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden bg-white/10">
      {items.map(({ icon: Icon, title, body }) => (
        <div key={title} className="bg-brand-950 p-5">
          <Icon size={16} className="text-brand-300" />
          <div className="mt-2.5 text-sm font-medium text-white">{title}</div>
          <div className="mt-1 text-[13px] leading-relaxed text-white/55">{body}</div>
        </div>
      ))}
    </div>
  );
}
