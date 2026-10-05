import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, X, ChevronRight, Compass, LayoutDashboard, BrainCircuit, Cable, BookOpen, Settings, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { emitEngagementEvent } from '@/lib/guide-runtime/GuideRuntimeProvider';

export function EngagementFab(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const tours = [
    {
      id: '6a568e52e1cd8bd8164aa601',
      title: 'Welcome & Dashboard',
      description: 'Navigate workspace & manage priorities',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-slate-600" />
    },
    {
      id: '6a568e52e1cd8bd8164aa602',
      title: 'Semantic Intelligence',
      description: 'See how AI auto-prioritizes work',
      path: '/intelligence',
      icon: <BrainCircuit className="w-4 h-4 text-slate-600" />
    },
    {
      id: '6a568e52e1cd8bd8164aa603',
      title: 'SDK Integrations',
      description: 'Connect Zaikara SDK connections',
      path: '/sdk-integrations',
      icon: <Cable className="w-4 h-4 text-slate-600" />
    },
    {
      id: '6a568e52e1cd8bd8164aa604',
      title: 'SDK Documentation',
      description: 'Read setup guides & API schemas',
      path: '/sdk-docs',
      icon: <BookOpen className="w-4 h-4 text-slate-600" />
    },
    {
      id: '6a568e52e1cd8bd8164aa605',
      title: 'Portal Settings',
      description: 'Manage MFA & global AI keys',
      path: '/settings',
      icon: <Settings className="w-4 h-4 text-slate-600" />
    }
  ];

  const handleStartTour = (tourId: string, path: string) => {
    setIsOpen(false);
    if (location.pathname !== path) {
      navigate(path);
      setTimeout(() => {
        emitEngagementEvent('manual_tour', { tourId });
      }, 400);
    } else {
      emitEngagementEvent('manual_tour', { tourId });
    }
  };

  const handleStartSurvey = () => {
    setIsOpen(false);
    const surveyId = 'survey:6a4f8f67d9bd44b5e714b42b';
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
      setTimeout(() => {
        emitEngagementEvent('sync:analytics-event', { eventName: 'survey_triggered', surveyId });
      }, 400);
    } else {
      emitEngagementEvent('sync:analytics-event', { eventName: 'survey_triggered', surveyId });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/15 backdrop-blur-[2px] z-[9998]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="absolute bottom-16 right-0 w-80 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden z-[9999]"
            >
              <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Sparkles className="w-4 h-4 text-slate-200" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm leading-none">Pristine Guide</h3>
                    <p className="text-[11px] text-slate-200/80 mt-1">Manual triggers & tours</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 max-h-[350px] overflow-y-auto">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Page Tours
                </div>
                <div className="space-y-1">
                  {tours.map((tour) => (
                    <button
                      key={tour.id}
                      onClick={() => handleStartTour(tour.id, tour.path)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group"
                    >
                      <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors shrink-0">
                        {tour.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-slate-800 group-hover:text-slate-800 flex items-center gap-1.5">
                          {tour.title}
                          {location.pathname === tour.path && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{tour.description}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
                    </button>
                  ))}
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  User Surveys
                </div>
                <button
                  onClick={handleStartSurvey}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-white transition-colors shrink-0">
                    <Smile className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-slate-800 group-hover:text-slate-800">
                      NPS Pulse Survey
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">Share your feedback about the portal</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 hover:rotate-6 relative group"
        title="View Product Tours"
        id="btn-trigger-guides-manual"
      >
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full animate-pulse" />
        <Compass className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
      </button>
    </div>
  );
}