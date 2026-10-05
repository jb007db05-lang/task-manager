import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  Clock,
  ChevronRight,
  Calculator,
  Users,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Lock,
  ChevronDown,
  ArrowUpRight,
  HelpCircle,
  Terminal,
  CheckCircle2,
  LockKeyhole,
  Search,
  Server
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import logoImg from '@/assets/logo.png';

export default function LandingPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Scroll detection for Dynamic Island Navbar
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Interactive Calculator State
  const [basePriority, setBasePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [slaUrgency, setSlaUrgency] = useState<'NORMAL' | 'NEAR_BREACH' | 'BREACHED'>('NORMAL');
  const [downstreamTasks, setDownstreamTasks] = useState<number>(3);
  const [impact, setImpact] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  // Ledger validation state
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const triggerLedgerScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
    }, 1200);
  };

  // Semantic Search Simulation State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchMatches, setSearchMatches] = useState<Array<{ title: string; score: number; status: string; priority: string }>>([]);

  const presetQueries = [
    { query: "auth latency problems", results: [
      { title: "Optimize Redis Access Token Cache Store", score: 0.94, status: "IN_PROGRESS", priority: "CRITICAL" },
      { title: "Review Axios Interceptor Request Queue Delay", score: 0.88, status: "BACKLOG", priority: "HIGH" },
      { title: "Toggle 2FA Code Delivery Gateway Timeout", score: 0.81, status: "BLOCKED", priority: "HIGH" }
    ]},
    { query: "sla resolution breach warnings", results: [
      { title: "Escalate Legal Hold Deletion Override request", score: 0.96, status: "PENDING_APPROVAL", priority: "CRITICAL" },
      { title: "Audit Downstream Blocked Tasks on Database Layer", score: 0.89, status: "IN_PROGRESS", priority: "HIGH" },
      { title: "Check Task Inspector Calculation Offset logs", score: 0.83, status: "COMPLETED", priority: "MEDIUM" }
    ]},
    { query: "cryptographic verification logs", results: [
      { title: "Verify SHA-256 Ledger Chain Integrity Verification", score: 0.98, status: "COMPLETED", priority: "MEDIUM" },
      { title: "Lock Project Record Retention legal hold logs", score: 0.85, status: "IN_PROGRESS", priority: "HIGH" }
    ]}
  ];

  const handleQueryClick = (queryText: string) => {
    setSearchQuery(queryText);
    setIsSearching(true);
    const matched = presetQueries.find(q => q.query === queryText)?.results ?? [];
    setTimeout(() => {
      setSearchMatches(matched);
      setIsSearching(false);
    }, 450);
  };

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Interactive Calculator Logic matching backend formulas
  const calculateScore = () => {
    let score = 0;
    const baseMap = { LOW: 10, MEDIUM: 30, HIGH: 60, CRITICAL: 90 };
    score += baseMap[basePriority];
    if (slaUrgency === 'NEAR_BREACH') score += 20;
    else if (slaUrgency === 'BREACHED') score += 40;
    score += downstreamTasks * 15;
    const impactMap = { LOW: 5, MEDIUM: 15, HIGH: 30 };
    score += impactMap[impact];
    return Math.min(score, 200);
  };

  const score = calculateScore();
  const getPriorityLabel = (s: number) => {
    if (s < 40) return { label: 'LOW', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', darkColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20', led: 'bg-emerald-500' };
    if (s < 90) return { label: 'MEDIUM', color: 'text-amber-700 bg-amber-50 border-amber-200', darkColor: 'text-amber-400 bg-amber-950/40 border-amber-500/20', led: 'bg-amber-500' };
    if (s < 140) return { label: 'HIGH', color: 'text-orange-700 bg-orange-50 border-orange-200', darkColor: 'text-orange-400 bg-orange-950/40 border-orange-500/20', led: 'bg-orange-500' };
    return { label: 'CRITICAL', color: 'text-rose-700 bg-rose-50 border-rose-200', darkColor: 'text-rose-400 bg-rose-950/40 border-rose-500/20', led: 'bg-rose-500' };
  };

  const priorityResult = getPriorityLabel(score);

  const getExecutionLogs = () => {
    return [
      { prefix: '[GATEWAY]', text: 'Ingested evaluation trigger payload...', color: 'text-sky-400' },
      { prefix: '[ENGINE]', text: `Evaluated base priority: ${basePriority} (${basePriority === 'LOW' ? 10 : basePriority === 'MEDIUM' ? 30 : basePriority === 'HIGH' ? 60 : 90} pts)`, color: 'text-emerald-400' },
      { prefix: '[SLA_MONITOR]', text: `SLA Urgency offset: ${slaUrgency} (${slaUrgency === 'NEAR_BREACH' ? '+20' : slaUrgency === 'BREACHED' ? '+40' : '+0'} pts)`, color: 'text-amber-400' },
      { prefix: '[CASCADE]', text: `Processed ${downstreamTasks} downstream blocked tasks (${downstreamTasks * 15} pts)`, color: 'text-violet-400' },
      { prefix: '[IMPACT]', text: `Analyzed organizational weight: ${impact} (${impact === 'LOW' ? 5 : impact === 'MEDIUM' ? 15 : 30} pts)`, color: 'text-teal-400' },
      { prefix: '[LEDGER]', text: `Dynamic Priority compiled successfully: ${score} / 200`, color: 'text-emerald-300 font-bold' }
    ];
  };

  const faqs = [
    {
      q: "How does the Dynamic Priority Engine compute priority scores?",
      a: "The engine uses a rigorous additive-multiplier model. It takes a Task's Base Priority (10-90 severity points), checks for near/breached SLAs to append latency penalties (+20/40 points), adds downstream dependency block counts (15 points per blocked task), and factors in overall organizational impact (5-30 points) to compile a final capped priority value of 0-200."
    },
    {
      q: "What makes the Activity History cryptographically secure?",
      a: "Every transaction, update, or change logs directly as a sequential node block. The system computes a unique SHA-256 hash using the previous block's hash, current sequence, timestamps, and active user details. Administrators can trigger a complete integrity verification in the frontend toolbar to validate hashes in milliseconds and detect unauthorized changes."
    },
    {
      q: "How are SLAs paused and monitored?",
      a: "The portal monitors response and resolution due times. Whenever a task is marked as blocked or pending external ordered approvals, the SLA timer is safely suspended to preserve operational compliance. The timeline automatically resumes once downstream bottlenecks resolve."
    },
    {
      q: "How does Vector AI Semantic Intelligence function without keyword queries?",
      a: "Our system generates high-dimensional mathematical vector embeddings of tasks and epic notes. When you conceptually search for a task (e.g. 'user credentials latency'), the model performs a cosine similarity analysis to surface contextually related tasks and suggested projects, even if they share zero keyword matches."
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 relative overflow-hidden font-sans selection:bg-emerald-500/10 selection:text-emerald-950">
      
      {/* Modern Floating Capsule Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 18 }}
          className={`pointer-events-auto flex items-center justify-between border rounded-full py-2.5 px-6 transition-all duration-300 ease-in-out w-[92%] md:w-[75%] max-w-5xl ${
            isScrolled
              ? "bg-white/85 border-neutral-200/60 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
              : "bg-white/60 border-neutral-200/30 backdrop-blur-md shadow-none"
          }`}
        >
          {/* Logo & Branding */}
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Pristine Logo" className="w-5 h-5 object-contain" />
            <span className="font-display font-black text-xs tracking-[0.2em] text-neutral-900">PRISTINE</span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#demo" className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors">Simulator</a>
            <a href="#features" className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors">Features</a>
            <a href="#semantic-ai" className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors">Semantic AI</a>
            <a href="#matrix" className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors">Compare</a>
            <a href="#governance" className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors">Governance</a>
            <a href="#faq" className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors">FAQ</a>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="py-1.5 px-4 rounded-full font-bold text-xs bg-neutral-900 text-white hover:bg-neutral-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Launch Portal</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-950 transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="py-1.5 px-4 rounded-full font-bold text-xs bg-neutral-900 text-white hover:bg-neutral-800 transition-all cursor-pointer shadow-sm"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </motion.header>
      </div>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 text-center max-w-7xl mx-auto z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-200/50 border border-neutral-300/40 rounded-full">
            <Sparkles size={11} className="text-emerald-700" />
            <span className="text-[11px] font-bold text-neutral-600 uppercase tracking-widest">Version 1.2 Enterprise Active</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-neutral-900 max-w-4xl mx-auto leading-tight">
            Operational Control for <br />
            <span className="text-emerald-700 font-black">High-Performance Teams</span>
          </h1>

          <p className="text-sm md:text-base text-neutral-500 max-w-2xl mx-auto leading-relaxed font-normal">
            Pristine bridges collaborative task coordination with mathematical priority simulation, microsecond SLA audit tracks, cryptographically chained sequence governance, and vector intelligence suggestions.
          </p>

          {/* Clean Key Metrics Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto pt-6">
            <div className="bg-white border border-neutral-200 p-5 rounded-2xl text-center hover:border-neutral-300 transition-all">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">LEDGER INTEGRITY</span>
              <div className="text-xl font-bold text-emerald-700">100% Secure</div>
            </div>
            <div className="bg-white border border-neutral-200 p-5 rounded-2xl text-center hover:border-neutral-300 transition-all">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">CALCULATION TIMING</span>
              <div className="text-xl font-bold text-neutral-800">&lt; 0.1ms</div>
            </div>
            <div className="bg-white border border-neutral-200 p-5 rounded-2xl text-center hover:border-neutral-300 transition-all">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">MICRO-SLA COMPLIANCE</span>
              <div className="text-xl font-bold text-neutral-800">99.98% Met</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer text-xs"
            >
              Get Started Free <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <a
              href="#demo"
              className="px-6 py-3 bg-white border border-neutral-200 hover:border-neutral-350 text-neutral-700 rounded-xl font-bold transition-all text-xs"
            >
              Open Evaluation Simulator
            </a>
          </div>
        </motion.div>
      </section>

      {/* Simulator Section */}
      <section id="demo" className="py-20 px-6 max-w-6xl mx-auto space-y-10 relative z-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Interactive Engine</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
            See the Priority Engine in Action
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 bg-white border border-neutral-200 p-6 md:p-8 rounded-2xl shadow-sm">
          {/* Left panel: Controls */}
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="bg-neutral-100 border border-neutral-200 text-neutral-700 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1">
                <Calculator className="w-3 h-3 text-emerald-600" /> Evaluation Simulator
              </span>
              <h3 className="text-lg font-bold text-neutral-900">
                Simulate Pipeline Constraints
              </h3>
            </div>

            {/* Base Priority */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> Base Priority
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(p => {
                  const activeStyles = {
                    LOW: basePriority === 'LOW' ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-bold' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300',
                    MEDIUM: basePriority === 'MEDIUM' ? 'bg-amber-50 text-amber-800 border-amber-400 font-bold' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300',
                    HIGH: basePriority === 'HIGH' ? 'bg-orange-50 text-orange-800 border-orange-400 font-bold' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300',
                    CRITICAL: basePriority === 'CRITICAL' ? 'bg-rose-50 text-rose-800 border-rose-400 font-bold' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300',
                  };
                  return (
                    <button
                      key={p}
                      onClick={() => setBasePriority(p)}
                      className={`py-2 text-[11px] font-mono border rounded-lg transition-all cursor-pointer ${activeStyles[p]}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SLA Urgency */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-500" /> SLA Urgency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['NORMAL', 'NEAR_BREACH', 'BREACHED'] as const).map(u => {
                  const activeStyles = {
                    NORMAL: slaUrgency === 'NORMAL' ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-bold' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300',
                    NEAR_BREACH: slaUrgency === 'NEAR_BREACH' ? 'bg-orange-50 text-orange-800 border-orange-400 font-bold' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300',
                    BREACHED: slaUrgency === 'BREACHED' ? 'bg-rose-50 text-rose-800 border-rose-400 font-bold' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300',
                  };
                  return (
                    <button
                      key={u}
                      onClick={() => setSlaUrgency(u)}
                      className={`py-2 text-[11px] font-mono border rounded-lg transition-all cursor-pointer ${activeStyles[u]}`}
                    >
                      {u.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Impact */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                <Users className="w-3 h-3 text-sky-500" /> Impact
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map(i => {
                  const activeStyles = {
                    LOW: impact === 'LOW' ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-bold' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300',
                    MEDIUM: impact === 'MEDIUM' ? 'bg-amber-50 text-amber-800 border-amber-400 font-bold' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300',
                    HIGH: impact === 'HIGH' ? 'bg-orange-50 text-orange-800 border-orange-400 font-bold' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300',
                  };
                  return (
                    <button
                      key={i}
                      onClick={() => setImpact(i)}
                      className={`py-2 text-[11px] font-mono border rounded-lg transition-all cursor-pointer ${activeStyles[i]}`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Downstream Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                <span>Blocked Downstream</span>
                <span className="text-neutral-800 font-bold">{downstreamTasks} Tasks</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={downstreamTasks}
                  onChange={(e) => setDownstreamTasks(parseInt(e.target.value))}
                  className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900 focus:outline-none border-none"
                />
              </div>
            </div>
          </div>

          {/* Right panel: Subtle compiler result block */}
          <div className="flex flex-col justify-between p-6 bg-neutral-900 text-white rounded-xl border border-neutral-800 min-h-[350px]">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-[11px] font-mono text-neutral-500 tracking-wider">CALCULATION_RESULT</span>
                <span className="text-[11px] text-amber-400 font-bold font-mono tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> ENGINE RUNNING
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-mono font-bold text-white flex items-baseline">
                    {score}
                    <span className="text-xs text-neutral-500 ml-1">/ 200</span>
                  </div>
                  <p className="text-[11px] font-mono text-neutral-500">Cumulative priority rating</p>
                </div>

                <div className={`text-[11px] px-2 py-1 border rounded-lg font-mono font-bold uppercase flex items-center gap-1.5 ${priorityResult.darkColor}`}>
                  <span className={`w-1 h-1 rounded-full ${priorityResult.led}`} />
                  {priorityResult.label}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(score / 200) * 100}%` }}
                />
              </div>

              {/* Terminal Logs */}
              <div className="bg-neutral-950 rounded-lg border border-white/5 p-4 font-mono text-[11px] leading-relaxed">
                <div className="flex items-center gap-1 border-b border-white/5 pb-2 mb-2 text-neutral-600 font-mono">
                  <Terminal className="w-3 h-3 text-emerald-500" />
                  <span>CONSOLE_V4.2</span>
                </div>
                <div className="space-y-1 font-mono">
                  {getExecutionLogs().slice(-3).map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-neutral-500">{log.prefix}</span>
                      <span className={log.color}>{log.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Deploy Engine Now <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Bento Grid Section */}
      <section id="features" className="py-20 bg-white border-y border-neutral-200/60 px-6 relative z-10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Platform Features</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
              An Exhaustive Breakdown of Capabilities
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">

            {/* Card 1: Dynamic Priority Engine */}
            <div className="bg-neutral-50/60 border border-neutral-200 p-6 rounded-2xl space-y-4 hover:border-neutral-350 transition-all md:col-span-2">
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl w-fit text-emerald-700">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Dynamic Priority Engine</h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">
                Real-time recalculation of task priority based on an exact mathematical combination of base severity, organization impact weights, SLA urgency offsets, and cascading downstream dependency calculations.
              </p>
            </div>

            {/* Card 2: Micro-SLA Breach Tracking */}
            <div className="bg-neutral-50/60 border border-neutral-200 p-6 rounded-2xl space-y-4 hover:border-neutral-350 transition-all md:col-span-1">
              <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl w-fit text-rose-700">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">SLA Breach Tracking</h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">
                Rigorous timers measuring both First Response due times and Resolution due times. Pauses timer execution when tasks are blocked.
              </p>
            </div>

            {/* Card 3: Cryptographic Activity History */}
            <div className="bg-neutral-50/60 border border-neutral-200 p-6 rounded-2xl space-y-4 hover:border-neutral-350 transition-all md:col-span-1">
              <div className="p-2.5 bg-violet-50 border border-violet-100 rounded-xl w-fit text-violet-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Cryptographic Ledger</h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">
                Compliance validation through SHA-256 block hash chaining. Every project operation receives sequential ID hashes, preventing administrative log manipulation.
              </p>
            </div>

            {/* Card 4: AI Semantic Intelligence */}
            <div className="bg-neutral-50/60 border border-neutral-200 p-6 rounded-2xl space-y-4 hover:border-neutral-350 transition-all md:col-span-2">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl w-fit text-indigo-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Semantic AI Intelligence</h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">
                Leverage vector embeddings to semantically query tasks, discover cross-project task suggestions, and automatically align work notes using semantic similarity algorithms.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Semantic AI Live Interaction Sandbox Section */}
      <section id="semantic-ai" className="py-20 px-6 max-w-6xl mx-auto space-y-10 relative z-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Semantic Sandbox</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Try Conceptual Semantic Matching
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm">
          {/* Preset options */}
          <div className="space-y-3 lg:col-span-1 border-r border-neutral-250/30 pr-6">
            <h4 className="font-bold text-xs text-neutral-900 uppercase tracking-wider mb-2">Select Concept Query</h4>
            <div className="flex flex-col gap-2">
              {presetQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQueryClick(q.query)}
                  className={`p-3 text-left rounded-xl border text-xs font-mono transition-all cursor-pointer flex justify-between items-center ${
                    searchQuery === q.query
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
                  }`}
                >
                  <span>"{q.query}"</span>
                  <Search size={12} className={searchQuery === q.query ? "text-emerald-600" : "text-neutral-400"} />
                </button>
              ))}
            </div>
          </div>

          {/* Results dashboard */}
          <div className="lg:col-span-2 space-y-4 pl-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">Matched Tasks</h4>
              <span className="text-[11px] font-mono text-neutral-400">THRESHOLD: &gt;0.80</span>
            </div>

            {isSearching ? (
              <div className="h-32 flex items-center justify-center space-x-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : searchMatches.length > 0 ? (
              <div className="space-y-2">
                {searchMatches.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 bg-neutral-50/60 border border-neutral-200 rounded-xl">
                    <div className="space-y-1">
                      <span className="text-[8px] font-mono text-neutral-400 uppercase tracking-wider">{m.status}</span>
                      <h5 className="text-xs font-bold text-neutral-900">{m.title}</h5>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-mono text-emerald-800 font-bold bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded">
                        {(m.score * 100).toFixed(0)}% Match
                      </span>
                      <span className="text-[8px] font-mono text-rose-700 bg-rose-50 border border-rose-150 px-2 py-0.5 rounded">
                        {m.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 border border-dashed border-neutral-300 rounded-xl flex flex-col items-center justify-center text-center p-4 text-neutral-400">
                <Search className="w-6 h-6 text-neutral-400 mb-1" />
                <p className="text-xs">No active search query selected.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Comparison Feature Matrix Section */}
      <section id="matrix" className="py-20 px-6 max-w-6xl mx-auto space-y-10 relative z-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Capability Matrix</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Pristine vs Legacy Task Managers
          </h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-neutral-200 shadow-sm bg-white p-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-900 text-white font-mono text-[11px] uppercase tracking-wider">
                <th className="p-4 font-bold rounded-l-xl">Advanced Capabilities</th>
                <th className="p-4 font-bold">Standard Task Tool</th>
                <th className="p-4 font-bold text-emerald-400 bg-neutral-950 rounded-r-xl">Pristine Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-600">
              <tr>
                <td className="p-4 font-bold text-neutral-900">Task Priority Calculations</td>
                <td className="p-4 text-neutral-400">Static Dropdown</td>
                <td className="p-4 text-emerald-800 font-bold bg-emerald-50/5">
                  <span>Dynamic Score Engine (0-200) based on SLA urgency, impact, dependency chain</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-neutral-900">Activity Log Compliance</td>
                <td className="p-4 text-neutral-400">Plain Database Logs</td>
                <td className="p-4 text-emerald-800 font-bold bg-emerald-50/5">
                  <span>Immutable SHA-256 block-hash chaining with on-demand verification</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-neutral-900">SLA Breach Tracking</td>
                <td className="p-4 text-neutral-400">Basic due dates</td>
                <td className="p-4 text-emerald-800 font-bold bg-emerald-50/5">
                  <span>Dual-timer tracking (Response & Resolution due times) + Block pause states</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-neutral-900">AI Intelligence</td>
                <td className="p-4 text-neutral-400">Keyword search</td>
                <td className="p-4 text-emerald-800 font-bold bg-emerald-50/5">
                  <span>Vector similarity queries, cross-project suggestions, semantic note matching</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Governance Section */}
      <section id="governance" className="py-20 bg-neutral-900 text-white relative overflow-hidden z-10">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Compliance First</span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Rigorous Security & Activity Governance
            </h2>
            <p className="text-xs md:text-sm text-white/70 leading-relaxed max-w-lg">
              Every audit track, member sign-off, or project settings change is logged inside a non-repudiable audit chain. With cryptographically sealed logs, administrators can confirm chronological compliance in seconds.
            </p>
          </div>

          {/* Clean Cryptographic Ledger Visualizer */}
          <div className="w-full flex flex-col gap-4 p-6 bg-neutral-950 border border-white/5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400">
                {isScanning ? 'VALIDATING BLOCKCHAIN...' : 'LEDGER INTEGRITY SIGNED'}
              </span>
              <button 
                onClick={triggerLedgerScan}
                disabled={isScanning}
                className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 hover:bg-emerald-500/20 cursor-pointer disabled:opacity-50 transition-all text-xs"
              >
                {isScanning ? <Lock className="w-3.5 h-3.5 animate-spin" /> : <LockKeyhole className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Block 01 - Genesis */}
            <div className="flex items-center justify-between p-4 bg-neutral-900 border border-white/5 rounded-xl">
              <div className="space-y-1">
                <div className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest">Genesis Block #001</div>
                <div className="text-[11px] font-mono text-white">SEQ_NO: 1 | ACTION: CREATE_PROJECT</div>
              </div>
              <div className="text-[11px] font-mono text-neutral-400">
                8a7f...d49e
              </div>
            </div>

            {/* Block 02 */}
            <div className="flex items-center justify-between p-4 bg-neutral-900 border border-white/5 rounded-xl">
              <div className="space-y-1">
                <div className="text-[8px] font-mono text-teal-400 uppercase tracking-widest">Block #002</div>
                <div className="text-[11px] font-mono text-white">SEQ_NO: 2 | ACTION: EVALUATE_PRIORITY</div>
              </div>
              <div className="text-[11px] font-mono text-neutral-400">
                3c9b...81ea
              </div>
            </div>

            {/* Diagnostic complete box */}
            {scanComplete && (
              <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center space-y-3 p-6 text-center border border-emerald-500/30">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Integrity Verification OK</h3>
                <p className="text-[11px] text-neutral-400 max-w-sm">SHA-256 hashes verified. Zero alterations detected in database ledger.</p>
                <button 
                  onClick={() => setScanComplete(false)}
                  className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-400 cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dynamic Visual Operations Flow */}
      <section className="py-20 bg-white border-b border-neutral-200/60 z-10 relative">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Workflow</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Dynamic Operations Flow
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-5 bg-neutral-50/50 border border-neutral-200 rounded-xl space-y-3">
              <div className="p-2 bg-neutral-900 text-emerald-400 rounded-lg w-fit"><Server className="w-4 h-4" /></div>
              <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">1. Action Ingestion</h4>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">Task creation, subtask updates, or note configurations hit the gateway controller via Secure WebSocket streams.</p>
            </div>

            <div className="p-5 bg-neutral-50/50 border border-neutral-200 rounded-xl space-y-3">
              <div className="p-2 bg-neutral-900 text-amber-400 rounded-lg w-fit"><Calculator className="w-4 h-4" /></div>
              <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">2. Priority Optimization</h4>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">The Priority Engine recalculates scores using base parameters, active SLA durations, and cascading downstream blocked dependencies.</p>
            </div>

            <div className="p-5 bg-neutral-50/50 border border-neutral-200 rounded-xl space-y-3">
              <div className="p-2 bg-neutral-900 text-violet-400 rounded-lg w-fit"><ShieldCheck className="w-4 h-4" /></div>
              <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">3. Ledger Verification</h4>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">The activity commits to the chronological database. The system appends a sequential sequence ID and locks the hash pointer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 px-6 max-w-3xl mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">FAQ</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-neutral-900 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                <span className="text-xs md:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-650 flex-shrink-0" />
                  {faq.q}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180' : ''
                  }`} />
              </button>

              <AnimatePresence initial={false}>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-neutral-150"
                  >
                    <p className="p-5 text-xs text-neutral-500 leading-relaxed bg-neutral-50/50 font-normal">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-350 pt-20 pb-10 border-t border-white/5 z-10 relative">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

            {/* Column 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <img src={logoImg} alt="Pristine Logo" className="w-4 h-4 object-contain brightness-0 invert" />
                <span className="font-display font-black text-sm tracking-wider text-white">PRISTINE</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Enterprise task intelligence, micro-SLA timelines, and immutable cryptographic chains.
              </p>
            </div>

            {/* Column 2 */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">Operational Engine</h4>
              <ul className="text-xs text-neutral-400 space-y-1.5 font-normal">
                <li><a href="#features" className="hover:text-white transition-colors">Dynamic Priority Matrix</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Microsecond Resolution SLA</a></li>
              </ul>
            </div>

            {/* Column 3 */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">Security & Ledger</h4>
              <ul className="text-xs text-neutral-400 space-y-1.5 font-normal">
                <li><a href="#features" className="hover:text-white transition-colors">SHA-256 Log Hash Chain</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Legal Retention Holds</a></li>
              </ul>
            </div>

            {/* Column 4 */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400">Resources</h4>
              <ul className="text-xs text-neutral-400 space-y-1.5 font-normal">
                <li><a href="/sdk-docs" className="hover:text-white transition-colors flex items-center gap-1 font-mono">Developer SDK Docs <ArrowUpRight className="w-3 h-3 text-neutral-500" /></a></li>
                <li><a href="#matrix" className="hover:text-white transition-colors">Capability Matrix</a></li>
              </ul>
            </div>

          </div>

          <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-mono text-neutral-500">
            <div>
              &copy; {new Date().getFullYear()} Pristine Inc. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-white transition-colors">Security Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Operations</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
