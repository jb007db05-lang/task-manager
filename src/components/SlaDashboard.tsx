import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, TimerReset } from 'lucide-react';

import { getSlaAnalytics } from '@/services/sla';
import type { SlaAnalyticsSummary } from '@/types/task';

function SlaDashboard(): JSX.Element | null {
  const [summary, setSummary] = useState<SlaAnalyticsSummary | null>(null);

  useEffect(() => {
    let active = true;
    getSlaAnalytics()
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch(() => {
        if (active) setSummary(null);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!summary) return null;

  const items = [
    { label: 'Breached', value: summary.totalBreached, icon: AlertTriangle, tone: 'text-red-600 bg-red-50 border-red-100' },
    { label: 'Response', value: `${summary.responseCompliancePercent}%`, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    { label: 'Resolution', value: `${summary.resolutionCompliancePercent}%`, icon: BarChart3, tone: 'text-olive-700 bg-olive-50 border-olive-200' },
    { label: 'Avg resolve', value: `${summary.averageResolutionTimeHours}h`, icon: TimerReset, tone: 'text-amber-700 bg-amber-50 border-amber-100' }
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className={`rounded-xl border p-3 ${item.tone}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest font-black opacity-70">{item.label}</span>
            <item.icon size={15} />
          </div>
          <strong className="block mt-1 text-lg font-black">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default SlaDashboard;
