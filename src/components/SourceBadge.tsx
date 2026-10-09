import { Bot, PenLine } from 'lucide-react';
import type { TaskSource } from '@/types/task';

interface SourceBadgeProps {
  source?: TaskSource;
}

const sourceLabels: Record<string, string> = {
  manual: 'Created manually',
  chatgpt: 'From ChatGPT',
  claude: 'From Claude',
  gemini: 'From Gemini',
  'ai-planning': 'AI planner'
};

function SourceBadge({ source = 'manual' }: SourceBadgeProps): JSX.Element {
  const isManual = source === 'manual';
  return (
    <span className={`badge ${isManual ? 'badge-slate' : 'badge-green'} !h-5 !text-[11px]`}>
      {isManual ? <PenLine size={11} /> : <Bot size={11} />}
      {sourceLabels[source] ?? source}
    </span>
  );
}

export default SourceBadge;
