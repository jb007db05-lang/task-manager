import Skeleton from '@/components/Skeleton';

import TaskCard from '@/components/TaskCard';
import type { Epic } from '@/types/epic';
import type { Project } from '@/types/project';
import type { Subtask, Task, TaskWorkflowStatus } from '@/types/task';
import { flattenProjectLabels } from '@/utils/projectTree';

interface TaskListProps {
  actionTaskId?: string | null;
  epics: Epic[];
  onDeleteSubtask?: (task: Task, subtask: Subtask) => void;
  onCreateSubtask?: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  onEditSubtask?: (task: Task, subtask: Subtask) => void;
  onOpenEpicNotes?: (epic: Epic) => void;
  onOpenProjectNotes?: (project: Project) => void;
  onOpenSubtaskNote?: (task: Task, subtask: Subtask) => void;
  onOpenTaskNote?: (task: Task) => void;
  onUpdateEpic?: (task: Task, epicId: string | null) => void;
  onUpdateStatus?: (task: Task, status: TaskWorkflowStatus) => void;
  onUpdateSubtaskStatus?: (task: Task, subtask: Subtask, status: TaskWorkflowStatus) => void;
  projects: Project[];
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
  onCommentTask?: (task: Task) => void;
  onToggleBlocked?: (task: Task) => void;
  selectedTaskId?: string | null;
  selectedTaskIds?: string[];
  onToggleSelection?: (taskId: string) => void;
  loading?: boolean;
}

function TaskList({
  actionTaskId,
  epics,
  onDelete,
  onEditTask,
  onUpdateStatus,
  projects,
  tasks,
  onSelectTask,
  onCommentTask,
  onToggleBlocked,
  selectedTaskId,
  selectedTaskIds = [],
  onToggleSelection,
  loading = false
}: TaskListProps): JSX.Element {
  if (loading) {
    return (
      <div className="card divide-y divide-olive-100 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="flex items-start gap-3 px-4 py-3.5">
            <Skeleton variant="rectangle" className="w-4 h-4 mt-0.5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className={i % 2 ? 'w-1/2' : 'w-2/3'} />
              <div className="flex gap-3">
                <Skeleton variant="rectangle" className="w-20 h-5" />
                <Skeleton variant="rectangle" className="w-14 h-5" />
              </div>
            </div>
            <Skeleton variant="circle" className="w-6 h-6" />
          </div>
        ))}
      </div>
    );
  }

  const projectNames = new Map(flattenProjectLabels(projects).map((project) => [project.id, project.label]));
  const epicsByProject = new Map<string, Epic[]>();
  const epicById = new Map(epics.map((epic) => [epic.id, epic]));

  epics.forEach((epic) => {
    const current = epicsByProject.get(epic.projectId) ?? [];
    current.push(epic);
    epicsByProject.set(epic.projectId, current);
  });

  const orderedProjectEpics = new Map(
    Array.from(epicsByProject.entries()).map(([projectId, projectEpics]) => [
      projectId,
      [...projectEpics].sort((left, right) => left.order - right.order)
    ])
  );

  const projectSections = (() => {
    const tasksByProject = new Map<string | null, Task[]>();

    tasks.forEach((task) => {
      const key = task.projectId ?? null;
      const current = tasksByProject.get(key) ?? [];
      current.push(task);
      tasksByProject.set(key, current);
    });

    const sections: Array<{
      id: string;
      project: Project | null;
      title: string;
      description: string;
      tasks: Task[];
    }> = [];

    projects.forEach((project) => {
      const projectTasks = tasksByProject.get(project.id) ?? [];

      if (projectTasks.length > 0) {
        sections.push({
          id: project.id,
          project,
          title: project.name,
          description: 'Project execution lane for the selected date.',
          tasks: projectTasks
        });
      }
    });

    const noProjectTasks = tasksByProject.get(null) ?? [];

    if (noProjectTasks.length > 0) {
      sections.push({
        id: 'no-project',
        project: null,
        title: 'No Project',
        description: 'Tasks that are not assigned to a project.',
        tasks: noProjectTasks
      });
    }

    return sections;
  })();

  if (tasks.length === 0) {
    return <></>;
  }

  const renderTask = (task: Task, showEpic: boolean) => (
    <TaskCard
      actionTaskId={actionTaskId}
      epicName={showEpic && task.epicId ? epicById.get(task.epicId)?.name : undefined}
      key={task.id}
      onDelete={onDelete}
      onEditTask={onEditTask}
      onUpdateStatus={onUpdateStatus}
      projectName={showEpic && task.projectId ? projectNames.get(task.projectId) : undefined}
      task={task}
      onSelect={onSelectTask}
      onComment={onCommentTask}
      onToggleBlocked={onToggleBlocked}
      isSelected={selectedTaskId === task.id}
      isMultiSelected={selectedTaskIds.includes(task.id)}
      onToggleSelection={onToggleSelection}
    />
  );

  return (
    <div className="grid gap-5">
      {projectSections.length > 0 ? (
        projectSections.flatMap((section) => {
          const tasksByEpicId = new Map<string | null, Task[]>();

          section.tasks.forEach((task) => {
            const key = task.epicId ?? null;
            const current = tasksByEpicId.get(key) ?? [];
            current.push(task);
            tasksByEpicId.set(key, current);
          });

          const sectionEpics =
            section.project == null
              ? []
              : (orderedProjectEpics.get(section.project.id) ?? [])
                .filter((epic) => tasksByEpicId.has(epic.id))
                .map((epic) => ({ id: epic.id, title: epic.name, tasks: tasksByEpicId.get(epic.id) ?? [] }));

          const noEpicTasks = tasksByEpicId.get(null) ?? [];
          const groups = [
            ...sectionEpics,
            ...(noEpicTasks.length > 0 ? [{ id: `${section.id}-no-epic`, title: 'No epic', tasks: noEpicTasks }] : [])
          ];
          const showHeaders = groups.length > 1 || projectSections.length > 1;

          return groups.map((group) => (
            <section key={group.id}>
              {showHeaders && (
                <h4 className="flex items-center gap-2 m-0 mb-2 px-1 text-xs font-medium text-olive-500">
                  {projectSections.length > 1 && <span className="text-olive-400">{section.title} /</span>}
                  <span className="text-olive-800">{group.title}</span>
                  <span className="text-olive-400 tabular-nums">{group.tasks.length}</span>
                </h4>
              )}
              <div className="card overflow-hidden divide-y divide-olive-100">
                {group.tasks.map((task) => renderTask(task, false))}
              </div>
            </section>
          ));
        })
      ) : (
        <div className="card overflow-hidden divide-y divide-olive-100">
          {tasks.map((task) => renderTask(task, true))}
        </div>
      )}
    </div>
  );
}

export default TaskList;