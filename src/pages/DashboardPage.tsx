import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

import api from '@/services/api';
import AddTaskForm from '@/components/AddTaskForm';
import EditTaskForm from '@/components/EditTaskForm';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import EpicForm from '@/components/EpicForm';
import SubtaskInlineEdit from '@/components/SubtaskInlineEdit';
import NoteModal from '@/components/NoteModal';
import ProjectForm from '@/components/ProjectForm';
import ProjectNotes from '@/components/ProjectNotes';
import ProjectPanel from '@/components/ProjectPanel';
import ProjectTeamPanel from '@/components/ProjectTeamPanel';
import SettingsPanel from '@/components/SettingsPanel';
import SubtaskForm from '@/components/SubtaskForm';
import ChatPanel from '@/components/ChatPanel';
import ActivityHistoryPanel from '@/components/ActivityHistoryPanel';
import ApprovalSection from '@/components/ApprovalSection';
import { AiProjectPlanModal } from '@/components/AiProjectPlanModal';
import { getProjectAiConfig } from '@/services/aiPlanning';
import SdkDocsPanel from '@/components/SdkDocsPanel';
import EventTrackingPage from '@/pages/EventTrackingPage';
import InsightsPage from '@/pages/InsightsPage';
import RequirePermission from '@/components/RequirePermission';
import WorkspaceSettings from '@/components/workspace/WorkspaceSettings';
import ProjectTimePanel from '@/components/project/ProjectTimePanel';
import ProjectPromptsPanel from '@/components/project/ProjectPromptsPanel';
import { useWorkspace } from '@/context/WorkspaceContext';
import EngagementPage from '@/pages/EngagementPage';
import SdkIntegrationsPage from '@/pages/SdkIntegrationsPage';
import SdkIntegrationDetailPage from '@/pages/SdkIntegrationDetailPage';
import PromptLibraryPage from '@/pages/PromptLibraryPage';
import PromptPlaygroundPage from '@/pages/PromptPlaygroundPage';
import { getIntegration } from '@/lib/sdk-integrations/api';
import Sidebar, { SidebarView } from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { useChat } from '@/context/ChatContext';
import { Notification } from '@/components/NotificationBox';
import TaskList from '@/components/TaskList';
import KanbanBoard from '@/components/KanbanBoard';
import CommentSection from '@/components/CommentSection';
import TaskFilterBar, { TaskFilters } from '@/components/TaskFilterBar';
import SourceBadge from '@/components/SourceBadge';
import UserAvatar from '@/components/UserAvatar';
import AssigneeSelector from '@/components/AssigneeSelector';
import SlaDashboard from '@/components/SlaDashboard';
import SlaIndicator from '@/components/SlaIndicator';
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  Edit3,
  FileText,
  Clock,
  Folder,
  Layout,
  List,
  MessageCircle,
  MessageSquare,
  NotebookPen,
  AlertCircle,
  Plus,
  Users,
  Trash2,
  History,
  RefreshCw,
  X,
  Calculator,
  Zap,
  Bot,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import Menu from '@/components/Menu';
import { statusMeta } from '@/utils/taskMeta';
import PageHeader from '@/components/PageHeader';
import { recalculateDynamicPriorities, evaluateTaskPriority, type PriorityEvaluation } from '@/services/priorityEngine';
import { createEpic, deleteEpic, getEpics, updateEpic } from '@/services/epics';
import { createEpicNote, createNote, deleteNote, getEpicNotes, getNote, getProjectNotes, updateNote } from '@/services/notes';
import {
  createProject,
  deleteProject,
  deleteProjects,
  getProjectMembers,
  getProjects,
  leaveProject,
  removeProjectMember,
  updateProject
} from '@/services/projects';
import { bulkAssignTasks, createTask, deleteTask, getTasks, updateTask } from '@/services/tasks';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/context/AuthContext';
import socketService, { SocketEvents } from '@/services/socket';
import type { Epic, EpicStatus } from '@/types/epic';
import type { Note } from '@/types/note';
import type { Project, ProjectMember } from '@/types/project';
import type { Task, TaskWorkflowStatus, TaskPriority } from '@/types/task';
import { findProjectByName } from '@/utils/projectTree';
import { useConfirm } from '@/context/ConfirmationContext';

type ActiveNoteEditor =
  | {
    kind: 'project';
    note: Note | null;
    projectId: string;
    projectName: string;
  }
  | {
    kind: 'epic';
    epicId: string;
    epicName: string;
    note: Note | null;
    projectId: string;
  }
  | {
    kind: 'task';
    task: Task;
  }
  | {
    kind: 'subtask';
    subtask: Task['subtasks'][number];
    task: Task;
  };

const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const ALL_PROJECTS_VALUE = '__all__';

const deriveTaskStatusFromSubtasks = (
  currentStatus: Task['status'],
  subtasks: Array<{ status: TaskWorkflowStatus }>
): Task['status'] => {
  if (subtasks.length === 0) {
    return currentStatus;
  }

  if (subtasks.every((subtask) => subtask.status === 'DONE')) {
    return 'DONE';
  }

  if (currentStatus !== 'DONE') {
    return currentStatus;
  }

  if (subtasks.some((subtask) => subtask.status === 'IN_REVIEW')) {
    return 'IN_REVIEW';
  }

  if (subtasks.some((subtask) => subtask.status === 'IN_PROGRESS')) {
    return 'IN_PROGRESS';
  }

  return 'TODO';
};

/** Resets a feedback message to null a few seconds after it is set. */
function useAutoClear(value: string | null, setter: (value: string | null) => void, delayMs = 4000): void {
  useEffect(() => {
    if (value === null) return;
    const timer = setTimeout(() => setter(null), delayMs);
    return () => clearTimeout(timer);
  }, [value, setter, delayMs]);
}

