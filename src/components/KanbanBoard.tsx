import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { type Task, type TaskWorkflowStatus, TASK_WORKFLOW_STATUS_OPTIONS } from '@/types/task';
import type { Epic } from '@/types/epic';
import type { Project } from '@/types/project';
import TaskCard from './TaskCard';
import Skeleton from './Skeleton';
import { statusMeta } from '@/utils/taskMeta';
import { flattenProjectLabels } from '@/utils/projectTree';

interface KanbanBoardProps {
  tasks: Task[];
  epics?: Epic[];
  projects?: Project[];
  onUpdateStatus: (taskId: string, status: TaskWorkflowStatus) => Promise<void>;
  onSelectTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onCommentTask?: (task: Task) => void;
  onToggleBlocked?: (task: Task) => void;
  loading?: boolean;
}

const COLUMNS: TaskWorkflowStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'];

function KanbanBoard({
  tasks,
  epics = [],
  projects = [],
  onUpdateStatus,
  onSelectTask,
  onDeleteTask,
  onEditTask,
  onCommentTask,
  onToggleBlocked,
  loading = false
}: KanbanBoardProps): JSX.Element {
  const projectNames = new Map(flattenProjectLabels(projects).map((project) => [project.id, project.label]));
  const epicById = new Map(epics.map((epic) => [epic.id, epic]));

  const getTasksByStatus = (status: TaskWorkflowStatus) => {
    return tasks.filter((task) => task.status === status)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };


  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as TaskWorkflowStatus;
    // For now, we only handle status changes. Order within column would need more backend support.
    await onUpdateStatus(draggableId, newStatus);
  };

  return (
    <div className="h-full w-full min-h-0 flex flex-col overflow-x-auto px-6 pb-6 custom-scrollbar">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3.5 flex-1 min-h-0 h-full">
          {COLUMNS.map((status) => {
            const columnTasks = getTasksByStatus(status);
            const label = TASK_WORKFLOW_STATUS_OPTIONS.find(opt => opt.value === status)?.label || status;

            return (
              <div key={status} className="shrink-0 w-[320px] flex flex-col h-full min-h-0 rounded-xl bg-olive-100/50 border border-olive-200/70 shadow-xs overflow-hidden">
                <div className="flex items-center gap-2 px-3.5 h-11 shrink-0 border-b border-olive-200/60 bg-white/70 backdrop-blur-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusMeta(status).dot}`} />
                  <h3 className="text-[13px] font-semibold text-olive-900 m-0 tracking-tight">{label}</h3>
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-olive-200/80 text-olive-800 tabular-nums">
                    {columnTasks.length}
                  </span>
                </div>

                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 min-h-0 p-2.5 flex flex-col gap-2.5 overflow-y-auto transition-colors duration-150 custom-scrollbar ${snapshot.isDraggingOver ? 'bg-brand-50/60 ring-2 ring-inset ring-brand-200' : ''}`}
                    >
                      {loading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <div key={`skeleton-${status}-${i}`} className="p-3 bg-white rounded-lg border border-olive-200 space-y-2.5">
                            <Skeleton variant="text" className="w-3/4" />
                            <Skeleton variant="text" className="w-1/2" />
                          </div>
                        ))
                      ) : (
                        columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => {
                              const content = (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`shrink-0 rounded-lg border border-olive-200/80 bg-white ${snapshot.isDragging ? 'shadow-xl ring-2 ring-brand-400 rotate-[1deg] z-50' : 'shadow-xs hover:border-olive-300 hover:shadow-sm'}`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                  }}
                                >
                                  <TaskCard
                                    task={task}
                                    epicName={task.epicId ? epicById.get(task.epicId)?.name : undefined}
                                    projectName={task.projectId ? projectNames.get(task.projectId) : undefined}
                                    onDelete={onDeleteTask}
                                    onEditTask={onEditTask}
                                    onSelect={onSelectTask}
                                    onComment={onCommentTask}
                                    onToggleBlocked={onToggleBlocked}
                                  />
                                </div>
                              );

                              return snapshot.isDragging ? createPortal(content, document.body) : content;
                            }}
                          </Draggable>
                        ))
                      )}

                      {provided.placeholder}

                      {!loading && columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="shrink-0 min-h-[80px] rounded-lg border border-dashed border-olive-300/70 flex items-center justify-center text-xs text-olive-400">
                          Drop tasks here
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

export default KanbanBoard;
