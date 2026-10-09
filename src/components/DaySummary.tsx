import type { ReactNode } from 'react';
import type { TaskSummary } from '@/types/task';

interface DaySummaryProps {
  controls?: ReactNode;
  date: string;
  error?: string | null;
  loading?: boolean;
  summary: TaskSummary | null;
}

const metricColors = [
  'text-olive-600',
  'text-amber-600',
  'text-cyan-600',
  'text-violet-600',
  'text-teal-600',
  'text-rose-600'
];

function DaySummary({ controls = null, date, error = null, loading = false, summary }: DaySummaryProps): JSX.Element {
  const metrics = summary
    ? [
        { label: 'Total',       value: summary.total },
        { label: 'Pending',     value: summary.todo },
        { label: 'In progress', value: summary.inProgress },
        { label: 'In review',   value: summary.inReview },
        { label: 'Completed',   value: summary.done },
        { label: 'Rolled over', value: summary.rolledOver },
      ]
    : [];

  return (
    <div className="grid gap-3.5 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="grid gap-1.5">
          <h2 className="text-xl font-semibold text-olive-950  m-0">Daily summary</h2>
          <p className="text-olive-500  m-0 text-sm">{date}</p>
        </div>
        {controls ? <div className="shrink-0 max-w-full">{controls}</div> : null}
      </div>

      {loading ? <p className="text-olive-400  m-0 text-sm">Refreshing summary for {date}...</p> : null}
      {error ? <p className="text-red-600  m-0 text-sm">{error}</p> : null}

      {/* Metric grid */}
      {summary ? (
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
          {metrics.map(({ label, value }, i) => (
            <article
              key={label}
              className="bg-white/46  border border-olive-200  rounded-lg p-5 transition-all duration-200.5 hover:shadow-md hover:bg-white/68 "
            >
              <span className="text-olive-500  text-[0.9rem] tracking-[0.05em] font-semibold">
                {label}
              </span>
              <strong className={`block text-[2.25rem] font-bold font-sans mt-2 ${metricColors[i]}`}>
                {value}
              </strong>
            </article>
          ))}
        </div>
      ) : !loading && !error ? (
        <p className="bg-olive-50  border border-dashed border-olive-200  rounded-md text-olive-400  p-6 text-center m-0">
          No summary is available until tasks exist for this date.
        </p>
      ) : null}
    </div>
  );
}

export default DaySummary;