function DashboardPage(): JSX.Element {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId, epicId, integrationId, tab } = useParams();
  const settingsTab = new URLSearchParams(location.search).get('tab') === 'workspace' ? 'workspace' : 'account';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [error, setError] = useState<string | null>(null);
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [actionProjectId, setActionProjectId] = useState<string | null>(null);
  const [actionEpicId, setActionEpicId] = useState<string | null>(null);
  const [actionNoteId, setActionNoteId] = useState<string | null>(null);
  const [taskMutationError, setTaskMutationError] = useState<string | null>(null);
  const [taskMutationSuccess, setTaskMutationSuccess] = useState<string | null>(null);
  const [projectMutationError, setProjectMutationError] = useState<string | null>(null);
  const [projectMutationSuccess, setProjectMutationSuccess] = useState<string | null>(null);
  const [epicMutationError, setEpicMutationError] = useState<string | null>(null);
  const [epicMutationSuccess, setEpicMutationSuccess] = useState<string | null>(null);
  const [noteMutationError, setNoteMutationError] = useState<string | null>(null);
  const [noteMutationSuccess, setNoteMutationSuccess] = useState<string | null>(null);
  const [sidePanelTab, setSidePanelTab] = useState<'subtasks' | 'comments'>('subtasks');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Each feedback message clears itself after a few seconds, independently of the others.
  useAutoClear(taskMutationSuccess, setTaskMutationSuccess);
  useAutoClear(taskMutationError, setTaskMutationError);
  useAutoClear(projectMutationSuccess, setProjectMutationSuccess);
  useAutoClear(projectMutationError, setProjectMutationError);
  useAutoClear(epicMutationSuccess, setEpicMutationSuccess);
  useAutoClear(epicMutationError, setEpicMutationError);
  useAutoClear(noteMutationSuccess, setNoteMutationSuccess);
  useAutoClear(noteMutationError, setNoteMutationError);
  useAutoClear(error, setError);

  const [isProjectCreateModalOpen, setIsProjectCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEpicCreateModalOpen, setIsEpicCreateModalOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [activeProjectAiEnabled, setActiveProjectAiEnabled] = useState(false);
  const [activeProjectAiProvider, setActiveProjectAiProvider] = useState<string | null>(null);

  const [taskFilters, setTaskFilters] = useState<TaskFilters>({
    search: '',
    status: 'all',
    assigneeId: 'all'
  });

  const handleClearFilters = () => {
    setTaskFilters({
      search: '',
      status: 'all',
      assigneeId: 'all'
    });
  };
  const [isProjectNotesModalOpen, setIsProjectNotesModalOpen] = useState(false);
  const [isEpicNotesModalOpen, setIsEpicNotesModalOpen] = useState(false);
  const [isTaskCreateModalOpen, setIsTaskCreateModalOpen] = useState(false);
  const [isProjectTeamModalOpen, setIsProjectTeamModalOpen] = useState(false);
  const [selectedProjectView, setSelectedProjectView] = useState<string>(ALL_PROJECTS_VALUE);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskModalProjectId, setTaskModalProjectId] = useState<string | null>(null);
  const [subtaskModalTask, setSubtaskModalTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<{ task: Task; subtask: Task['subtasks'][number] } | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [projectNotes, setProjectNotes] = useState<Record<string, Note[]>>({});
  const [epicNotes, setEpicNotes] = useState<Record<string, Note[]>>({});
  const [projectMembersByProject, setProjectMembersByProject] = useState<Record<string, ProjectMember[]>>({});
  const [notesLoadingKey, setNotesLoadingKey] = useState<string | null>(null);
  const [projectPage, setProjectPage] = useState(1);
  const [projectTotalPages, setProjectTotalPages] = useState<number>(1);
  const [projectSearchTerm, setProjectSearchTerm] = useState<string>('');
  const debouncedProjectSearchTerm = useDebounce(projectSearchTerm, 300);

  const debouncedTaskSearchTerm = useDebounce(taskFilters.search, 300);
  const [teamMutationLoading, setTeamMutationLoading] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<SidebarView>('dashboard');
  const [activeProjectForNotes, setActiveProjectForNotes] = useState<Project | null>(null);
  const [activeEpicForNotes, setActiveEpicForNotes] = useState<Epic | null>(null);
  const [activeNoteEditor, setActiveNoteEditor] = useState<ActiveNoteEditor | null>(null);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [isActivityHistoryOpen, setIsActivityHistoryOpen] = useState(false);
  const [isAiPlanningWorkspaceOpen, setIsAiPlanningWorkspaceOpen] = useState(false);

  const [priorityEvaluationModalOpen, setPriorityEvaluationModalOpen] = useState(false);
  const [priorityEvaluationResult, setPriorityEvaluationResult] = useState<PriorityEvaluation | null>(null);
  const [isRecalculatingPriorities, setIsRecalculatingPriorities] = useState(false);
  const [isEvaluatingPriority, setIsEvaluatingPriority] = useState(false);
  const { lastMessage, clearLastMessage, setActiveProject } = useChat();
  const [activeIntegrationName, setActiveIntegrationName] = useState<string>('');
  const [activeIntegrationSandbox, setActiveIntegrationSandbox] = useState(false);
  const { activeWorkspaceId, can } = useWorkspace();
  const [isTimePanelOpen, setIsTimePanelOpen] = useState(false);
  const [isPromptsPanelOpen, setIsPromptsPanelOpen] = useState(false);

  useEffect(() => {
    const fetchIntegrationDetails = async () => {
      if (integrationId) {
        try {
          const data = await getIntegration(integrationId);
          setActiveIntegrationName(data.name);
          setActiveIntegrationSandbox(data.mode === 'sandbox');
        } catch (err) {
          console.error('Failed to fetch integration name for sidebar', err);
          setActiveIntegrationName('');
        }
      } else {
        setActiveIntegrationName('');
      }
    };
    void fetchIntegrationDetails();
  }, [integrationId]);

  // Sync state with URL
  useEffect(() => {
    const path = location.pathname;

    if (path === '/intelligence') {
      setActiveView('semantic-intelligence');
    } else if (path === '/prompts') {
      setActiveView('prompts');
    } else if (path === '/playground') {
      setActiveView('playground');
    } else if (path === '/event-tracking') {
      setActiveView('event-tracking');
      setActiveView('event-tracking');
    } else if (path === '/engagement') {
      setActiveView('engagement');
    } else if (path.startsWith('/sdk-integrations/')) {
      setActiveView('sdk-integration-detail');
    } else if (path === '/sdk-integrations') {
      setActiveView('sdk-integrations');
    } else if (path === '/sdk-docs') {
      setActiveView('sdk-docs');
    } else if (path === '/settings') {
      setActiveView('settings');
    } else if (path.startsWith('/projects/')) {
      setActiveView('dashboard');
      if (projectId) {
        setSelectedProjectView(projectId);
      }
      if (epicId) {
        setSelectedEpicId(epicId);
      } else {
        setSelectedEpicId(null);
      }
    } else if (path === '/dashboard') {
      setActiveView('dashboard');
      setSelectedProjectView(ALL_PROJECTS_VALUE);
      setSelectedEpicId(null);
    }
  }, [location.pathname, projectId, epicId, integrationId]);


  const loadDashboard = useCallback(async (): Promise<void> => {
    // Everything is scoped to the active workspace; wait until it is known.
    if (!activeWorkspaceId) return;
    setLoading(true);
    setError(null);

    try {
      const [taskList, projectData] = await Promise.all([
        getTasks(
          undefined,
          taskFilters.assigneeId === 'all' ? undefined : taskFilters.assigneeId,
          debouncedTaskSearchTerm.trim() || undefined
        ),
        getProjects({ page: projectPage, limit: 10, search: debouncedProjectSearchTerm.trim() })
      ]);
      const projectList = projectData.projects;

      // Use allSettled so one failed project doesn't kill the whole dashboard
      const epicResults = await Promise.allSettled(
        projectList.map((project: Project) => getEpics(project.id))
      );

      const epicGroups = epicResults
        .filter((result): result is PromiseFulfilledResult<Epic[]> => result.status === 'fulfilled')
        .map((result) => result.value);

      setTasks(taskList);
      setProjects(projectList);
      setEpics(epicGroups.flat());
      setProjectTotalPages(projectData.totalPages);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Unable to load some data. Please check your connection.');
      // Only wipe if critical (tasks or projects list failed)
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, projectPage, debouncedProjectSearchTerm, taskFilters.assigneeId, debouncedTaskSearchTerm]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);



  useEffect(() => {
    const handleTaskAssigned = () => {
      void loadDashboard();
      setTaskMutationSuccess('Tasks updated');
    };

    socketService.on(SocketEvents.TASK_ASSIGNED, handleTaskAssigned);
    socketService.on(SocketEvents.TASK_BULK_ASSIGNED, handleTaskAssigned);

    return () => {
      socketService.off(SocketEvents.TASK_ASSIGNED, handleTaskAssigned);
      socketService.off(SocketEvents.TASK_BULK_ASSIGNED, handleTaskAssigned);
    };
  }, [loadDashboard]);

  const loadProjectTeam = useCallback(async (projectId: string): Promise<void> => {
    try {
      const members = await getProjectMembers(projectId);
      setProjectMembersByProject((current) => ({
        ...current,
        [projectId]: members
      }));
    } catch {
      setProjectMutationError('Unable to load the project team.');
    }
  }, []);

  const handleCreateTask = async (payload: {
    title: string;
    description?: string;
    note?: string;
    status?: TaskWorkflowStatus;
    priority?: TaskPriority;
    projectId?: string | null;
    epicId?: string | null;
    assignedTo?: string;
  }): Promise<void> => {
    console.log('[DEBUG] DashboardPage handleCreateTask payload:', payload);
    await createTask({
      title: payload.title.trim(),
      description: payload.description?.trim(),
      note: payload.note?.trim(),
      date: getTodayDate(),
      status: payload.status,
      priority: payload.priority,
      source: 'manual',
      projectId: payload.projectId,
      epicId: payload.epicId,
      assignedTo: payload.assignedTo
    });
    console.log('[DEBUG] Task created successfully');
    await loadDashboard();
    setIsTaskCreateModalOpen(false);
  };

  const handleToggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkAssign = async (userId: string) => {
    if (selectedTaskIds.length === 0) return;
    try {
      setLoading(true);
      await bulkAssignTasks(selectedTaskIds, userId);
      setTaskMutationSuccess(`Successfully assigned ${selectedTaskIds.length} tasks`);
      setSelectedTaskIds([]);
      await loadDashboard();
    } catch {
      setTaskMutationError('Failed to bulk assign tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEpic = async (payload: {
    description?: string;
    name: string;
    status: EpicStatus;
  }): Promise<void> => {
    if (activeProject == null) {
      return;
    }

    setActionEpicId('new');
    setEpicMutationError(null);
    setEpicMutationSuccess(null);

    try {
      await createEpic(activeProject.id, {
        ...payload,
        name: payload.name.trim(),
        description: payload.description?.trim()
      });
      await loadDashboard();
      setEpicMutationSuccess('Epic created.');
      setIsEpicCreateModalOpen(false);
    } catch {
      setEpicMutationError('Unable to create the epic.');
      throw new Error('Unable to create epic');
    } finally {
      setActionEpicId(null);
    }
  };

  const handleUpdateEpic = async (payload: {
    description?: string;
    name: string;
    status: EpicStatus;
  }): Promise<void> => {
    if (activeProject == null || editingEpic == null) {
      return;
    }

    setActionEpicId(editingEpic.id);
    setEpicMutationError(null);
    setEpicMutationSuccess(null);

    try {
      await updateEpic(activeProject.id, editingEpic.id, {
        ...payload,
        name: payload.name.trim(),
        description: payload.description?.trim()
      });
      await loadDashboard();
      setEpicMutationSuccess('Epic updated.');
      setEditingEpic(null);
    } catch {
      setEpicMutationError('Unable to update the epic.');
      throw new Error('Unable to update epic');
    } finally {
      setActionEpicId(null);
    }
  };

  const handleUpdateTask = async (payload: {
    title: string;
    description?: string;
    note?: string;
    date: string;
    status: TaskWorkflowStatus;
    priority?: TaskPriority;
    isBlocked?: boolean;
    blockedByTaskId?: string | null;
    projectId: string | null;
    epicId: string | null;
    assignedTo?: string;
  }): Promise<void> => {
    if (editingTask == null) return;

    setActionTaskId(editingTask.id);
    setTaskMutationError(null);
    setTaskMutationSuccess(null);

    try {
      await updateTask(editingTask.id, {
        title: payload.title.trim(),
        description: payload.description?.trim(),
        note: payload.note?.trim(),
        date: payload.date,
        status: payload.status,
        priority: payload.priority,
        isBlocked: payload.isBlocked,
        blockedByTaskId: payload.blockedByTaskId,
        projectId: payload.projectId,
        epicId: payload.epicId,
        assignedTo: payload.assignedTo,
      });
      await loadDashboard();
      setTaskMutationSuccess('Task updated.');
      setEditingTask(null);
    } catch {
      setTaskMutationError('Unable to update the task.');
      throw new Error('Unable to update task');
    } finally {
      setActionTaskId(null);
    }
  };

  const cleanSubtaskPayload = (subtask: Task['subtasks'][number]) => {
    let assignedToUserId: string | null = null;
    const raw = subtask.assignedToUserId;
    if (raw && typeof raw === 'object') {
      assignedToUserId = (raw as any)._id || (raw as any).id || null;
    } else if (typeof raw === 'string') {
      const match = raw.match(/[a-f0-9]{24}/i);
      assignedToUserId = match ? match[0] : null;
    }

    return {
      id: subtask.id,
      _id: subtask.id,
      title: subtask.title.trim(),
      description: subtask.description?.trim() || undefined,
      note: subtask.note?.trim() || undefined,
      status: subtask.status,
      completed: subtask.status === 'DONE' || subtask.completed,
      completedAt: subtask.status === 'DONE' ? (subtask.completedAt ?? new Date().toISOString()) : null,
      assignedToUserId
    };
  };

  const handleUpdateSubtask = async (
    task: Task,
    targetSubtask: Task['subtasks'][number],
    patch: { title: string; description?: string; note?: string; status?: TaskWorkflowStatus; assignedToUserId?: string | null }
  ): Promise<void> => {
    setActionTaskId(task.id);
    setTaskMutationError(null);
    setTaskMutationSuccess(null);

    try {
      const updatedSubtasks = task.subtasks.map((subtask) => {
        const cleaned = cleanSubtaskPayload(subtask);
        if (subtask.id !== targetSubtask.id) {
          return cleaned;
        }

        const nextStatus = patch.status ?? subtask.status;
        return {
          ...cleaned,
          title: patch.title.trim(),
          description: patch.description?.trim(),
          note: patch.note?.trim(),
          status: nextStatus,
          completed: nextStatus === 'DONE',
          completedAt: nextStatus === 'DONE' ? (subtask.completedAt ?? new Date().toISOString()) : null,
          assignedToUserId: patch.assignedToUserId !== undefined ? patch.assignedToUserId : cleaned.assignedToUserId
        };
      });

      const nextTaskStatus = deriveTaskStatusFromSubtasks(task.status, updatedSubtasks);

      await updateTask(task.id, { status: nextTaskStatus, subtasks: updatedSubtasks });
      await loadDashboard();
      setTaskMutationSuccess('Subtask updated.');
      setEditingSubtask(null);
    } catch (err) {
      setTaskMutationError(toDisplayErrorMessage(err) || 'Unable to update the subtask.');
    } finally {
      setActionTaskId(null);
    }
  };

  const handleDeleteEpic = async (epicId: string) => {
    const epic = epics.find((e) => e.id === epicId);
    if (!epic) return;

    const isConfirmed = await confirm({
      title: 'Delete Epic',
      message: `Delete epic "${epic.name}"? Tasks will remain and move to "No Epic".`,
      confirmText: 'Delete Epic',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setActionEpicId(epic.id);
    setEpicMutationError(null);
    setEpicMutationSuccess(null);

    try {
      await deleteEpic(epic.projectId, epic.id);
      await loadDashboard();
      setEpicMutationSuccess('Epic deleted. Related tasks were preserved and unassigned.');
      setEpicNotes((current) => {
        const next = { ...current };
        delete next[epic.id];
        return next;
      });

      if (editingEpic?.id === epic.id) {
        setEditingEpic(null);
      }

      if (activeEpicForNotes?.id === epic.id) {
        setActiveEpicForNotes(null);
        setIsEpicNotesModalOpen(false);
      }
    } catch {
      setEpicMutationError('Unable to delete the epic.');
    } finally {
      setActionEpicId(null);
    }
  };

  const handleCreateProject = async (payload: { name: string; description?: string }): Promise<void> => {
    setActionProjectId('new');
    setProjectMutationError(null);
    setProjectMutationSuccess(null);

    try {
      const trimmedName = payload.name.trim();
      const existingProject = findProjectByName(projects, trimmedName);

      if (existingProject) {
        setProjectMutationSuccess('Project already exists.');
        setIsProjectCreateModalOpen(false);
        return;
      }

      await createProject({
        ...payload,
        name: trimmedName,
        description: payload.description?.trim()
      });
      await loadDashboard();
      setProjectMutationSuccess('Project created.');
      setIsProjectCreateModalOpen(false);
    } catch {
      setProjectMutationError('Unable to create the project.');
    } finally {
      setActionProjectId(null);
    }
  };

  const handleUpdateProject = async (payload: { name: string; description?: string }): Promise<void> => {
    if (editingProject == null) {
      return;
    }

    setActionProjectId(editingProject.id);
    setProjectMutationError(null);
    setProjectMutationSuccess(null);

    try {
      await updateProject(editingProject.id, {
        ...payload,
        name: payload.name.trim(),
        description: payload.description?.trim()
      });
      await loadDashboard();
      setProjectMutationSuccess('Project updated.');
      setEditingProject(null);
    } catch {
      setProjectMutationError('Unable to update the project.');
    } finally {
      setActionProjectId(null);
    }
  };



  const handleInviteProjectMember = async (email: string, role: 'ADMIN' | 'MEMBER'): Promise<void> => {
    if (activeProject == null) {
      return;
    }

    setTeamMutationLoading(true);
    setProjectMutationError(null);
    setProjectMutationSuccess(null);

    try {
      await api.post(`/invitations/projects/${activeProject.id}`, { email, role });
      await Promise.all([loadDashboard(), loadProjectTeam(activeProject.id)]);
      setProjectMutationSuccess('Member successfully added or invited.');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      const msg = errorObj.response?.data?.error || 'Failed to process request.';
      setProjectMutationError(msg);
    } finally {
      setTeamMutationLoading(false);
    }
  };

  const handleOpenTaskComments = (task: Task) => {
    setSelectedTaskId(task.id);
    setSidePanelTab('comments');
  };

  const handleRemoveProjectMember = async (userId: string): Promise<void> => {
    if (activeProject == null) {
      return;
    }

    const member = (projectMembersByProject[activeProject.id] ?? []).find((entry) => entry.userId === userId);

    if (member?.role === 'ADMIN') {
      setProjectMutationError('Project admins cannot be removed from the team.');
      setProjectMutationSuccess(null);
      return;
    }

    const label = member?.user.name || member?.user.email || 'this member';
    const isConfirmed = await confirm({
      title: 'Remove Project Member',
      message: `Remove ${label} from ${activeProject.name}? Assigned tasks will be unassigned.`,
      confirmText: 'Remove Member',
      type: 'danger'
    });

    if (!isConfirmed) {
      return;
    }

    setTeamMutationLoading(true);
    setProjectMutationError(null);
    setProjectMutationSuccess(null);

    try {
      await removeProjectMember(activeProject.id, userId);
      await Promise.all([loadDashboard(), loadProjectTeam(activeProject.id)]);
      setProjectMutationSuccess('Project member removed.');

      if (userId === user?.id) {
        handleProjectSelect(ALL_PROJECTS_VALUE);
      }
    } catch {
      setProjectMutationError('Unable to remove the project member.');
    } finally {
      setTeamMutationLoading(false);
    }
  };

  const handleLeaveProject = async (): Promise<void> => {
    if (activeProject == null) {
      return;
    }

    const isConfirmed = await confirm({
      title: 'Leave Project',
      message: `Are you sure you want to leave ${activeProject.name}? You will no longer access this project and tasks assigned to you will be unassigned.`,
      confirmText: 'Leave Project',
      type: 'danger'
    });

    if (!isConfirmed) {
      return;
    }

    setTeamMutationLoading(true);
    setProjectMutationError(null);
    setProjectMutationSuccess(null);

    try {
      await leaveProject(activeProject.id);
      setIsProjectTeamModalOpen(false);
      handleProjectSelect(ALL_PROJECTS_VALUE);
      await loadDashboard();
      setProjectMutationSuccess('You have left the project.');
    } catch {
      setProjectMutationError('Unable to leave the project.');
    } finally {
      setTeamMutationLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? All associated tasks, epics, and notes will be permanently removed.',
      confirmText: 'Delete Project',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setActionProjectId(projectId);
    try {
      await deleteProject(projectId);
      await loadDashboard();
      setProjectNotes((current) => {
        const next = { ...current };
        delete next[projectId];
        return next;
      });
      setEpicNotes((current) => {
        const next = { ...current };
        Object.keys(next).forEach((epicId) => {
          if (epics.find((epic) => epic.id === epicId)?.projectId === projectId) {
            delete next[epicId];
          }
        });
        return next;
      });
      setEpics((current) => current.filter((epic) => epic.projectId !== projectId));

      if (selectedProjectView === projectId) {
        setSelectedProjectView(ALL_PROJECTS_VALUE);
      }

      setActiveNoteEditor((current) => {
        if (current == null) {
          return null;
        }

        if (current.kind === 'project') {
          return current.projectId === projectId ? null : current;
        }

        if (current.kind === 'epic') {
          return current.projectId === projectId ? null : current;
        }

        return current.task.projectId === projectId ? null : current;
      });
      setSubtaskModalTask((current) => (current?.projectId === projectId ? null : current));
      setEditingEpic((current) => (current?.projectId === projectId ? null : current));

      if (activeProject?.id === projectId) {
        setIsProjectNotesModalOpen(false);
      }

      if (activeProjectForNotes?.id === projectId) {
        setActiveProjectForNotes(null);
        setIsProjectNotesModalOpen(false);
      }

      if (activeEpicForNotes?.projectId === projectId) {
        setActiveEpicForNotes(null);
        setIsEpicNotesModalOpen(false);
      }

      setProjectMutationSuccess('Project deleted. Related tasks and notes were removed.');
    } catch {
      setProjectMutationError('Unable to delete the project.');
    } finally {
      setActionProjectId(null);
    }
  };

  const handleDeleteProjects = async (projectIds: string[]) => {
    const isConfirmed = await confirm({
      title: 'Delete Multiple Projects',
      message: `Are you sure you want to delete ${projectIds.length} projects? All associated tasks, epics, and notes will be permanently removed.`,
      confirmText: 'Delete Projects',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setActionProjectId('bulk');
    try {
      await deleteProjects(projectIds);
      await loadDashboard();
      if (selectedProjectView && projectIds.includes(selectedProjectView)) {
        handleProjectSelect(ALL_PROJECTS_VALUE);
      }
    } catch {
      // Error handled by UI
    } finally {
      setActionProjectId(null);
    }
  };

  const handleUpdateTaskStatus = async (task: Task, status: TaskWorkflowStatus, skipConfirm = false) => {
    if (!skipConfirm) {
      const isConfirmed = await confirm({
        title: 'Update Task Status',
        message: `Update the status for "${task.title}" to "${status.replace('_', ' ')}"?`,
        confirmText: 'Update Status',
        type: 'info'
      });

      if (!isConfirmed) return;
    }

    setActionTaskId(task.id);
    setTaskMutationError(null);
    setTaskMutationSuccess(null);

    try {
      const updates =
        status === 'DONE'
          ? {
            status,
            subtasks: task.subtasks.map((subtask) => ({
              title: subtask.title,
              note: subtask.note,
              status: 'DONE' as const,
              completedAt: subtask.completedAt ?? new Date().toISOString()
            }))
          }
          : { status };

      await updateTask(task.id, updates);
      await loadDashboard();
      setTaskMutationSuccess('Task status updated.');
    } catch {
      setTaskMutationError('Unable to update the task status.');
    } finally {
      setActionTaskId(null);
    }
  };

  const handleUpdateTaskEpic = async (task: Task, epicId: string | null): Promise<void> => {
    setActionTaskId(task.id);
    setTaskMutationError(null);
    setTaskMutationSuccess(null);

    try {
      await updateTask(task.id, {
        projectId: task.projectId,
        epicId
      });
      await loadDashboard();
      setTaskMutationSuccess(epicId ? 'Task epic updated.' : 'Task moved to No Epic.');
    } catch {
      setTaskMutationError('Unable to update the task epic.');
    } finally {
      setActionTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Task',
      message: `Delete "${taskTitle}"?`,
      confirmText: 'Delete Task',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setActionTaskId(taskId);
    setTaskMutationError(null);
    setTaskMutationSuccess(null);

    try {
      await deleteTask(taskId);
      await loadDashboard();
      setTaskMutationSuccess('Task deleted.');
    } catch {
      setTaskMutationError('Unable to delete the task.');
    } finally {
      setActionTaskId(null);
    }
  };

  const handleUpdateSubtaskStatus = async (
    task: Task,
    targetSubtask: Task['subtasks'][number],
    status: TaskWorkflowStatus
  ): Promise<void> => {
    const previousTasks = [...tasks];

    // Optimistic Update
    const updatedSubtasks = task.subtasks.map((subtask) => {
      const cleaned = cleanSubtaskPayload(subtask);
      if (subtask.id !== targetSubtask.id) {
        return cleaned;
      }

      return {
        ...cleaned,
        status,
        completed: status === 'DONE',
        completedAt: status === 'DONE' ? new Date().toISOString() : null
      };
    });

    const updatedTask = {
      ...task,
      status: deriveTaskStatusFromSubtasks(task.status, updatedSubtasks),
      subtasks: updatedSubtasks
    };

    setTasks((prev) => prev.map((t) => t.id === task.id ? updatedTask : t));

    setTaskMutationError(null);
    setTaskMutationSuccess(null);

    try {
      await updateTask(task.id, {
        status: updatedTask.status,
        subtasks: updatedSubtasks
      });
      await loadDashboard();
      setTaskMutationSuccess('Subtask updated.');
    } catch (err) {
      setTasks(previousTasks); // Rollback
      setTaskMutationError(toDisplayErrorMessage(err) || 'Unable to update the subtask.');
      console.error('Subtask update failed:', err);
    }
  };

  const handleRecalculatePriorities = async () => {
    setIsRecalculatingPriorities(true);
    setTaskMutationError(null);
    try {
      const result = await recalculateDynamicPriorities();
      setTaskMutationSuccess(`Recalculated priorities for ${result.count} tasks`);
      await loadDashboard();
    } catch {
      setTaskMutationError('Failed to recalculate priorities');
    }
    setIsRecalculatingPriorities(false);
  };

  const handleEvaluatePriority = async (taskId: string) => {
    setIsEvaluatingPriority(true);
    setTaskMutationError(null);
    try {
      const evaluation = await evaluateTaskPriority(taskId);
      setPriorityEvaluationResult(evaluation);
      setPriorityEvaluationModalOpen(true);
    } catch {
      setTaskMutationError('Failed to evaluate priority');
    }
    setIsEvaluatingPriority(false);
  };

  const handleToggleBlocked = async (task: Task): Promise<void> => {
    const previousTasks = [...tasks];
    const isBlocked = !task.isBlocked;

    // Optimistic Update
    const updatedTask = {
      ...task,
      isBlocked
    };

    setTasks((prev) => prev.map((t) => t.id === task.id ? updatedTask : t));

    try {
      await updateTask(task.id, { isBlocked });
      setTaskMutationSuccess(isBlocked ? 'Task marked as blocked.' : 'Task unblocked.');
    } catch (err) {
      setTasks(previousTasks); // Rollback
      setTaskMutationError('Unable to update blocked status.');
      console.error('Blocked toggle failed:', err);
    }
  };

  const handleCreateSubtask = async (
    payload: Array<{ title: string; description?: string; note?: string; status: TaskWorkflowStatus }>
  ): Promise<void> => {
    if (subtaskModalTask == null) {
      return;
    }

    setActionTaskId(subtaskModalTask.id);
    setTaskMutationError(null);
    setTaskMutationSuccess(null);

    try {
      const subtasks = [
        ...subtaskModalTask.subtasks,
        ...payload.map((subtask) => ({
          title: subtask.title.trim(),
          description: subtask.description?.trim(),
          note: subtask.note?.trim(),
          status: subtask.status,
          completedAt: subtask.status === 'DONE' ? new Date().toISOString() : null
        }))
      ];

      await updateTask(subtaskModalTask.id, {
        status: deriveTaskStatusFromSubtasks(subtaskModalTask.status, subtasks),
        subtasks
      });
      await loadDashboard();
      setSubtaskModalTask(null);
      setTaskMutationSuccess(payload.length === 1 ? 'Sub-task created.' : 'Sub-tasks created.');
    } catch {
      setTaskMutationError('Unable to create the subtask.');
    } finally {
      setActionTaskId(null);
    }
  };

  const handleDeleteSubtask = async (task: Task, subtaskId: string) => {
    const targetSubtask = task.subtasks.find((s) => s.id === subtaskId);
    if (!targetSubtask) return;

    const isConfirmed = await confirm({
      title: 'Delete Subtask',
      message: `Remove sub-task "${targetSubtask.title}" from "${task.title}"?`,
      confirmText: 'Delete Subtask',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setActionTaskId(task.id);
    setTaskMutationError(null);
    setTaskMutationSuccess(null);

    try {
      const subtasks = task.subtasks
        .filter((subtask) => subtask.id !== targetSubtask.id);

      await updateTask(task.id, {
        status: deriveTaskStatusFromSubtasks(task.status, subtasks),
        subtasks
      });
      await loadDashboard();
      setTaskMutationSuccess('Sub-task removed.');
    } catch {
      setTaskMutationError('Unable to remove the sub-task.');
    } finally {
      setActionTaskId(null);
    }
  };

  const loadNotesForProject = useCallback(async (projectId: string): Promise<void> => {
    setNotesLoadingKey(`project:${projectId}`);

    try {
      const notes = await getProjectNotes(projectId);
      setProjectNotes((current) => ({
        ...current,
        [projectId]: notes
      }));
    } catch {
      setNoteMutationError('Unable to load notes for this project.');
    } finally {
      setNotesLoadingKey((current) => (current === `project:${projectId}` ? null : current));
    }
  }, []);

  const loadNotesForEpic = useCallback(async (projectId: string, epicId: string): Promise<void> => {
    setNotesLoadingKey(`epic:${epicId}`);

    try {
      const notes = await getEpicNotes(projectId, epicId);
      setEpicNotes((current) => ({
        ...current,
        [epicId]: notes
      }));
    } catch {
      setNoteMutationError('Unable to load notes for this epic.');
    } finally {
      setNotesLoadingKey((current) => (current === `epic:${epicId}` ? null : current));
    }
  }, []);

  const handleOpenCreateProjectNote = (project: Project): void => {
    setNoteMutationError(null);
    setNoteMutationSuccess(null);
    setActiveNoteEditor({
      kind: 'project',
      note: null,
      projectId: project.id,
      projectName: project.name
    });
  };

  const handleOpenCreateEpicNote = (epic: Epic): void => {
    setNoteMutationError(null);
    setNoteMutationSuccess(null);
    setActiveNoteEditor({
      kind: 'epic',
      epicId: epic.id,
      epicName: epic.name,
      note: null,
      projectId: epic.projectId
    });
  };

  const handleOpenExistingNote = async (note: Note): Promise<void> => {
    setActionNoteId(note.id);
    setNoteMutationError(null);
    setNoteMutationSuccess(null);

    try {
      const latestNote = await getNote(note.id);
      if (latestNote.entityType === 'epic') {
        const epicName = epics.find((epic) => epic.id === latestNote.epicId)?.name ?? activeEpicForNotes?.name ?? 'Epic';
        setActiveNoteEditor({
          kind: 'epic',
          epicId: latestNote.epicId ?? '',
          epicName,
          note: latestNote,
          projectId: latestNote.projectId
        });
      } else {
        const projectName =
          projects.find((project) => project.id === latestNote.projectId)?.name ?? activeProject?.name ?? 'Project';
        setActiveNoteEditor({
          kind: 'project',
          note: latestNote,
          projectId: latestNote.projectId,
          projectName
        });
      }
    } catch {
      setNoteMutationError('Unable to open the note.');
    } finally {
      setActionNoteId(null);
    }
  };

  const handleSaveNote = async (payload: {
    appendContent?: boolean;
    title?: string;
    content: string;
  }): Promise<void> => {
    if (activeNoteEditor == null) {
      return;
    }

    const editor = activeNoteEditor;

    if (
      (editor.kind === 'project' && editor.note != null) ||
      (editor.kind === 'epic' && editor.note != null) ||
      (editor.kind === 'task' && editor.task.note?.trim()) ||
      (editor.kind === 'subtask' && editor.subtask.note?.trim())
    ) {
      const label =
        editor.kind === 'project'
          ? `project note "${editor.note?.title ?? ''}"`
          : editor.kind === 'epic'
            ? `epic note "${editor.note?.title ?? ''}"`
            : editor.kind === 'task'
              ? `task note for "${editor.task.title}"`
              : `sub-task note for "${editor.subtask.title}"`;
      const actionLabel = payload.appendContent ? 'append to' : 'update';
      const isDestructive = false;

      const isConfirmed = await confirm({
        title: `${actionLabel} ${label}`,
        message: `Confirm ${actionLabel} ${label}?`,
        confirmText: actionLabel,
        type: isDestructive ? 'danger' : 'info'
      });

      if (!isConfirmed) return;
    }

    setActionNoteId(editor.kind === 'project' || editor.kind === 'epic' ? editor.note?.id ?? 'new' : null);
    setNoteMutationError(null);
    setNoteMutationSuccess(null);

    try {
      if (editor.kind === 'project') {
        if (editor.note) {
          const updated = await updateNote(editor.note.id, {
            appendContent: payload.appendContent,
            title: payload.title,
            content: payload.content
          });
          setProjectNotes((current) => ({
            ...current,
            [editor.projectId]: (current[editor.projectId] ?? []).map((note) => (note.id === updated.id ? updated : note))
          }));
          setNoteMutationSuccess(payload.appendContent ? 'Content appended to note.' : 'Note updated.');
        } else {
          const created = await createNote(editor.projectId, {
            title: payload.title ?? '',
            content: payload.content
          });
          setProjectNotes((current) => ({
            ...current,
            [editor.projectId]: [created, ...(current[editor.projectId] ?? [])]
          }));
          setNoteMutationSuccess('Note created.');
        }
      } else if (editor.kind === 'epic') {
        if (editor.note) {
          const updated = await updateNote(editor.note.id, {
            appendContent: payload.appendContent,
            title: payload.title,
            content: payload.content
          });
          setEpicNotes((current) => ({
            ...current,
            [editor.epicId]: (current[editor.epicId] ?? []).map((note) => (note.id === updated.id ? updated : note))
          }));
          setNoteMutationSuccess(payload.appendContent ? 'Content appended to note.' : 'Note updated.');
        } else {
          const created = await createEpicNote(editor.projectId, editor.epicId, {
            title: payload.title ?? '',
            content: payload.content
          });
          setEpicNotes((current) => ({
            ...current,
            [editor.epicId]: [created, ...(current[editor.epicId] ?? [])]
          }));
          setNoteMutationSuccess('Epic note created.');
        }
      } else if (editor.kind === 'task') {
        await updateTask(editor.task.id, { note: payload.content });
        await loadDashboard();
        setTaskMutationSuccess(editor.task.note?.trim() ? 'Task note updated.' : 'Task note created.');
      } else {
        const latestTask = tasks.find((task) => task.id === editor.task.id) ?? editor.task;
        const subtasks = latestTask.subtasks.map((subtask) => (
          subtask.id === editor.subtask.id
            ? { ...subtask, note: payload.content }
            : subtask
        ));

        await updateTask(latestTask.id, {
          status: deriveTaskStatusFromSubtasks(latestTask.status, subtasks),
          subtasks
        });
        await loadDashboard();
        setTaskMutationSuccess(editor.subtask.note?.trim() ? 'Subtask note updated.' : 'Subtask note created.');
      }

      setActiveNoteEditor(null);
    } catch {
      setNoteMutationError('Unable to save the note.');
      throw new Error('Unable to save note');
    } finally {
      setActionNoteId(null);
    }
  };

  const handleDeleteNote = async (note: Note) => {
    const isConfirmed = await confirm({
      title: 'Delete note',
      message: `Delete note "${note.title}"?`,
      confirmText: 'Delete note',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setActionNoteId(note.id);
    setNoteMutationError(null);
    setNoteMutationSuccess(null);

    try {
      await deleteNote(note.id);
      if (note.entityType === 'epic' && note.epicId) {
        setEpicNotes((current) => ({
          ...current,
          [note.epicId as string]: (current[note.epicId as string] ?? []).filter((currentNote) => currentNote.id !== note.id)
        }));
      } else {
        setProjectNotes((current) => ({
          ...current,
          [note.projectId]: (current[note.projectId] ?? []).filter((currentNote) => currentNote.id !== note.id)
        }));
      }

      if ((activeNoteEditor?.kind === 'project' || activeNoteEditor?.kind === 'epic') && activeNoteEditor.note?.id === note.id) {
        setActiveNoteEditor(null);
      }

      setNoteMutationSuccess('Note deleted.');
    } catch {
      setNoteMutationError('Unable to delete the note.');
    } finally {
      setActionNoteId(null);
    }
  };

  const handleDeleteInlineNote = async (): Promise<void> => {
    if (activeNoteEditor == null || activeNoteEditor.kind === 'project' || activeNoteEditor.kind === 'epic') {
      return;
    }

    const label = activeNoteEditor.kind === 'task'
      ? `task note for "${activeNoteEditor.task.title}"`
      : `sub-task note for "${activeNoteEditor.subtask.title}"`;

    const isConfirmed = await confirm({
      title: 'Delete note',
      message: `Delete ${label}?`,
      confirmText: 'Delete note',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setActionNoteId(
      activeNoteEditor.kind === 'task'
        ? activeNoteEditor.task.id
        : `${activeNoteEditor.task.id}:${activeNoteEditor.subtask.id}`
    );
    setNoteMutationError(null);
    setNoteMutationSuccess(null);

    try {
      if (activeNoteEditor.kind === 'task') {
        await updateTask(activeNoteEditor.task.id, { note: '' });
        setTaskMutationSuccess('Task note deleted.');
      } else {
        const latestTask = tasks.find((task) => task.id === activeNoteEditor.task.id) ?? activeNoteEditor.task;
        const subtasks = latestTask.subtasks.map((subtask) => ({
          title: subtask.title,
          note: subtask.id === activeNoteEditor.subtask.id ? '' : subtask.note,
          status: subtask.status,
          completedAt: subtask.completedAt
        }));

        await updateTask(latestTask.id, {
          status: deriveTaskStatusFromSubtasks(latestTask.status, subtasks),
          subtasks
        });
        setTaskMutationSuccess('Sub-task note deleted.');
      }

      await loadDashboard();
      setActiveNoteEditor(null);
    } catch {
      setNoteMutationError('Unable to delete the note.');
    } finally {
      setActionNoteId(null);
    }
  };

  const handleOpenTaskNote = (task: Task): void => {
    setNoteMutationError(null);
    setNoteMutationSuccess(null);
    setActiveNoteEditor({
      kind: 'task',
      task: tasks.find((currentTask) => currentTask.id === task.id) ?? task
    });
  };

  const handleOpenSubtaskNote = (task: Task, subtask: Task['subtasks'][number]): void => {
    setNoteMutationError(null);
    setNoteMutationSuccess(null);
    setActiveNoteEditor({
      kind: 'subtask',
      task: tasks.find((currentTask) => currentTask.id === task.id) ?? task,
      subtask:
        (tasks.find((currentTask) => currentTask.id === task.id)?.subtasks.find((currentSubtask) => currentSubtask.id === subtask.id) ??
          subtask)
    });
  };

  const handleOpenProjectNotesPanel = (project: Project): void => {
    if (projectNotes[project.id] == null) {
      void loadNotesForProject(project.id);
    }

    setActiveProjectForNotes(project);
    setActiveEpicForNotes(null);
    setIsProjectNotesModalOpen(true);
  };

  const handleOpenEpicNotesPanel = (epic: Epic): void => {
    if (epicNotes[epic.id] == null) {
      void loadNotesForEpic(epic.projectId, epic.id);
    }

    setActiveEpicForNotes(epic);
    setIsEpicNotesModalOpen(true);
  };


  const activeProject = useMemo(() => {
    if (selectedProjectView === ALL_PROJECTS_VALUE) {
      return null;
    }

    return projects.find((project) => project.id === selectedProjectView) ?? null;
  }, [projects, selectedProjectView]);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const prevProjectsRef = useRef<Project[]>([]);

  // Track project list changes for 'Added to Team' notifications
  useEffect(() => {
    if (projects.length > 0 && prevProjectsRef.current.length > 0) {
      const newProjects = projects.filter(p => !prevProjectsRef.current.find(prev => prev.id === p.id));
      newProjects.forEach(project => {
        const notification: Notification = {
          id: `team-${project.id}-${Date.now()}`,
          type: 'team_join',
          title: 'Added to Team',
          message: `You were added to the project "${project.name}"`,
          timestamp: new Date(),
          isRead: false,
          projectId: project.id,
        };
        setNotifications(prev => [notification, ...prev]);
      });
    }
    prevProjectsRef.current = projects;
  }, [projects]);

  // Convert lastMessage to notification - Single robust implementation
  useEffect(() => {
    if (lastMessage) {
      // Create notification if chat is closed
      if (!isChatPanelOpen) {
        if (lastMessage.sender?.id === user?.id || lastMessage.senderId === user?.id) {
          clearLastMessage();
          return;
        }

        const newNotification: Notification = {
          id: lastMessage.id,
          type: 'message',
          title: lastMessage.sender?.name || lastMessage.sender?.email || 'New Message',
          message: lastMessage.content,
          timestamp: new Date(lastMessage.createdAt),
          isRead: false,
          projectId: activeProject?.id,
        };

        setNotifications((prev: Notification[]) => {
          if (prev.some(n => n.id === lastMessage.id)) return prev;
          return [newNotification, ...prev];
        });
      }

      // Always clear last message once processed or if chat is open
      clearLastMessage();
    }
  }, [lastMessage, isChatPanelOpen, activeProject, user?.id, clearLastMessage]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    if (notification.type === 'message') {
      setIsChatPanelOpen(true);
    }
    setIsNotificationsOpen(false);
  };
  const activeProjectMembers = activeProject ? (projectMembersByProject[activeProject.id] ?? []) : [];
  const canManageActiveProject = !!activeProject;
  const canManageTeam = activeProject?.currentUserRole === 'ADMIN';
  const visibleTasks = useMemo(() => {
    let filtered = tasks;

    // Project filter
    if (selectedProjectView !== ALL_PROJECTS_VALUE) {
      filtered = filtered.filter((task) => task.projectId === selectedProjectView);
    }

    // Status filter
    if (taskFilters.status !== 'all') {
      filtered = filtered.filter((task) => task.status === taskFilters.status);
    }

    // Assignee filter
    if (taskFilters.assigneeId !== 'all') {
      filtered = filtered.filter((task) =>
        task.assignedTo?.id === taskFilters.assigneeId ||
        task.subtasks.some((st) => st.assignedToUserId === taskFilters.assigneeId)
      );
    }


    // Search filter
    if (taskFilters.search.trim()) {
      const term = taskFilters.search.trim().toLowerCase();
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [selectedProjectView, tasks, taskFilters]);
  const activeProjectEpics = useMemo(
    () =>
      activeProject == null
        ? []
        : epics
          .filter(
            (epic) =>
              epic.projectId === activeProject.id ||
              (activeProject.uuid && epic.projectId === activeProject.uuid) ||
              ((activeProject as any)._id && epic.projectId === (activeProject as any)._id)
          )
          .sort((left, right) => left.order - right.order),
    [activeProject, epics]
  );
  const activeProjectNotes = activeProjectForNotes ? projectNotes[activeProjectForNotes.id] ?? [] : [];
  const activeEpicNotes = activeEpicForNotes ? epicNotes[activeEpicForNotes.id] ?? [] : [];
  const activeProjectNotesModalTitle = activeProjectForNotes ? `Notes for ${activeProjectForNotes.name}` : 'Project Notes';
  const activeEpicNotesModalTitle = activeEpicForNotes ? `Notes for ${activeEpicForNotes.name}` : 'Epic Notes';

  useEffect(() => {
    if (activeProject == null) {
      setActiveProject(null);
      setActiveProjectAiEnabled(false);
      setActiveProjectAiProvider(null);
      return;
    }

    setActiveProject(activeProject);

    if (projectMembersByProject[activeProject.id] == null) {
      void loadProjectTeam(activeProject.id);
    }

    const loadAiConfigStatus = async () => {
      try {
        const config = await getProjectAiConfig(activeProject.id);
        setActiveProjectAiEnabled(config.enabled);
        setActiveProjectAiProvider(config.provider);
      } catch {
        setActiveProjectAiEnabled(false);
        setActiveProjectAiProvider(null);
      }
    };
    void loadAiConfigStatus();
  }, [activeProject, loadProjectTeam, projectMembersByProject, setActiveProject]);

  useEffect(() => {
    if (editingTask?.projectId && projectMembersByProject[editingTask.projectId] == null) {
      void loadProjectTeam(editingTask.projectId);
    }
  }, [editingTask, loadProjectTeam, projectMembersByProject]);

  // Notification clearing moved to the primary effect above


  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: 'Sign out?',
      message: 'You’ll need to sign in again to get back to your projects.',
      confirmText: 'Sign out',
      type: 'info'
    });

    if (isConfirmed) {
      await logout();
    }
  };

  const handleProjectSelect = (projectId: string): void => {
    if (projectId === ALL_PROJECTS_VALUE) {
      navigate('/dashboard');
    } else {
      navigate(`/projects/${projectId}`);
    }
    setSelectedTaskId(null);
  };

  const handleProjectPageChange = (page: number): void => {
    setProjectPage(page);
  };

  const handleProjectSearch = (term: string): void => {
    setProjectSearchTerm(term);
    setProjectPage(1);
  };

  const handleEpicSelect = (epicId: string | null): void => {
    if (activeProject) {
      if (epicId) {
        navigate(`/projects/${activeProject.id}/epics/${epicId}`);
      } else {
        navigate(`/projects/${activeProject.id}`);
      }
    } else if (selectedProjectView !== ALL_PROJECTS_VALUE) {
      if (epicId) {
        navigate(`/projects/${selectedProjectView}/epics/${epicId}`);
      } else {
        navigate(`/projects/${selectedProjectView}`);
      }
    }
    setSelectedTaskId(null);
  };

  const activeEpicTasks = useMemo(() => {
    // With no epic chosen, the workspace shows every task in the project.
    if (!selectedEpicId) return visibleTasks;
    return visibleTasks.filter(t => t.epicId === selectedEpicId);
  }, [selectedEpicId, visibleTasks]);

  const activeTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find(t => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasks]);

  const epicStatusCls: Record<string, string> = {
    planned: 'bg-olive-300',
    active: 'bg-amber-400',
    completed: 'bg-brand-500',
    archived: 'bg-olive-200',
  };
  const formatDateTime = (value?: string | Date | null) =>
    value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;

  const allMutationMessages = [
    taskMutationError,
    taskMutationSuccess,
    projectMutationError,
    projectMutationSuccess,
    epicMutationError,
    epicMutationSuccess,
    noteMutationError,
    noteMutationSuccess,
    error
  ].filter(Boolean);

  const clearMutationMessages = () => {
    setTaskMutationError(null);
    setTaskMutationSuccess(null);
    setProjectMutationError(null);
    setProjectMutationSuccess(null);
    setEpicMutationError(null);
    setEpicMutationSuccess(null);
    setNoteMutationError(null);
    setNoteMutationSuccess(null);
    setError(null);
  };

  const viewTitles: Partial<Record<SidebarView, string>> = {
    settings: 'Settings',
    'sdk-docs': 'Documentation',
    'event-tracking': 'Event tracking',
    engagement: 'Engagement',
    prompts: 'Prompt library',
    playground: 'Playground',
    'sdk-integrations': 'SDK integrations',
    'sdk-integration-detail': activeIntegrationName || 'Integration',
    'semantic-intelligence': 'Intelligence',
  };
  const topbarTitle = viewTitles[activeView] ?? (activeProject ? activeProject.name : 'Projects');
  const selectedEpic = selectedEpicId ? epics.find(e => e.id === selectedEpicId) ?? null : null;

  return (
    <div className="flex h-screen overflow-hidden bg-olive-50 text-olive-900">
      {/* Inline feedback from project / epic / task mutations */}
      {allMutationMessages.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[9999] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
          {allMutationMessages.map((msg, i) => {
            const isError = /unable|error|fail/i.test(msg ?? '');
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl bg-olive-950 px-4 py-3 text-white shadow-xl ring-1 ring-black/10 animate-slideUp"
                role={isError ? 'alert' : 'status'}
              >
                <span className={`mt-0.5 shrink-0 ${isError ? 'text-red-300' : 'text-brand-300'}`}>
                  {isError ? <AlertCircle size={17} /> : <CheckCircle size={17} />}
                </span>
                <span className="flex-1 text-[13px] leading-5 text-white/90">{msg}</span>
                <button
                  aria-label="Dismiss"
                  className="shrink-0 -mr-1 rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                  onClick={clearMutationMessages}
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Sidebar
        activeView={activeView}
        selectedProjectView={selectedProjectView}
        allProjectsValue={ALL_PROJECTS_VALUE}
        onProjectSelect={handleProjectSelect}
        onViewChange={(view: SidebarView, targetTab?: string) => {
          if (view === 'dashboard') navigate('/dashboard');
          else if (view === 'semantic-intelligence') navigate('/intelligence');
          else if (view === 'prompts') navigate('/prompts');
          else if (view === 'playground') navigate('/playground');
          else if (view === 'event-tracking') navigate('/event-tracking');
          else if (view === 'engagement') navigate('/engagement');
          else if (view === 'sdk-integrations') navigate('/sdk-integrations');
          else if (view === 'sdk-integration-detail') {
            if (integrationId) {
              navigate(`/sdk-integrations/${integrationId}/${targetTab || 'overview'}`);
            }
          }
          else if (view === 'sdk-docs') navigate('/sdk-docs');
          else if (view === 'settings') navigate(targetTab === 'workspace' ? '/settings?tab=workspace' : '/settings');
        }}
        onNewProject={() => setIsProjectCreateModalOpen(true)}
        onLogout={handleLogout}
        user={{ name: user?.name || null, email: user?.email || '' }}
        activeIntegrationId={integrationId}
        activeIntegrationName={activeIntegrationName}
        activeIntegrationSandbox={activeIntegrationSandbox}
        activeTab={tab || 'overview'}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          title={topbarTitle}
          user={{ name: user?.name || null, email: user?.email || '' }}
          notifications={notifications}
          isNotificationsOpen={isNotificationsOpen}
          onNotificationsToggle={() => setIsNotificationsOpen(!isNotificationsOpen)}
          onNotificationsClose={() => setIsNotificationsOpen(false)}
          onMarkAsRead={handleMarkAsRead}
          onClearAll={handleClearAll}
          onNotificationClick={handleNotificationClick}
          breadcrumbs={
            activeView === 'sdk-integration-detail' ? (
              <button onClick={() => navigate('/sdk-integrations')} className="hover:text-olive-900 transition-colors" type="button">
                SDK integrations
              </button>
            ) : activeView === 'dashboard' && activeProject ? (
              <button onClick={() => handleProjectSelect(ALL_PROJECTS_VALUE)} className="hover:text-olive-900 transition-colors" type="button">
                Projects
              </button>
            ) : undefined
          }
          rightContent={
            <button
              aria-label="Toggle team chat"
              onClick={() => setIsChatPanelOpen(!isChatPanelOpen)}
              className={`btn btn-sm ${isChatPanelOpen ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5`}
              type="button"
            >
              <MessageCircle size={15} strokeWidth={1.75} />
              <span>Chat</span>
            </button>
          }
        />

        <main className="flex-1 overflow-hidden">
          {activeView === 'settings' ? (
            <div className="h-full overflow-y-auto">
              <div className=" px-8 pt-8 pb-16">
                <PageHeader
                  title="Settings"
                  description={settingsTab === 'workspace' ? 'Members, roles and what each person can do in this workspace.' : activeProject ? `Your account, plus AI configuration for ${activeProject.name}.` : 'Manage your profile, security, and AI provider keys.'}
                  actions={
                    <div className="flex items-center p-0.5 rounded-lg bg-olive-100 border border-olive-200/70" role="tablist">
                      {([['workspace', 'Workspace'], ['account', 'Account']] as const).map(([key, label]) => (
                        <button
                          aria-selected={settingsTab === key}
                          className={`h-8 px-3 rounded-md text-[13px] transition-colors ${settingsTab === key ? 'bg-white shadow-xs text-olive-950 font-medium' : 'text-olive-500 hover:text-olive-800'}`}
                          key={key}
                          onClick={() => navigate(key === 'workspace' ? '/settings?tab=workspace' : '/settings')}
                          role="tab"
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  }
                />
                <div className="mt-8">
                  {settingsTab === 'workspace' ? (
                    <WorkspaceSettings />
                  ) : (
                    <SettingsPanel
                      activeProject={activeProject}
                      onAiConfigChange={(enabled, provider) => {
                        setActiveProjectAiEnabled(enabled);
                        setActiveProjectAiProvider(provider);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : activeView === 'event-tracking' ? (
            <div className="h-full overflow-y-auto">
              <EventTrackingPage onOpenDocs={() => navigate('/sdk-docs')} />
            </div>
          ) : activeView === 'engagement' ? (
            <div className="h-full overflow-y-auto">
              <EngagementPage />
            </div>
          ) : activeView === 'sdk-integrations' ? (
            <div className="h-full overflow-y-auto">
              <SdkIntegrationsPage />
            </div>
          ) : activeView === 'sdk-integration-detail' ? (
            <div className="h-full overflow-y-auto">
              <SdkIntegrationDetailPage />
            </div>
          ) : activeView === 'prompts' ? (
            <div className="h-full overflow-y-auto">
              <RequirePermission feature="the prompt library" permission="library.access">
                <PromptLibraryPage workspaceId={activeWorkspaceId} />
              </RequirePermission>
            </div>
          ) : activeView === 'playground' ? (
            <div className="h-full overflow-y-auto">
              <RequirePermission feature="the playground" permission="library.access">
                <PromptPlaygroundPage workspaceId={activeWorkspaceId} />
              </RequirePermission>
            </div>
          ) : activeView === 'semantic-intelligence' ? (
            <div className="h-full overflow-y-auto">
              <RequirePermission feature="insights" permission="intelligence.view">
                <InsightsPage onOpenProject={(id: string) => handleProjectSelect(id)} />
              </RequirePermission>
            </div>
          ) : activeView === 'sdk-docs' ? (
            <div className="h-full overflow-y-auto">
              <div className=" px-8 pt-8 pb-16">
                <SdkDocsPanel />
              </div>
            </div>
          ) : !activeProject ? (
            <div className="h-full overflow-y-auto">
              <ProjectPanel
                actionProjectId={actionProjectId}
                currentPage={projectPage}
                loading={loading}
                onDeleteProject={handleDeleteProject}
                onDeleteProjects={handleDeleteProjects}
                onOpenCreateProject={() => setIsProjectCreateModalOpen(true)}
                onOpenAiPlanner={() => setIsAiPlanningWorkspaceOpen(true)}
                onOpenEpicManager={(project) => {
                  handleProjectSelect(project.id);
                }}
                onOpenProject={(projectId) => {
                  handleProjectSelect(projectId ?? ALL_PROJECTS_VALUE);
                }}
                onOpenUpdateProject={(project) => {
                  setEditingProject(project);
                }}
                projects={projects}
                totalPages={projectTotalPages}
                onPageChange={handleProjectPageChange}
                onSearch={handleProjectSearch}
                searchTerm={projectSearchTerm}
              />
            </div>
          ) : (
            /* Project workspace: epics · tasks · inspector */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="shrink-0 flex items-center justify-between gap-4 px-6 h-16 bg-white border-b border-olive-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 shrink-0">
                    <Folder size={17} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="relative flex items-center">
                      <select
                        aria-label="Switch project"
                        className="appearance-none bg-transparent border-none text-[17px] font-semibold text-olive-950 focus:outline-none focus:ring-0 cursor-pointer pr-6 m-0 p-0 tracking-tight max-w-[360px] truncate"
                        onChange={(e) => handleProjectSelect(e.target.value)}
                        value={activeProject.id}
                      >
                        {projects.map((project) => (
                          <option className="text-olive-950 bg-white text-sm font-normal" key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-0 text-olive-400" size={15} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-olive-500 mt-0.5">
                      <span>{activeProjectEpics.length} {activeProjectEpics.length === 1 ? 'epic' : 'epics'}</span>
                      <span className="text-olive-300">·</span>
                      <span>{visibleTasks.length} {visibleTasks.length === 1 ? 'task' : 'tasks'}</span>
                      <span className="text-olive-300">·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${activeProjectAiEnabled ? 'bg-brand-500' : 'bg-olive-300'}`} />
                        {activeProjectAiEnabled ? `AI · ${activeProjectAiProvider ? activeProjectAiProvider.charAt(0).toUpperCase() + activeProjectAiProvider.slice(1) : 'On'}` : 'AI off'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button className="btn btn-sm btn-ghost" onClick={() => handleOpenProjectNotesPanel(activeProject)} type="button">
                    <NotebookPen size={15} strokeWidth={1.75} />
                    Notes
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setIsProjectTeamModalOpen(true)} type="button">
                    <Users size={15} strokeWidth={1.75} />
                    Team
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setIsTimePanelOpen(true)} type="button">
                    <Clock size={15} strokeWidth={1.75} />
                    Time
                  </button>
                  {can('prompt.access') && (
                    <button className="btn btn-sm btn-ghost" onClick={() => setIsPromptsPanelOpen(true)} type="button">
                      <FileText size={15} strokeWidth={1.75} />
                      Prompts
                    </button>
                  )}
                  <button className="btn btn-sm btn-ghost" onClick={() => setIsActivityHistoryOpen(true)} type="button">
                    <History size={15} strokeWidth={1.75} />
                    Activity
                  </button>
                  <button
                    aria-pressed={isChatPanelOpen}
                    className={`btn btn-sm ${isChatPanelOpen ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setIsChatPanelOpen(!isChatPanelOpen)}
                    type="button"
                  >
                    <MessageCircle size={15} strokeWidth={1.75} />
                    Chat
                  </button>
                  <Menu
                    trigger={({ open, toggle }) => (
                      <button
                        aria-label="More project actions"
                        className={`btn btn-sm btn-secondary btn-icon !w-8 ${open ? 'bg-olive-100' : ''}`}
                        onClick={toggle}
                        type="button"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    )}
                    items={[
                      { label: 'Plan with AI', icon: Zap, onSelect: () => setIsAiPlanningWorkspaceOpen(true) },
                      { label: 'Project AI settings', icon: Bot, onSelect: () => setActiveView('settings') },
                      'divider',
                      {
                        label: isRecalculatingPriorities ? 'Recalculating…' : 'Recalculate priorities',
                        icon: Calculator,
                        disabled: isRecalculatingPriorities,
                        onSelect: () => void handleRecalculatePriorities()
                      },
                      { label: 'Refresh', icon: RefreshCw, onSelect: () => void loadDashboard() },
                      'divider',
                      { label: 'Edit project', icon: Edit3, onSelect: () => setEditingProject(activeProject) },
                    ]}
                  />
                </div>
              </div>

              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Epics */}
                <aside className={`flex flex-col shrink-0 h-full border-r border-olive-200 bg-white transition-[width] duration-300 ${isSidebarCollapsed ? 'w-12' : 'w-[248px]'}`}>
                  <div className={`flex items-center h-12 shrink-0 ${isSidebarCollapsed ? 'justify-center' : 'justify-between pl-4 pr-2'}`}>
                    {!isSidebarCollapsed && (
                      <h3 className="text-[13px] font-semibold text-olive-900 m-0">
                        Epics <span className="ml-1 font-normal text-olive-400">{activeProjectEpics.length}</span>
                      </h3>
                    )}
                    <div className="flex items-center">
                      {!isSidebarCollapsed && (
                        <button
                          aria-label="New epic"
                          className="icon-btn !w-7 !h-7"
                          disabled={!canManageActiveProject}
                          onClick={() => setIsEpicCreateModalOpen(true)}
                          title="New epic"
                          type="button"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                      <button
                        aria-label={isSidebarCollapsed ? 'Expand epics' : 'Collapse epics'}
                        className="icon-btn !w-7 !h-7"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        title={isSidebarCollapsed ? 'Expand epics' : 'Collapse epics'}
                        type="button"
                      >
                        {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                      </button>
                    </div>
                  </div>

                  {!isSidebarCollapsed && (
                    <div className="flex-1 overflow-y-auto px-2 pb-3 flex flex-col gap-0.5 custom-scrollbar">
                      <button
                        className={`flex items-center gap-2.5 h-9 px-2.5 rounded-md text-[13px] text-left transition-colors ${!selectedEpicId ? 'bg-olive-100 text-olive-950 font-medium' : 'text-olive-600 hover:bg-olive-50 hover:text-olive-900'}`}
                        onClick={() => handleEpicSelect(null)}
                        type="button"
                      >
                        <List size={15} strokeWidth={1.75} className="text-olive-400 shrink-0" />
                        <span className="flex-1">All tasks</span>
                        <span className="text-xs text-olive-400 tabular-nums">{visibleTasks.length}</span>
                      </button>

                      {activeProjectEpics.length > 0 && <div className="h-px bg-olive-100 my-1.5 mx-2" />}

                      {activeProjectEpics.map(epic => {
                        const isActive = selectedEpicId === epic.id;
                        const count = visibleTasks.filter(t => t.epicId === epic.id).length;
                        return (
                          <div
                            key={epic.id}
                            className={`group flex items-center gap-2.5 min-h-9 pl-2.5 pr-1 py-1.5 rounded-md cursor-pointer transition-colors ${isActive ? 'bg-brand-50 ring-1 ring-inset ring-brand-100' : 'hover:bg-olive-50'}`}
                            onClick={() => handleEpicSelect(isActive ? null : epic.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && handleEpicSelect(isActive ? null : epic.id)}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${epicStatusCls[epic.status] ?? 'bg-olive-300'}`} title={epic.status} />
                            <div className="flex-1 min-w-0">
                              <div className={`text-[13px] truncate ${isActive ? 'font-medium text-brand-900' : 'text-olive-800'}`}>{epic.name}</div>
                              <div className="text-[11px] text-olive-400 capitalize">{epic.status} · {count} {count === 1 ? 'task' : 'tasks'}</div>
                            </div>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              <button
                                aria-label="Epic notes"
                                className="icon-btn !w-6 !h-6"
                                onClick={(e) => { e.stopPropagation(); handleOpenEpicNotesPanel(epic); }}
                                title="Notes"
                                type="button"
                              >
                                <FileText size={13} />
                              </button>
                              <button
                                aria-label="Edit epic"
                                className="icon-btn !w-6 !h-6"
                                disabled={!canManageActiveProject}
                                onClick={(e) => { e.stopPropagation(); setEditingEpic(epic); }}
                                title="Edit"
                                type="button"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                aria-label="Delete epic"
                                className="icon-btn !w-6 !h-6 hover:!text-red-600 hover:!bg-red-50 disabled:opacity-30"
                                disabled={actionEpicId === epic.id || activeProject?.currentUserRole !== 'ADMIN'}
                                onClick={(e) => { e.stopPropagation(); handleDeleteEpic(epic.id); }}
                                title="Delete"
                                type="button"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {activeProjectEpics.length === 0 && (
                        <div className="mt-2 mx-1 rounded-lg border border-dashed border-olive-200 p-4 text-center">
                          <p className="text-xs text-olive-500 m-0 mb-2.5">Group related tasks into epics.</p>
                          <button
                            className="btn btn-sm btn-secondary"
                            disabled={!canManageActiveProject}
                            onClick={() => setIsEpicCreateModalOpen(true)}
                            type="button"
                          >
                            <Plus size={14} />
                            New epic
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </aside>

                {/* Tasks */}
                <section className="@container flex flex-col flex-1 min-w-0 h-full min-h-0 bg-olive-50/60 overflow-hidden">
                  <div className="shrink-0 px-6 pt-5 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold tracking-tight text-olive-950 m-0 truncate">
                          {selectedEpic ? selectedEpic.name : 'All tasks'}
                        </h2>
                        <p className="text-[13px] text-olive-500 m-0 mt-0.5">
                          {activeEpicTasks.length} {activeEpicTasks.length === 1 ? 'task' : 'tasks'}
                          {selectedEpic?.description ? <span className="text-olive-400"> — {selectedEpic.description}</span> : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center p-0.5 rounded-lg bg-olive-100 border border-olive-200/70" role="tablist" aria-label="Task view">
                          <button
                            aria-selected={viewMode === 'list'}
                            role="tab"
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] transition-colors ${viewMode === 'list' ? 'bg-white shadow-xs text-olive-900 font-medium' : 'text-olive-500 hover:text-olive-800'}`}
                            type="button"
                          >
                            <List size={14} />
                            List
                          </button>
                          <button
                            aria-selected={viewMode === 'kanban'}
                            role="tab"
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-xs text-olive-900 font-medium' : 'text-olive-500 hover:text-olive-800'}`}
                            type="button"
                          >
                            <Layout size={14} />
                            Board
                          </button>
                        </div>
                        <button
                          className="btn btn-primary"
                          disabled={!canManageActiveProject}
                          onClick={() => {
                            setTaskModalProjectId(selectedEpic?.projectId ?? activeProject?.id ?? null);
                            setIsTaskCreateModalOpen(true);
                          }}
                          type="button"
                        >
                          <Plus size={16} />
                          New task
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <SlaDashboard />
                    </div>
                    <div className="mt-3">
                      <TaskFilterBar
                        filters={taskFilters}
                        onFilterChange={setTaskFilters}
                        members={activeProjectMembers}
                        onClear={handleClearFilters}
                      />
                    </div>

                    {selectedTaskIds.length > 0 && (
                      <div className="mt-3 flex items-center justify-between gap-4 rounded-lg bg-olive-900 text-white pl-4 pr-2 py-2 animate-slideUp">
                        <div className="flex items-center gap-3 text-[13px]">
                          <span className="font-medium">{selectedTaskIds.length} selected</span>
                          <button
                            onClick={() => setSelectedTaskIds([])}
                            className="text-white/60 hover:text-white transition-colors"
                            type="button"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-white/60">Assign to</span>
                          <AssigneeSelector
                            projectId={activeProject?.id ?? null}
                            selectedUserId=""
                            onSelect={handleBulkAssign}
                            className="w-48"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`flex-1 min-h-0 ${viewMode === 'kanban' ? 'flex flex-col overflow-hidden' : 'overflow-auto custom-scrollbar'}`}>
                    {viewMode === 'list' ? (
                      <div className="px-6 pb-8">
                        <TaskList
                          actionTaskId={actionTaskId}
                          epics={epics}
                          onDelete={(taskId) => {
                            const task = tasks.find(t => t.id === taskId);
                            void handleDeleteTask(taskId, task?.title ?? 'this task');
                          }}
                          onEditTask={(task) => setEditingTask(task)}
                          onUpdateStatus={(task, status) => void handleUpdateTaskStatus(task, status, true)}
                          onUpdateEpic={(task, epicId) => void handleUpdateTaskEpic(task, epicId)}
                          projects={projects}
                          tasks={activeEpicTasks}
                          onSelectTask={(task) => setSelectedTaskId(task.id)}
                          onCommentTask={handleOpenTaskComments}
                          onToggleBlocked={handleToggleBlocked}
                          selectedTaskId={selectedTaskId}
                          selectedTaskIds={selectedTaskIds}
                          onToggleSelection={handleToggleTaskSelection}
                          loading={loading && tasks.length === 0}
                        />
                        {!loading && activeEpicTasks.length === 0 && (
                          <div className="card mt-2">
                            <EmptyState
                              description={selectedEpic ? 'Nothing is scheduled in this epic for the selected day.' : 'Nothing is scheduled for the selected day. Add a task or pick another date.'}
                              icon={Calendar}
                              title="No tasks for this day"
                              action={
                                canManageActiveProject ? (
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => {
                                      setTaskModalProjectId(selectedEpic?.projectId ?? activeProject?.id ?? null);
                                      setIsTaskCreateModalOpen(true);
                                    }}
                                    type="button"
                                  >
                                    <Plus size={14} />
                                    New task
                                  </button>
                                ) : undefined
                              }
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full min-h-0 flex flex-col">
                        <KanbanBoard
                          epics={epics}
                          projects={projects}
                          tasks={activeEpicTasks}
                          onUpdateStatus={async (taskId, status) => {
                            const task = tasks.find(t => t.id === taskId);
                            if (task) await handleUpdateTaskStatus(task, status, true);
                          }}
                          onSelectTask={(task) => setSelectedTaskId(task.id)}
                          onCommentTask={handleOpenTaskComments}
                          onToggleBlocked={handleToggleBlocked}
                          onDeleteTask={(taskId) => {
                            const task = tasks.find(t => t.id === taskId);
                            void handleDeleteTask(taskId, task?.title ?? 'this task');
                          }}
                          onEditTask={(task) => setEditingTask(task)}
                          loading={loading && tasks.length === 0}
                        />
                      </div>
                    )}
                  </div>
                </section>

                {/* Task inspector */}
                {selectedTaskId && activeTask && (
                  <aside className="flex flex-col w-[400px] shrink-0 h-full border-l border-olive-200 bg-white overflow-hidden animate-slideInRight z-10">
                    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className={`badge ${statusMeta(activeTask.status).badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta(activeTask.status).dot}`} />
                            {statusMeta(activeTask.status).label}
                          </span>
                          {activeTask.isBlocked && <span className="badge badge-red">Blocked</span>}
                        </div>
                        <h3 className="text-base font-semibold text-olive-950 m-0 leading-snug break-words">{activeTask.title}</h3>
                      </div>
                      <button
                        aria-label="Close details"
                        onClick={() => setSelectedTaskId(null)}
                        className="icon-btn shrink-0 -mr-1"
                        type="button"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {activeTask.description && (
                        <p className="px-5 m-0 text-[13px] leading-relaxed text-olive-600 whitespace-pre-wrap">{activeTask.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 px-5 mt-3">
                        <SourceBadge source={activeTask.source} />
                        <SlaIndicator task={activeTask} compact />
                      </div>

                      <div className="flex gap-2 px-5 mt-4">
                        <button className="btn btn-sm btn-secondary flex-1" onClick={() => handleOpenTaskNote(activeTask)} type="button">
                          <NotebookPen size={14} />
                          Work notes
                        </button>
                        <button
                          className={`btn btn-sm flex-1 ${activeTask.isBlocked ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => handleToggleBlocked(activeTask)}
                          type="button"
                        >
                          <AlertCircle size={14} />
                          {activeTask.isBlocked ? 'Unblock' : 'Mark blocked'}
                        </button>
                      </div>

                      {/* Subtasks / comments */}
                      <div className="flex gap-5 mt-5 px-5 border-b border-olive-200" role="tablist">
                        {(['subtasks', 'comments'] as const).map((key) => (
                          <button
                            key={key}
                            role="tab"
                            aria-selected={sidePanelTab === key}
                            onClick={() => setSidePanelTab(key)}
                            className={`relative pb-2.5 text-[13px] transition-colors ${sidePanelTab === key ? 'text-olive-950 font-medium' : 'text-olive-500 hover:text-olive-800'}`}
                            type="button"
                          >
                            {key === 'subtasks' ? 'Subtasks' : 'Comments'}
                            {key === 'subtasks' && activeTask.subtasks.length > 0 && (
                              <span className="ml-1.5 text-[11px] text-olive-400 tabular-nums">
                                {activeTask.subtasks.filter(st => st.status === 'DONE').length}/{activeTask.subtasks.length}
                              </span>
                            )}
                            {sidePanelTab === key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-brand-600 rounded-full" />}
                          </button>
                        ))}
                      </div>

                      <div className="px-5 py-4">
                        {sidePanelTab === 'subtasks' ? (
                          <div className="flex flex-col">
                            {activeTask.subtasks.map(subtask => {
                              const isEditingThisSubtask = editingSubtask?.task.id === activeTask.id && editingSubtask?.subtask.id === subtask.id;
                              return (
                                <div key={subtask.id} className="group py-2.5 border-b border-olive-100 last:border-b-0">
                                  <div className="flex items-start gap-3">
                                    <input
                                      aria-label={`Mark ${subtask.title} ${subtask.status === 'DONE' ? 'not done' : 'done'}`}
                                      checked={subtask.status === 'DONE'}
                                      className="mt-0.5 w-4 h-4 accent-brand-600 cursor-pointer rounded shrink-0"
                                      disabled={!activeTask.permissions.canUpdate}
                                      onChange={() => void handleUpdateSubtaskStatus(activeTask, subtask, subtask.status === 'DONE' ? 'TODO' : 'DONE')}
                                      type="checkbox"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <span className={`text-[13px] leading-snug ${subtask.status === 'DONE' ? 'text-olive-400 line-through' : 'text-olive-900'}`}>
                                          {subtask.title}
                                        </span>
                                        <select
                                          value={subtask.status}
                                          disabled={!activeTask.permissions.canUpdate}
                                          onChange={(e) => void handleUpdateSubtaskStatus(activeTask, subtask, e.target.value as TaskWorkflowStatus)}
                                          className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border border-olive-200 bg-olive-50 text-olive-700 hover:bg-olive-100 transition cursor-pointer"
                                          aria-label={`Status for ${subtask.title}`}
                                        >
                                          {TASK_WORKFLOW_STATUS_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                        {subtask.assignedToUser && (
                                          <UserAvatar name={subtask.assignedToUser.name} email={subtask.assignedToUser.email} size="sm" />
                                        )}
                                      </div>
                                      {!isEditingThisSubtask && subtask.description && (
                                        <p className="text-olive-500 text-xs leading-relaxed line-clamp-2 m-0 mt-0.5">{subtask.description}</p>
                                      )}
                                      {!isEditingThisSubtask && subtask.note && (
                                        <p className="flex items-center gap-1.5 m-0 mt-1 text-xs text-olive-500">
                                          <MessageSquare size={12} className="shrink-0 text-olive-400" />
                                          <span className="truncate">{subtask.note}</span>
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                      <button
                                        aria-label={isEditingThisSubtask ? 'Cancel editing' : 'Edit subtask'}
                                        className="icon-btn !w-7 !h-7 disabled:opacity-30"
                                        disabled={!activeTask.permissions.canUpdate}
                                        onClick={() => setEditingSubtask(isEditingThisSubtask ? null : { task: activeTask, subtask })}
                                        title={isEditingThisSubtask ? 'Cancel' : 'Edit'}
                                        type="button"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                      <button
                                        aria-label="Subtask note"
                                        className="icon-btn !w-7 !h-7"
                                        onClick={() => handleOpenSubtaskNote(activeTask, subtask)}
                                        title="Note"
                                        type="button"
                                      >
                                        <FileText size={14} />
                                      </button>
                                      <button
                                        aria-label="Delete subtask"
                                        className="icon-btn !w-7 !h-7 hover:!text-red-600 hover:!bg-red-50 disabled:opacity-30"
                                        disabled={!activeTask.permissions.canUpdate}
                                        onClick={() => void handleDeleteSubtask(activeTask, subtask.id)}
                                        title="Delete"
                                        type="button"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {isEditingThisSubtask && (
                                    <div className="mt-3 ml-7">
                                      <SubtaskInlineEdit
                                        subtask={subtask}
                                        onSave={(patch) => void handleUpdateSubtask(activeTask, subtask, patch)}
                                        onCancel={() => setEditingSubtask(null)}
                                        isSaving={actionTaskId === activeTask.id}
                                        members={activeProjectMembers}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {activeTask.subtasks.length === 0 && (
                              <p className="text-[13px] text-olive-500 m-0 py-2">No subtasks yet. Break this task into smaller steps.</p>
                            )}
                            <button
                              className="mt-2 self-start flex items-center gap-1.5 h-8 px-2 -ml-2 rounded-md text-[13px] text-olive-600 hover:text-olive-950 hover:bg-olive-100 transition-colors disabled:opacity-40"
                              disabled={!activeTask.permissions.canUpdate}
                              onClick={() => setSubtaskModalTask(activeTask)}
                              type="button"
                            >
                              <Plus size={15} />
                              Add subtask
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col min-h-[240px]">
                            <CommentSection taskId={activeTask.id} />
                          </div>
                        )}
                      </div>

                      {/* Timing & priority */}
                      <div className="px-5 pb-6">
                        <h4 className="section-label m-0 mb-2">Timing &amp; priority</h4>
                        <dl className="m-0 rounded-lg border border-olive-200 divide-y divide-olive-100 text-[13px]">
                          {[
                            ['Response due', formatDateTime(activeTask.slaResponseDueAt) ?? 'Not set'],
                            ['Resolution due', formatDateTime(activeTask.slaResolutionDueAt) ?? 'Not set'],
                            ['First response', formatDateTime(activeTask.firstResponseAt) ?? 'Pending'],
                            ['Completed', formatDateTime(activeTask.completedAt) ?? 'Pending'],
                            ['SLA paused', formatDateTime(activeTask.slaPausedAt) ?? 'No'],
                            ['Dynamic priority', `${activeTask.dynamicPriority} · ${activeTask.dynamicPriorityScore}`],
                            ['Impact', `${activeTask.impactScore} impact · ${activeTask.dependencyWeight} downstream`],
                          ].map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between gap-4 px-3 py-2">
                              <dt className="text-olive-500">{label}</dt>
                              <dd className="m-0 text-olive-900 text-right tabular-nums">{value}</dd>
                            </div>
                          ))}
                          {activeTask.priorityEscalationReason && (
                            <div className="px-3 py-2">
                              <dt className="text-olive-500">Escalation reason</dt>
                              <dd className="m-0 mt-0.5 text-olive-800">{activeTask.priorityEscalationReason}</dd>
                            </div>
                          )}
                        </dl>
                        <button
                          className="btn btn-sm btn-secondary w-full mt-2.5"
                          disabled={isEvaluatingPriority}
                          onClick={() => void handleEvaluatePriority(activeTask.id)}
                          type="button"
                        >
                          <Zap size={14} className="text-amber-500" />
                          {isEvaluatingPriority ? 'Evaluating…' : 'Evaluate priority'}
                        </button>

                        <ApprovalSection
                          projectId={activeTask.projectId || ''}
                          taskId={activeTask.id}
                          members={activeProjectMembers}
                        />
                      </div>
                    </div>
                  </aside>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals & Overlays */}
      {
        isProjectCreateModalOpen ? (
          <Modal onClose={() => setIsProjectCreateModalOpen(false)} title="New project">
            <ProjectForm onSubmit={handleCreateProject} />
          </Modal>
        ) : null
      }
      {
        isAiPlanningWorkspaceOpen ? (
          <AiProjectPlanModal
            isOpen={isAiPlanningWorkspaceOpen}
            onClose={() => setIsAiPlanningWorkspaceOpen(false)}
            onProjectCreated={() => {
              setIsAiPlanningWorkspaceOpen(false);
              void loadDashboard();
            }}
          />
        ) : null
      }
      {
        isChatPanelOpen ? (
          <>
            {/* Chat Drawer Backdrop */}
            <div
              className="fixed inset-0 bg-olive-950/30 z-[2000] animate-fadeIn"
              onClick={() => setIsChatPanelOpen(false)}
            />
            {/* Chat Drawer Container */}
            <div className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-white z-[5001] shadow-2xl animate-slideInRight overflow-hidden border-l border-olive-200 flex flex-col">
              <ChatPanel
                project={activeProject}
                members={activeProjectMembers}
                isOpen={isChatPanelOpen}
                onClose={() => setIsChatPanelOpen(false)}
              />
            </div>
          </>
        ) : null
      }
      {
        editingProject ? (
          <Modal onClose={() => setEditingProject(null)} title="Edit project">
            <ProjectForm initialDescription={editingProject.description} initialName={editingProject.name} onSubmit={handleUpdateProject} submitLabel="Update project" />
          </Modal>
        ) : null
      }
      {
        isEpicCreateModalOpen && activeProject ? (
          <Modal onClose={() => setIsEpicCreateModalOpen(false)} title="New epic" description={activeProject.name}>
            <EpicForm onSubmit={handleCreateEpic} submitLabel="Create epic" />
          </Modal>
        ) : null
      }
      {
        editingEpic && activeProject ? (
          <Modal onClose={() => setEditingEpic(null)} title="Edit epic" description={activeProject.name}>
            <EpicForm
              initialDescription={editingEpic.description}
              initialName={editingEpic.name}
              initialStatus={editingEpic.status}
              onSubmit={handleUpdateEpic}
              submitLabel="Update epic"
            />
          </Modal>
        ) : null
      }
      {
        isTaskCreateModalOpen ? (
          <Modal onClose={() => setIsTaskCreateModalOpen(false)} title="New task">
            <AddTaskForm
              epics={epics}
              initialProjectId={taskModalProjectId}
              initialEpicId={selectedEpicId}
              onCreateTask={handleCreateTask}
              projects={projects}
            />
          </Modal>
        ) : null
      }
      {
        isProjectTeamModalOpen && activeProject ? (
          <Modal
            bodyClassName="!p-0"
            onClose={() => setIsProjectTeamModalOpen(false)}
            maxWidth="max-w-[640px]"
            title="Team" description={activeProject.name}
          >
            <ProjectTeamPanel
              canManageTeam={canManageTeam}
              currentUserId={user?.id ?? null}
              isMutating={teamMutationLoading}
              members={activeProjectMembers}
              projectId={activeProject.id}
              onInviteMember={handleInviteProjectMember}
              onRemoveMember={handleRemoveProjectMember}
              onLeaveProject={handleLeaveProject}
            />
          </Modal>
        ) : null
      }
      {isTimePanelOpen && activeProject && (
        <ProjectTimePanel
          members={activeProjectMembers}
          onClose={() => setIsTimePanelOpen(false)}
          projectId={activeProject.id}
          projectName={activeProject.name}
          tasks={tasks.filter((t) => t.projectId === activeProject.id).map((t) => ({ id: t.id, title: t.title }))}
        />
      )}
      {isPromptsPanelOpen && activeProject && (
        <ProjectPromptsPanel
          members={activeProjectMembers}
          onClose={() => setIsPromptsPanelOpen(false)}
          projectId={activeProject.id}
          projectName={activeProject.name}
        />
      )}
      {
        isActivityHistoryOpen && activeProject ? (
          <Modal
            bodyClassName="!p-0"
            onClose={() => setIsActivityHistoryOpen(false)}
            maxWidth="max-w-[680px]"
            title="Activity" description={activeProject.name}
          >
            <ActivityHistoryPanel
              projectId={activeProject.id}
              projectName={activeProject.name}
            />
          </Modal>
        ) : null
      }

      {
        isProjectNotesModalOpen && activeProjectForNotes ? (
          <Modal onClose={() => setIsProjectNotesModalOpen(false)} title={activeProjectNotesModalTitle}>
            <ProjectNotes
              actionNoteId={actionNoteId}
              heading="Project notes"
              loading={activeProjectForNotes != null && notesLoadingKey === `project:${activeProjectForNotes.id}`}
              notes={activeProjectNotes}
              onCreateNote={() => activeProjectForNotes && handleOpenCreateProjectNote(activeProjectForNotes)}
              onDeleteNote={activeProjectForNotes.currentUserRole === 'ADMIN'
                ? (note) => void handleDeleteNote(note)
                : undefined}
              onOpenNote={(note) => void handleOpenExistingNote(note)}
            />
          </Modal>
        ) : null
      }
      {
        isEpicNotesModalOpen && activeEpicForNotes ? (
          <Modal onClose={() => setIsEpicNotesModalOpen(false)} title={activeEpicNotesModalTitle}>
            <ProjectNotes
              actionNoteId={actionNoteId}
              createLabel="Create epic note"
              emptyDescription="Create the first note to capture decisions, references, or follow-ups for this epic."
              emptyTitle="No epic notes yet"
              heading="Epic notes"
              loading={notesLoadingKey === `epic:${activeEpicForNotes.id}`}
              notes={activeEpicNotes}
              onCreateNote={projects.find((project) => project.id === activeEpicForNotes.projectId)?.currentUserRole === 'ADMIN'
                ? () => handleOpenCreateEpicNote(activeEpicForNotes)
                : undefined}
              onDeleteNote={projects.find((project) => project.id === activeEpicForNotes.projectId)?.currentUserRole === 'ADMIN'
                ? (note) => void handleDeleteNote(note)
                : undefined}
              onOpenNote={(note) => void handleOpenExistingNote(note)}
            />
          </Modal>
        ) : null
      }
      {
        editingTask ? (
          <Modal onClose={() => setEditingTask(null)} title="Edit task" description={editingTask.title}>
            <EditTaskForm
              epics={epics}
              allTasks={tasks}
              onSubmit={handleUpdateTask}
              projects={projects}
              task={editingTask}
            />
          </Modal>
        ) : null
      }
      {
        subtaskModalTask ? (
          <Modal
            onClose={() => setSubtaskModalTask(null)}
            title="Add subtasks" description={subtaskModalTask.title}
          >
            <SubtaskForm members={activeProjectMembers} onSubmit={handleCreateSubtask} />
          </Modal>
        ) : null
      }
      {
        activeNoteEditor ? (
          <NoteModal
            allowAppend={(activeNoteEditor.kind === 'project' || activeNoteEditor.kind === 'epic') && activeNoteEditor.note != null}
            allowDelete={
              activeNoteEditor.kind === 'project' || activeNoteEditor.kind === 'epic'
                ? activeNoteEditor.note != null
                : activeNoteEditor.kind === 'task'
                  ? Boolean(activeNoteEditor.task.note?.trim())
                  : Boolean(activeNoteEditor.subtask.note?.trim())
            }
            deleteLabel={
              activeNoteEditor.kind === 'project'
                ? 'Delete note'
                : activeNoteEditor.kind === 'epic'
                  ? 'Delete note'
                  : activeNoteEditor.kind === 'task'
                    ? 'Clear notes'
                    : 'Clear note'
            }
            entityLabel={
              activeNoteEditor.kind === 'project'
                ? activeNoteEditor.projectName
                : activeNoteEditor.kind === 'epic'
                  ? activeNoteEditor.epicName
                  : activeNoteEditor.kind === 'task'
                    ? activeNoteEditor.task.title
                    : `${activeNoteEditor.task.title} / ${activeNoteEditor.subtask.title}`
            }
            modalTitle={
              activeNoteEditor.kind === 'project'
                ? activeNoteEditor.note
                  ? 'Edit project note'
                  : 'New project note'
                : activeNoteEditor.kind === 'epic'
                  ? activeNoteEditor.note
                    ? 'Edit epic note'
                    : 'New epic note'
                  : activeNoteEditor.kind === 'task'
                    ? activeNoteEditor.task.note?.trim()
                      ? 'Edit work notes'
                      : 'Work notes'
                    : activeNoteEditor.subtask.note?.trim()
                      ? 'Edit subtask note'
                      : 'Subtask note'
            }
            note={
              activeNoteEditor.kind === 'project'
                ? activeNoteEditor.note
                : activeNoteEditor.kind === 'epic'
                  ? activeNoteEditor.note
                  : activeNoteEditor.kind === 'task'
                    ? { title: '', content: activeNoteEditor.task.note ?? '' }
                    : { title: '', content: activeNoteEditor.subtask.note ?? '' }
            }
            onClose={() => {
              setActiveNoteEditor(null);
            }}
            onDelete={
              activeNoteEditor.kind === 'project' || activeNoteEditor.kind === 'epic'
                ? activeNoteEditor.note
                  ? () => void handleDeleteNote(activeNoteEditor.note as Note)
                  : undefined
                : () => void handleDeleteInlineNote()
            }
            onSave={handleSaveNote}
            showTitle={activeNoteEditor.kind === 'project' || activeNoteEditor.kind === 'epic'}
            titlePlaceholder="Sprint recap"
          />
        ) : null
      }
      {priorityEvaluationModalOpen && priorityEvaluationResult && (
        <Modal onClose={() => setPriorityEvaluationModalOpen(false)} title="Priority evaluation">
          <dl className="m-0 rounded-lg border border-olive-200 divide-y divide-olive-100 text-[13px]">
            {[
              ['Base priority', priorityEvaluationResult.basePriority],
              ['Dynamic priority', priorityEvaluationResult.dynamicPriority],
              ['Dynamic score', priorityEvaluationResult.dynamicPriorityScore],
              ['Urgency / impact', `${priorityEvaluationResult.urgencyScore} / ${priorityEvaluationResult.impactScore}`],
              ['Downstream impact', `${priorityEvaluationResult.downstreamTaskCount} tasks (${priorityEvaluationResult.dependencyWeight} weight)`],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between gap-4 px-3 py-2">
                <dt className="text-olive-500">{label}</dt>
                <dd className="m-0 font-medium text-olive-900 tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h4 className="section-label m-0 mb-1.5">Reasoning</h4>
            <p className="text-[13px] leading-relaxed text-olive-700 m-0">{priorityEvaluationResult.reason}</p>
          </div>
          <div className="flex justify-end">
            <button className="btn btn-secondary" onClick={() => setPriorityEvaluationModalOpen(false)} type="button">
              Done
            </button>
          </div>
        </Modal>
      )}

    </div >
  );
}

export default DashboardPage;
