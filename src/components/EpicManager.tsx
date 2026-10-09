import { ArrowDown, ArrowUp, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import type { Epic } from '@/types/epic';

interface EpicManagerProps {
  actionEpicId: string | null;
  epics: Epic[];
  onCreateEpic: () => void;
  onDeleteEpic: (epic: Epic) => Promise<void>;
  onEditEpic: (epic: Epic) => void;
  onMoveEpic: (epic: Epic, direction: 'up' | 'down') => Promise<void>;
  projectName: string;
}

const statusPillClasses: Record<string, string> = {
  planned:   'bg-olive-50 text-olive-700 border border-olive-200',
  active:    'bg-amber-50 text-amber-700 border border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived:  'bg-olive-100 text-olive-600 border border-olive-200'
};

const ghostBtn = 'inline-flex items-center gap-1.5 px-3 py-2 text-[0.8rem] font-medium bg-white  border border-olive-200  rounded text-olive-600  hover:bg-olive-50  disabled:opacity-50 transition-colors';
const dangerBtn = 'inline-flex items-center gap-1.5 px-3 py-2 text-[0.8rem] font-medium bg-white  border border-red-200  rounded text-red-600  hover:bg-red-50  disabled:opacity-50 transition-colors';

function EpicManager({
  actionEpicId,
  epics,
  onCreateEpic,
  onDeleteEpic,
  onEditEpic,
  onMoveEpic,
  projectName
}: EpicManagerProps): JSX.Element {
  return (
    <div className="grid gap-[18px]">
      {/* Intro */}
      <div className="flex items-flex-start justify-between gap-4">
        <div>
          <span className="text-olive-600  font-['Space_Grotesk'] text-[0.72rem]">Epic layer</span>
          <h3 className="my-1 text-olive-950 ">{projectName} epics</h3>
          <p className="text-olive-500  m-0 text-sm">Create, reorder, rename, or remove epics without affecting the underlying tasks.</p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-700  text-white rounded text-sm font-medium hover:bg-brand-800  transition-colors shrink-0"
          onClick={onCreateEpic}
          type="button"
        >
          <Plus size={16} /> New epic
        </button>
      </div>

      {epics.length === 0 ? (
        <EmptyState
          description="Create an epic to group related tasks inside this project."
          icon={FolderTree}
          title="No epics yet"
        />
      ) : (
        <div className="grid gap-3.5">
          {epics.map((epic, index) => (
            <div
              key={epic.id}
              className="flex items-stretch bg-gradient-to-b from-white/98 to-olive-50/98   border border-olive-200/60  rounded-lg grid gap-3 grid-cols-[1fr_auto] p-[18px]"
            >
              {/* Copy */}
              <div className="grid gap-1.5">
                <span className="text-olive-600  font-['Space_Grotesk'] text-[0.72rem]">
                  Epic #{index + 1}
                </span>
                <strong className="text-olive-950  text-[1.05rem]">{epic.name}</strong>
                <span className="text-olive-500  text-sm">
                  {epic.description?.trim() ? epic.description : 'No description provided.'}
                </span>
                <span className={`inline-block self-start rounded text-[0.72rem] font-semibold px-2 py-0.5 mt-0.5 ${statusPillClasses[epic.status] ?? statusPillClasses.planned}`}>
                  {epic.status}
                </span>
              </div>

              {/* Actions */}
              <div className="grid gap-2.5 items-center grid-cols-[repeat(auto-fit,minmax(60px,auto))]">
                <button className={ghostBtn} disabled={index === 0 || actionEpicId === epic.id} onClick={() => void onMoveEpic(epic, 'up')} type="button">
                  <ArrowUp size={16} /> Up
                </button>
                <button className={ghostBtn} disabled={index === epics.length - 1 || actionEpicId === epic.id} onClick={() => void onMoveEpic(epic, 'down')} type="button">
                  <ArrowDown size={16} /> Down
                </button>
                <button className={ghostBtn} disabled={actionEpicId === epic.id} onClick={() => onEditEpic(epic)} type="button">
                  <Pencil size={16} /> Edit
                </button>
                <button className={dangerBtn} disabled={actionEpicId === epic.id} onClick={() => void onDeleteEpic(epic)} type="button">
                  <Trash2 size={16} /> {actionEpicId === epic.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EpicManager;