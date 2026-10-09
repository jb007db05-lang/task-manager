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
    { label: 'SLA breaches', value: summary.totalBreached, icon: AlertTriangle, tone: summary.totalBreached > 0 ? 'text-red-600' : 'text-olive-400' },
    { label: 'Response on time', value: `${summary.responseCompliancePercent}%`, icon: CheckCircle2, tone: 'text-brand-600' },
    { label: 'Resolved on time', value: `${summary.resolutionCompliancePercent}%`, icon: BarChart3, tone: 'text-brand-600' },
    { label: 'Avg. time to resolve', value: `${summary.averageResolutionTimeHours}h`, icon: TimerReset, tone: 'text-olive-400' }
  ];

  return (
    <div className="grid grid-cols-2 @2xl:grid-cols-4 rounded-xl border border-olive-200 bg-white overflow-hidden [&>*]:border-olive-100 [&>*:nth-child(n+2)]:border-l @max-2xl:[&>*:nth-child(3)]:border-l-0 @max-2xl:[&>*:nth-child(n+3)]:border-t">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 px-4 py-3">
          <item.icon size={16} strokeWidth={1.75} className={`shrink-0 ${item.tone}`} />
          <div className="min-w-0">
            <div className="text-[17px] font-semibold text-olive-950 leading-tight tabular-nums">{item.value}</div>
            <div className="text-xs text-olive-500 truncate">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SlaDashboard;
