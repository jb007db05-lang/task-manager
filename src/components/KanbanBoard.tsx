import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { type Task, type TaskWorkflowStatus, TASK_WORKFLOW_STATUS_OPTIONS } from '@/types/task';
import TaskCard from './TaskCard';
import Skeleton from './Skeleton';
import { statusMeta } from '@/utils/taskMeta';

interface KanbanBoardProps {
  tasks: Task[];
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
  onUpdateStatus,
  onSelectTask,
  onDeleteTask,
  onEditTask,
  onCommentTask,
  onToggleBlocked,
  loading = false
}: KanbanBoardProps): JSX.Element {

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
    <div className="h-full overflow-x-auto px-6 pb-6 custom-scrollbar">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 h-full min-h-[480px]">
          {COLUMNS.map((status) => {
            const columnTasks = getTasksByStatus(status);
            const label = TASK_WORKFLOW_STATUS_OPTIONS.find(opt => opt.value === status)?.label || status;

            return (
              <div key={status} className="flex-shrink-0 w-[280px] flex flex-col rounded-xl bg-olive-100/60">
                <div className="flex items-center gap-2 px-3 h-10 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${statusMeta(status).dot}`} />
                  <h3 className="text-[13px] font-medium text-olive-800 m-0">{label}</h3>
                  <span className="text-xs text-olive-400 tabular-nums">{columnTasks.length}</span>
                </div>

                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 px-2 pb-2 flex flex-col gap-2 overflow-y-auto rounded-b-xl transition-colors duration-150 ${snapshot.isDraggingOver ? 'bg-brand-50/70' : ''}`}
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
                                  className={`rounded-lg border border-olive-200 bg-white overflow-hidden ${snapshot.isDragging ? 'shadow-xl ring-1 ring-brand-200 rotate-[1deg]' : 'shadow-xs hover:border-olive-300'}`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                  }}
                                >
                                  <TaskCard
                                    task={task}
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
                        <div className="flex-1 min-h-[72px] rounded-lg border border-dashed border-olive-300/70 flex items-center justify-center text-xs text-olive-400">
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
