import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

import api from '@/services/api';
import AddTaskForm from '@/components/AddTaskForm';
import DateNavigator from '@/components/DateNavigator';
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
import SemanticIntelligencePage from '@/pages/SemanticIntelligencePage';
import EngagementPage from '@/pages/EngagementPage';
import SdkIntegrationsPage from '@/pages/SdkIntegrationsPage';
import SdkIntegrationDetailPage from '@/pages/SdkIntegrationDetailPage';
import PromptLibraryPage from '@/pages/PromptLibraryPage';
import PromptPlaygroundPage from '@/pages/PromptPlaygroundPage';
import { workspaceService } from '@/services/workspaces';
import { getIntegration } from '@/lib/sdk-integrations/api';
import Sidebar, { SidebarView } from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import InvitationNotificationPanel from '@/components/InvitationNotificationPanel';
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
  Bot
} from 'lucide-react';
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

function DashboardPage(): JSX.Element {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId, epicId, integrationId, tab } = useParams();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate);
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

  // Universal auto-dismiss for all feedback alerts
  useEffect(() => {
    const feedbackStates = [
      { value: taskMutationSuccess, setter: setTaskMutationSuccess },
      { value: taskMutationError, setter: setTaskMutationError },
      { value: projectMutationSuccess, setter: setProjectMutationSuccess },
      { value: projectMutationError, setter: setProjectMutationError },
      { value: epicMutationSuccess, setter: setEpicMutationSuccess },
      { value: epicMutationError, setter: setEpicMutationError },
      { value: noteMutationSuccess, setter: setNoteMutationSuccess },
      { value: noteMutationError, setter: setNoteMutationError },
      { value: error, setter: setError }
    ];

    const timers = feedbackStates
      .filter(s => s.value !== null)
      .map(s => setTimeout(() => s.setter(null), 5000));

    return () => timers.forEach(clearTimeout);
  }, [
    taskMutationSuccess, taskMutationError,
    projectMutationSuccess, projectMutationError,
    epicMutationSuccess, epicMutationError,
    noteMutationSuccess, noteMutationError,
    error
  ]);

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
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const list = await workspaceService.listWorkspaces();
        if (list && list.length > 0) {
          const wsId = list[0].id || (list[0] as { id?: string; _id?: string })._id;
          if (wsId) {
            setActiveWorkspaceId(wsId);
          }
        }
      } catch (err) {
        console.error('Failed to load user workspace', err);
      }
    };
    void fetchWorkspace();
  }, []);

  useEffect(() => {
    const fetchIntegrationDetails = async () => {
      if (integrationId) {
        try {
          const data = await getIntegration(integrationId);
          setActiveIntegrationName(data.name);
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
    setLoading(true);
    setError(null);

    try {
      const [taskList, projectData] = await Promise.all([
        getTasks(
          selectedDate,
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
  }, [selectedDate, projectPage, debouncedProjectSearchTerm, taskFilters.assigneeId, debouncedTaskSearchTerm]);

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
      date: selectedDate,
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

  const handleUpdateSubtask = async (
    task: Task,
    targetSubtask: Task['subtasks'][number],
    patch: { title: string; description?: string; note?: string; assignedToUserId?: string | null }
  ): Promise<void> => {
    setActionTaskId(task.id);
    setTaskMutationError(null);
    setTaskMutationSuccess(null);

    try {
      const subtasks = task.subtasks.map((subtask) => (
        subtask.id === targetSubtask.id
          ? {
            ...subtask,
            title: patch.title.trim(),
            description: patch.description?.trim(),
            note: patch.note?.trim(),
            assignedToUserId: patch.assignedToUserId
          }
          : subtask
      ));

      await updateTask(task.id, { status: task.status as TaskWorkflowStatus, subtasks });
      await loadDashboard();
      setTaskMutationSuccess('Subtask updated.');
      setEditingSubtask(null);
    } catch {
      setTaskMutationError('Unable to update the subtask.');
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
      if (subtask.id !== targetSubtask.id) {
        return subtask;
      }

      return {
        ...subtask,
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
      // We don't strictly need to reload everything if optimistic update is correct, 
      // but loadDashboard ensures project/epic sync if they depend on task status.
      await loadDashboard();
      setTaskMutationSuccess('Subtask updated.');
    } catch (err) {
      setTasks(previousTasks); // Rollback
      setTaskMutationError('Unable to update the subtask.');
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
      title: 'Delete Note',
      message: `Delete note "${note.title}"?`,
      confirmText: 'Delete Note',
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
      title: 'Delete Note',
      message: `Delete ${label}?`,
      confirmText: 'Delete Note',
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
  const tasksHeading = useMemo(() => {
    if (selectedProjectView === ALL_PROJECTS_VALUE) {
      return `All tasks for ${selectedDate}`;
    }

    return `${activeProject?.name ?? 'Project'} tasks for ${selectedDate}`;
  }, [activeProject?.name, selectedDate, selectedProjectView]);
  const activeProjectEpics = useMemo(
    () =>
      activeProject == null
        ? []
        : epics
          .filter((epic) => epic.projectId === activeProject.id)
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
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your account?',
      confirmText: 'LOGOUT',
      type: 'danger'
    });

    if (isConfirmed) {
      logout();
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
    if (!selectedEpicId) return [];
    return visibleTasks.filter(t => t.epicId === selectedEpicId);
  }, [selectedEpicId, visibleTasks]);

  const activeTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find(t => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasks]);

  const statusPillCls: Record<string, string> = {
    planned: 'bg-olive-500/20 text-olive-300',
    active: 'bg-amber-500/20 text-amber-300',
    completed: 'bg-emerald-500/20 text-emerald-300',
    archived: 'bg-olive-500/20 text-olive-400',
  };

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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100  text-slate-900  transition-colors duration-250">
      {/* Toast Notification */}
      {allMutationMessages.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
          {allMutationMessages.map((msg, i) => (
            <div
              key={i}
              className={`px-4 py-2.5 rounded-lg shadow-lg border text-sm font-medium animate-in fade-in slide-in-from-top-4 ${msg?.toLowerCase().includes('unable') || msg?.toLowerCase().includes('error')
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{msg}</span>
                <button
                  className="opacity-50 hover:opacity-100 transition-opacity"
                  onClick={() => {
                    // Clear all for now to keep it simple, or specific ones if needed
                    setTaskMutationError(null);
                    setTaskMutationSuccess(null);
                    setProjectMutationError(null);
                    setProjectMutationSuccess(null);
                    setEpicMutationError(null);
                    setEpicMutationSuccess(null);
                    setNoteMutationError(null);
                    setNoteMutationSuccess(null);
                    setError(null);
                  }}
                >
                  <Plus className="rotate-45" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Sidebar */}
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
          else if (view === 'settings') navigate('/settings');
        }}
        onNewProject={() => setIsProjectCreateModalOpen(true)}
        onLogout={handleLogout}
        activeIntegrationId={integrationId}
        activeIntegrationName={activeIntegrationName}
        activeTab={tab || 'overview'}
      />

      {/* Right side wrapper */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <Topbar
          title={activeView === 'settings'
            ? 'Settings'
            : activeView === 'sdk-docs'
              ? 'SDK Documentation'
              : activeView === 'event-tracking'
                ? 'Event Tracking'
                : activeView === 'engagement'
                  ? 'Engagement'
                  : activeView === 'prompts'
                    ? 'Prompt Library'
                    : activeView === 'playground'
                      ? 'Prompt Playground'
                      : activeView === 'sdk-integrations'
                        ? 'SDK Integrations'
                        : activeView === 'semantic-intelligence'
                          ? 'Semantic Intelligence'
                          : (activeProject ? activeProject.name : 'All Projects')}
          user={{ name: user?.name || null, email: user?.email || '' }}
          notifications={notifications}
          isNotificationsOpen={isNotificationsOpen}
          onNotificationsToggle={() => setIsNotificationsOpen(!isNotificationsOpen)}
          onNotificationsClose={() => setIsNotificationsOpen(false)}
          onMarkAsRead={handleMarkAsRead}
          onClearAll={handleClearAll}
          onNotificationClick={handleNotificationClick}
          breadcrumbs={
            <>
              <button
                onClick={() => handleProjectSelect(ALL_PROJECTS_VALUE)}
                className="hover:text-slate-600  transition-colors"
                type="button"
              >
                Dashboard
              </button>

              <span className="text-slate-300 ">/</span>

              {activeView === 'settings' ? (
                <span className="text-slate-600 ">Settings</span>
              ) : activeView === 'sdk-docs' ? (
                <span className="text-slate-600 ">SDK Documentation</span>
              ) : activeView === 'event-tracking' ? (
                <span className="text-slate-600 ">Event Tracking</span>
              ) : activeView === 'engagement' ? (
                <span className="text-slate-600 ">Engagement</span>
              ) : activeView === 'sdk-integrations' ? (
                <span className="text-slate-600 ">SDK Integrations</span>
              ) : activeView === 'sdk-integration-detail' ? (
                <>
                  <button
                    onClick={() => navigate('/sdk-integrations')}
                    className="hover:text-slate-600  transition-colors"
                    type="button"
                  >
                    SDK Integrations
                  </button>
                  <span className="text-slate-300 ">/</span>
                  <span className="text-slate-600 ">Integration Detail</span>
                </>
              ) : activeView === 'prompts' ? (
                <span className="text-slate-600 ">Prompt Library</span>
              ) : activeView === 'playground' ? (
                <span className="text-slate-600 ">Prompt Playground</span>
              ) : activeView === 'semantic-intelligence' ? (
                <span className="text-slate-600 ">Semantic Intelligence</span>
              ) : activeProject ? (
                <>
                  <button
                    onClick={() => handleProjectSelect(ALL_PROJECTS_VALUE)}
                    className="hover:text-slate-600  transition-colors"
                    type="button"
                  >
                    Projects
                  </button>
                  <span className="text-slate-300 ">/</span>
                  <span className="text-slate-600 ">{activeProject.name}</span>
                  {activeProjectAiEnabled ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200/50 uppercase tracking-wider font-bold text-[11px] select-none ml-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      AI ({activeProjectAiProvider ? activeProjectAiProvider.toUpperCase() : ''})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200/50 uppercase tracking-wider font-bold text-[11px] select-none ml-1.5">
                      AI (FALLBACK)
                    </span>
                  )}
                </>
              ) : (
                <span className="text-olive-600 ">All Projects</span>
              )}
            </>
          }
          rightContent={
            <div className="flex items-center gap-3">
              <InvitationNotificationPanel />
              {activeView !== 'settings' && (
                <div className="mr-2">
                  <DateNavigator date={selectedDate} disabled={loading} onChange={setSelectedDate} />
                </div>
              )}
            </div>
          }
        />

        {/* Main */}
        <main className="flex-1 overflow-hidden">
          {activeView === 'settings' ? (
            <div className="h-full overflow-y-auto">
              <div className="px-8 py-6 border-b border-olive-200  bg-white/60 ">
                <h3 className="text-xl font-semibold text-olive-950  m-0">Settings</h3>
                <p className="text-olive-500  m-0 text-sm mt-0.5">Account &amp; Preferences</p>
              </div>
              <div className="p-8">
                <SettingsPanel
                  activeProject={activeProject}
                  onAiConfigChange={(enabled, provider) => {
                    setActiveProjectAiEnabled(enabled);
                    setActiveProjectAiProvider(provider);
                  }}
                />
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
            <div className="h-full overflow-y-auto bg-slate-950">
              <PromptLibraryPage workspaceId={activeWorkspaceId} />
            </div>
          ) : activeView === 'playground' ? (
            <div className="h-full overflow-y-auto">
              <PromptPlaygroundPage workspaceId={activeWorkspaceId} />
            </div>
          ) : activeView === 'semantic-intelligence' ? (
            <div className="h-full overflow-y-auto">
              <SemanticIntelligencePage
                allProjectsValue={ALL_PROJECTS_VALUE}
                projects={projects}
                selectedProjectId={selectedProjectView}
              />
            </div>
          ) : activeView === 'sdk-docs' ? (
            <div className="h-full overflow-y-auto">
              <div className="px-8 py-6 border-b border-olive-200  bg-white/60 ">
                <h3 className="text-xl font-semibold text-olive-950  m-0">SDK Documentation</h3>
                <p className="text-olive-500  m-0 text-sm mt-0.5">Integration Guide &amp; API Reference</p>
              </div>
              <div className="p-3">
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
            /* 3-column workspace */
            <div className="flex flex-col h-full overflow-hidden bg-white ">
              <div className="shrink-0 px-6 py-5 border-b border-olive-200/80  bg-white/78  ">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-olive-600 text-white shadow-lg shadow-olive-500/25 shrink-0">
                      <Folder size={20} />
                    </div>
                    <div className="grid gap-1">
                      <div className="relative flex items-center">
                        <select
                          className="appearance-none bg-transparent border-none text-[1.35rem] font-bold text-olive-950  focus:outline-none focus:ring-0 cursor-pointer pr-6 m-0 p-0 tracking-tight"
                          onChange={(e) => handleProjectSelect(e.target.value)}
                          value={activeProject.id}
                        >
                          {projects.map((project) => (
                            <option
                              className="text-olive-950  bg-white  text-base font-normal"
                              key={project.id}
                              value={project.id}
                            >
                              {project.name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
                          <ChevronDown className="text-olive-500 " size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      className="flex items-center gap-2 px-3.5 py-2.5 bg-olive-700 border border-olive-700 rounded-lg text-sm font-semibold text-white hover:bg-olive-800 shadow-sm transition-colors"
                      onClick={() => setIsAiPlanningWorkspaceOpen(true)}
                      type="button"
                    >
                      <Zap size={16} />
                      AI Planner
                    </button>
                    <button
                      className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-olive-200 rounded-lg text-sm font-medium text-olive-600 hover:bg-olive-50 shadow-sm transition-colors"
                      onClick={() => setActiveView('settings')}
                      type="button"
                    >
                      <Bot size={16} />
                      AI Settings
                    </button>
                    <button
                      className="flex items-center gap-2 px-3.5 py-2.5 bg-white  border border-olive-200  rounded-lg text-sm font-medium text-olive-600  hover:bg-olive-50  shadow-sm transition-colors"
                      onClick={() => handleOpenProjectNotesPanel(activeProject)}
                      type="button"
                    >
                      <MessageSquare size={16} />
                      Project Notes
                    </button>
                    <button
                      className={[
                        'flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold shadow-sm transition-all duration-300 transform active:scale-95',
                        isChatPanelOpen
                          ? 'bg-gradient-to-r from-olive-600 to-olive-600 border-olive-600 text-white shadow-olive-500/25'
                          : 'bg-white border-olive-200 text-olive-600 hover:border-olive-400 hover:text-olive-600'
                      ].join(' ')}
                      onClick={() => setIsChatPanelOpen(!isChatPanelOpen)}
                      type="button"
                    >
                      <MessageCircle size={18} className={isChatPanelOpen ? 'text-white' : 'text-olive-500'} />
                      Chat
                    </button>
                    <button
                      className="flex items-center gap-2 px-3.5 py-2.5 bg-white  border border-olive-200  rounded-lg text-sm font-medium text-olive-600  hover:bg-olive-50  shadow-sm transition-colors"
                      onClick={() => setIsProjectTeamModalOpen(true)}
                      type="button"
                    >
                      <Users size={16} />
                      Team
                    </button>
                    <button
                      className="flex items-center gap-2 px-3.5 py-2.5 bg-white  border border-olive-200  rounded-lg text-sm font-medium text-olive-600  hover:bg-olive-50  shadow-sm transition-colors"
                      onClick={() => setIsActivityHistoryOpen(true)}
                      type="button"
                    >
                      <History size={16} />
                      History
                    </button>
                    <button
                      className="group flex items-center gap-2 px-3.5 py-2.5 bg-white border border-olive-200 rounded-lg text-sm font-medium text-olive-600 hover:bg-olive-50 shadow-sm transition-colors disabled:opacity-50"
                      disabled={isRecalculatingPriorities}
                      onClick={() => void handleRecalculatePriorities()}
                      type="button"
                    >
                      <Calculator size={16} className={isRecalculatingPriorities ? "animate-pulse text-olive-800" : ""} />
                      {isRecalculatingPriorities ? 'Recalculating...' : 'Recalculate Priority'}
                    </button>
                    <button
                      className="group flex items-center gap-2 px-3.5 py-2.5 bg-white  border border-olive-200  rounded-lg text-sm font-medium text-olive-600  hover:bg-olive-50  shadow-sm transition-colors disabled:opacity-50"
                      onClick={() => void loadDashboard()}
                      type="button"
                    >
                      <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 min-h-0 overflow-hidden gap-4 p-4 bg-olive-50 ">
                {/* Column 1 — Epics (Sidebar) */}
                <div className={`flex flex-col shrink-0 h-full rounded-md border border-olive-200/60  bg-white/70  backdrop-blur-xl shadow-sm overflow-hidden transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'w-14' : 'w-[300px]'}`}>
                  <div className={`flex items-center justify-between px-5 py-6 border-b border-olive-100  bg-linear-to-b from-white/50 to-transparent  ${isSidebarCollapsed ? 'flex-col gap-4' : ''}`}>
                    {!isSidebarCollapsed && (
                      <div className="animate-in fade-in duration-500">
                        <span className="text-[11px] uppercase tracking-[0.2em] font-black text-olive-600  opacity-80">Infrastructure</span>
                        <h3 className="text-[1rem] font-bold font-sans text-olive-950  m-0 mt-1 tracking-tight">Epics</h3>
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
                      {!isSidebarCollapsed && (
                        <button
                          className="flex items-center justify-center w-9 h-9 bg-olive-900  hover:bg-olive-800  text-white rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-40"
                          disabled={!canManageActiveProject}
                          onClick={() => setIsEpicCreateModalOpen(true)}
                          title="New Epic"
                          type="button"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                      <button
                        className="flex items-center justify-center w-9 h-9 hover:bg-olive-100  text-olive-400 hover:text-olive-600  rounded-lg transition-all"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                      >
                        {isSidebarCollapsed ? <Layout size={18} /> : <List size={18} />}
                      </button>
                    </div>
                  </div>

                  {!isSidebarCollapsed && (
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar animate-in fade-in slide-in-from-left-4 duration-500">
                      {activeProjectEpics.map(epic => {
                        const isActive = selectedEpicId === epic.id;
                        return (
                          <div
                            key={epic.id}
                            className={`relative flex flex-col gap-3 p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${isActive
                              ? 'bg-olive-50/80  border-olive-400/60  ring-1 ring-olive-500/10'
                              : 'bg-white/50  border-olive-200/80  hover:border-olive-300  hover:-tranolive-y-[2px]'
                              }`}
                            onClick={() => handleEpicSelect(isActive ? null : epic.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h4 className={`text-[0.9rem] font-bold m-0 leading-tight transition-colors ${isActive ? 'text-olive-950' : 'text-olive-950'}`}>
                                {epic.name}
                              </h4>
                              <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${statusPillCls[epic.status] ?? 'bg-olive-100 text-olive-600 border-olive-200'}`}>
                                {epic.status}
                              </span>
                            </div>

                            {/* Action Toolbar — Contextual */}
                            <div className="flex items-center gap-1 mt-1 opacity-60 hover:opacity-100 transition-opacity">
                              <button
                                className="p-1 rounded hover:bg-olive-100  text-olive-400 hover:text-olive-600 transition-colors"
                                onClick={(e) => { e.stopPropagation(); handleOpenEpicNotesPanel(epic); }}
                                title="Notes"
                              >
                                <FileText size={12} />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-olive-100  text-olive-400 hover:text-olive-600 transition-colors disabled:opacity-40"
                                disabled={!canManageActiveProject}
                                onClick={(e) => { e.stopPropagation(); setEditingEpic(epic); }}
                                title="Edit"
                              >
                                <Edit3 size={12} />
                              </button>
                              <div className="flex-1" />
                              <button
                                className="p-1 rounded hover:bg-red-50  text-olive-400 hover:text-red-500 transition-colors disabled:opacity-40"
                                disabled={actionEpicId === epic.id || activeProject?.currentUserRole !== 'ADMIN'}
                                onClick={(e) => { e.stopPropagation(); handleDeleteEpic(epic.id); }}
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {activeProjectEpics.length === 0 && (
                        <div className="py-10 text-center opacity-40">
                          <EmptyState description="Create an epic to group your tasks." icon={List} title="No epics" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Column 2 — Main Workspace (Tasks) */}
                <div className={`flex flex-col flex-1 min-w-0 h-full rounded-md border border-olive-200/60  bg-white/50  backdrop-blur-xl shadow-md overflow-hidden transition-[opacity,filter,background-color] duration-500 ${!selectedEpicId ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                  {selectedEpicId ? (
                    <>
                      <div className="flex items-center justify-between px-6 py-6 border-b border-olive-100  bg-linear-to-b from-white/50 to-transparent ">
                        <div>
                          <span className="text-[11px] uppercase tracking-[0.2em] font-black text-olive-600  opacity-80">Execution</span>
                          <h3 className="text-[1.1rem] font-bold font-sans text-olive-950  m-0 mt-1 tracking-tight">{tasksHeading}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-olive-500  text-[0.78rem] truncate max-w-[200px]">
                              {epics.find(e => e.id === selectedEpicId)?.name}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-olive-300 " />
                            <span className="text-[0.7rem] font-bold text-olive-600 ">
                              {activeEpicTasks.length} {activeEpicTasks.length === 1 ? 'Task' : 'Tasks'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex bg-olive-100  p-1 rounded-lg border border-olive-200/50 ">
                            <button
                              onClick={() => setViewMode('list')}
                              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white  shadow-sm text-olive-600' : 'text-olive-400 hover:text-olive-600'}`}
                              title="List View"
                            >
                              <List size={18} />
                            </button>
                            <button
                              onClick={() => setViewMode('kanban')}
                              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white  shadow-sm text-olive-600' : 'text-olive-400 hover:text-olive-600'}`}
                              title="Kanban Board"
                            >
                              <Layout size={18} />
                            </button>
                          </div>
                          <button
                            className="flex items-center justify-center w-10 h-10 bg-olive-900  hover:bg-olive-800  text-white rounded-lg shadow-sm transition-all duration-300 hover:scale-[1.03] active:scale-95 disabled:opacity-40"
                            disabled={!canManageActiveProject}
                            onClick={() => {
                              const activeEpic = epics.find(e => e.id === selectedEpicId);
                              setTaskModalProjectId(activeEpic?.projectId ?? activeProject?.id ?? null);
                              setIsTaskCreateModalOpen(true);
                            }}
                            title="New Task"
                            type="button"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="px-6 py-2 border-b border-olive-50 ">
                        <div className="mb-3">
                          <SlaDashboard />
                        </div>
                        <TaskFilterBar
                          filters={taskFilters}
                          onFilterChange={setTaskFilters}
                          members={activeProjectMembers}
                          onClear={handleClearFilters}
                        />
                      </div>

                      {selectedTaskIds.length > 0 && (
                        <div className="mx-6 my-2 p-3 bg-olive-50/50  border border-olive-100  rounded-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-olive-900 ">
                              {selectedTaskIds.length} tasks selected
                            </span>
                            <button
                              onClick={() => setSelectedTaskIds([])}
                              className="text-xs text-olive-600 hover:text-red-500 font-medium transition-colors underline decoration-dotted"
                            >
                              Deselect all
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-olive-500 uppercase tracking-widest">Assign to:</span>
                            <AssigneeSelector
                              projectId={activeProject?.id ?? null}
                              selectedUserId=""
                              onSelect={handleBulkAssign}
                              className="w-48"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex-1 overflow-auto custom-scrollbar">
                        {viewMode === 'list' ? (
                          <div className="p-6">
                            <TaskList
                              actionTaskId={actionTaskId}
                              epics={epics}
                              onDelete={(taskId) => {
                                const task = tasks.find(t => t.id === taskId);
                                void handleDeleteTask(taskId, task?.title ?? 'this task');
                              }}
                              onEditTask={(task) => setEditingTask(task)}
                              onUpdateStatus={(task, status) => void handleUpdateTaskStatus(task, status)}
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
                              <div className="py-20 flex flex-col items-center opacity-30">
                                <EmptyState description="No tasks scheduled for this epic." icon={Calendar} title="Empty Workspace" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full">
                            <KanbanBoard
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
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-40">
                      <div className="p-6 rounded-full bg-olive-100  mb-4">
                        <Folder size={48} className="text-olive-400" />
                      </div>
                      <h4 className="text-lg font-bold text-olive-950 ">Select an Epic</h4>
                      <p className="text-sm text-olive-500 max-w-xs mt-2">Choose an epic from the sidebar to view its execution plan and tasks.</p>
                    </div>
                  )}
                </div>

                {/* Column 3 — Task Inspector (Details) */}
                {selectedTaskId && activeTask && (
                  <div className="flex flex-col w-[420px] shrink-0 h-full rounded-md border border-olive-200/60  bg-white/70  backdrop-blur-md shadow-sm overflow-hidden animate-slideInRight duration-500 z-10">
                    <div className="flex items-center justify-between px-6 pt-6 bg-linear-to-b from-white to-olive-50/30   border-b border-olive-100 ">
                      <div>
                        <span className="text-[11px] uppercase tracking-[0.2em] font-black text-olive-600  opacity-80">Task Focus</span>
                        <h3 className="text-[1.1rem] font-bold font-sans text-olive-950  m-0 mt-1 tracking-tight truncate max-w-[240px]">
                          {activeTask.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedTaskId(null)}
                        className="p-2 text-olive-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 "
                        title="Close details"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="flex gap-6 mt-6 px-6 border-b border-olive-100 ">
                      <button
                        onClick={() => setSidePanelTab('subtasks')}
                        className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative ${sidePanelTab === 'subtasks' ? 'text-olive-600' : 'text-olive-400 hover:text-olive-600'}`}
                      >
                        Subtasks
                        {sidePanelTab === 'subtasks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-olive-600 rounded-full" />}
                      </button>
                      <button
                        onClick={() => setSidePanelTab('comments')}
                        className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative ${sidePanelTab === 'comments' ? 'text-olive-600' : 'text-olive-400 hover:text-olive-600'}`}
                      >
                        Comments
                        {sidePanelTab === 'comments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-olive-600 rounded-full" />}
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white  p-6 flex flex-col min-h-0">
                      {sidePanelTab === 'subtasks' ? (
                        <div className="flex flex-col gap-5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-olive-500 uppercase tracking-widest">Subtasks</h4>
                            <button
                              className="flex items-center justify-center w-8 h-8 bg-olive-600 hover:bg-olive-500 text-white rounded-lg shadow-sm transition-all transform active:scale-95 disabled:opacity-40"
                              disabled={!activeTask.permissions.canUpdate}
                              onClick={() => setSubtaskModalTask(activeTask)}
                              title="New Subtask"
                              type="button"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          {activeTask.subtasks.map(subtask => {
                            const isEditingThisSubtask = editingSubtask?.task.id === activeTask.id && editingSubtask?.subtask.id === subtask.id;
                            return (
                              <div key={subtask.id} className="group relative bg-white  border border-olive-200/70  rounded-xl p-5 transition-all duration-300 shadow-sm hover:-tranolive-y-[2px] hover:border-olive-300 ">
                                <div className="flex items-start justify-between gap-6">
                                  <div className="flex items-start gap-4.5 flex-1 min-w-0">
                                    <div className="mt-1 relative flex items-center justify-center">
                                      <input
                                        checked={subtask.status === 'DONE'}
                                        className="peer w-6 h-6 accent-olive-600 cursor-pointer rounded-lg border-olive-300  transition-all shadow-sm"
                                        disabled={!activeTask.permissions.canUpdate}
                                        onChange={() => void handleUpdateSubtaskStatus(activeTask, subtask, subtask.status === 'DONE' ? 'TODO' : 'DONE')}
                                        type="checkbox"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1.5 min-w-0">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span className={`text-[1rem] transition-all duration-300 ${subtask.status === 'DONE'
                                          ? 'text-olive-400  line-through'
                                          : 'text-olive-900  font-semibold tracking-tight'
                                          }`}>
                                          {subtask.title}
                                        </span>
                                        {subtask.assignedToUser && (
                                          <UserAvatar
                                            name={subtask.assignedToUser.name}
                                            email={subtask.assignedToUser.email}
                                            size="sm"
                                          />
                                        )}
                                      </div>
                                      {!isEditingThisSubtask && subtask.description && (
                                        <p className="text-olive-400  text-[0.82rem] leading-relaxed line-clamp-2 opacity-80">{subtask.description}</p>
                                      )}
                                      {!isEditingThisSubtask && subtask.note && (
                                        <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-olive-50  rounded-xl text-olive-500  text-[0.78rem] font-medium italic border border-olive-100 ">
                                          <MessageSquare size={14} className="shrink-0 text-olive-400" />
                                          <span className="truncate">{subtask.note}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 tranolive-x-2 group-hover:tranolive-x-0">
                                    <button
                                      className="p-2 rounded-xl hover:bg-olive-50  text-olive-400 hover:text-olive-600  transition-all disabled:opacity-40"
                                      disabled={!activeTask.permissions.canUpdate}
                                      onClick={() => setEditingSubtask(isEditingThisSubtask ? null : { task: activeTask, subtask })}
                                      title={isEditingThisSubtask ? 'Cancel' : 'Edit Subtask'}
                                      type="button"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                    <button
                                      className="p-2 rounded-xl hover:bg-olive-50  text-olive-400 hover:text-olive-600  transition-all"
                                      onClick={() => handleOpenSubtaskNote(activeTask, subtask)}
                                      title="Subtask Note"
                                      type="button"
                                    >
                                      <FileText size={16} />
                                    </button>
                                    <button
                                      className="p-2 rounded-xl hover:bg-red-50  text-olive-400 hover:text-red-500  transition-all disabled:opacity-40"
                                      disabled={!activeTask.permissions.canUpdate}
                                      onClick={() => void handleDeleteSubtask(activeTask, subtask.id)}
                                      title="Delete Subtask"
                                      type="button"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>

                                {/* Inline subtask edit form */}
                                {isEditingThisSubtask && (
                                  <div className="mt-5 pt-5 border-t border-olive-100 ">
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
                        </div>
                      ) : (
                        <div className="flex-1 min-h-0 flex flex-col">
                          <CommentSection taskId={activeTask.id} />
                        </div>
                      )}
                      {/* Task detail footer */}
                      <div className="mt-8 mb-4">
                        <div className="bg-white  border border-olive-200/70  rounded-xl p-8 shadow-sm relative overflow-hidden group/detail">
                          {/* Decorative Glow */}
                          <div className="absolute -top-24 -right-24 w-48 h-48 bg-olive-500/5 rounded-full blur-3xl group-hover/detail:bg-olive-500/10 transition-all duration-700" />

                          <h4 className="text-[1.05rem] font-bold font-sans text-olive-900  m-0 mb-6 flex items-center gap-3">
                            <div className="p-2.5 bg-olive-50  rounded-lg">
                              <Layout size={20} className="text-olive-600 " />
                            </div>
                            Task Properties
                          </h4>

                          {activeTask.description && (
                            <div className="relative">
                              <p className="text-olive-600  text-[0.92rem] leading-relaxed mb-8 pl-4 border-l-2 border-olive-100  italic">{activeTask.description}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-4 mb-10">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[0.72rem] font-black uppercase tracking-wider transition-all duration-500 shadow-sm ${statusPillCls[activeTask.status] ?? 'bg-olive-100 text-olive-600 border-olive-200'}`}>
                              <CheckCircle size={12} />
                              {activeTask.status.replace('_', ' ')}
                            </div>
                            <SourceBadge source={activeTask.source} />
                            <SlaIndicator task={activeTask} compact />

                            <button
                              type="button"
                              onClick={() => handleToggleBlocked(activeTask)}
                              className={[
                                'flex items-center gap-2 px-4 py-2 rounded-lg border text-[0.72rem] font-black uppercase tracking-wider transition-all shadow-sm',
                                activeTask.isBlocked
                                  ? 'bg-red-500 border-red-600 text-white'
                                  : 'bg-white border-olive-200 text-red-500 hover:bg-red-50'
                              ].join(' ')}
                            >
                              <AlertCircle size={12} />
                              {activeTask.isBlocked ? 'Unblock Task' : 'Block Task'}
                            </button>
                          </div>

                          <div className="grid gap-3 mb-8 p-4 rounded-xl bg-olive-50 border border-olive-200">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-olive-700">Response due</span>
                              <span className="text-olive-600">{activeTask.slaResponseDueAt ? new Date(activeTask.slaResponseDueAt).toLocaleString() : 'Not set'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-olive-700">Resolution due</span>
                              <span className="text-olive-600">{activeTask.slaResolutionDueAt ? new Date(activeTask.slaResolutionDueAt).toLocaleString() : 'Not set'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-olive-700">First response</span>
                              <span className="text-olive-600">{activeTask.firstResponseAt ? new Date(activeTask.firstResponseAt).toLocaleString() : 'Pending'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-olive-700">Completed</span>
                              <span className="text-olive-600">{activeTask.completedAt ? new Date(activeTask.completedAt).toLocaleString() : 'Pending'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-olive-700">Paused</span>
                              <span className="text-olive-600">{activeTask.slaPausedAt ? new Date(activeTask.slaPausedAt).toLocaleString() : 'No'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-olive-700">Dynamic priority</span>
                              <span className="text-olive-600">{activeTask.dynamicPriority} / {activeTask.dynamicPriorityScore}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-olive-700">Impact</span>
                              <span className="text-olive-600">{activeTask.impactScore} impact, {activeTask.dependencyWeight} downstream</span>
                            </div>
                            {activeTask.priorityEscalationReason && (
                              <div className="text-sm">
                                <span className="font-bold text-olive-700">Escalation reason</span>
                                <p className="m-0 mt-1 text-olive-600">{activeTask.priorityEscalationReason}</p>
                              </div>
                            )}

                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => void handleEvaluatePriority(activeTask.id)}
                                disabled={isEvaluatingPriority}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-olive-200 text-olive-700 rounded-lg text-sm font-bold hover:bg-olive-50 transition-colors disabled:opacity-50"
                              >
                                <Zap className="w-4 h-4 text-amber-500" />
                                {isEvaluatingPriority ? 'Evaluating...' : 'Evaluate Dynamic Priority'}
                              </button>
                            </div>
                          </div>

                          <button
                            className="w-full group/btn relative flex items-center justify-center gap-3 px-6 py-4 bg-olive-900  text-white  rounded-xl font-bold text-[0.95rem] shadow-sm shadow-olive-900/20  hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 overflow-hidden"
                            onClick={() => handleOpenTaskNote(activeTask)}
                            type="button"
                          >
                            <NotebookPen size={20} className="transition-transform group-hover/btn:rotate-12" />
                            Manage Work Notes

                            {/* Inner Glow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -tranolive-x-full group-hover/btn:tranolive-x-full transition-transform duration-1000" />
                          </button>

                          <ApprovalSection
                            projectId={activeTask.projectId || ''}
                            taskId={activeTask.id}
                            members={activeProjectMembers}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div >

      {/* Modals & Overlays */}
      {
        isProjectCreateModalOpen ? (
          <Modal onClose={() => setIsProjectCreateModalOpen(false)} title="Create Project">
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
        isChatPanelOpen && activeProject ? (
          <>
            {/* Chat Drawer Backdrop */}
            <div
              className="fixed inset-0 bg-olive-900/20 backdrop-blur-[2px] z-[2000] animate-in fade-in duration-300"
              onClick={() => setIsChatPanelOpen(false)}
            />
            {/* Chat Drawer Container */}
            <div className="fixed top-0 right-0 h-full w-full md:w-1/2 lg:max-w-1/2 bg-white  z-[5001] shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden border-l border-olive-200  flex flex-col">
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
          <Modal onClose={() => setEditingProject(null)} title="Update Project">
            <ProjectForm initialDescription={editingProject.description} initialName={editingProject.name} onSubmit={handleUpdateProject} submitLabel="Update project" />
          </Modal>
        ) : null
      }
      {
        isEpicCreateModalOpen && activeProject ? (
          <Modal onClose={() => setIsEpicCreateModalOpen(false)} title={`Create Epic for ${activeProject.name}`}>
            <EpicForm onSubmit={handleCreateEpic} submitLabel="Create epic" />
          </Modal>
        ) : null
      }
      {
        editingEpic && activeProject ? (
          <Modal onClose={() => setEditingEpic(null)} title={`Update Epic for ${activeProject.name}`}>
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
          <Modal onClose={() => setIsTaskCreateModalOpen(false)} title="Create Task">
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
            panelClassName="!max-w-[820px]"
            title={`Team for ${activeProject.name}`}
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
      {
        isActivityHistoryOpen && activeProject ? (
          <Modal
            bodyClassName="!p-0"
            onClose={() => setIsActivityHistoryOpen(false)}
            panelClassName="!max-w-[720px]"
            title={`Activity History — ${activeProject.name}`}
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
          <Modal onClose={() => setEditingTask(null)} title={`Edit Task: ${editingTask.title}`}>
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
            title={`Create Subtask for ${subtaskModalTask.title}`}
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
                ? 'Delete Note'
                : activeNoteEditor.kind === 'epic'
                  ? 'Delete Epic Note'
                  : activeNoteEditor.kind === 'task'
                    ? 'Delete Task Note'
                    : 'Delete Sub-task Note'
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
                  ? 'Edit Project Note'
                  : 'Create Project Note'
                : activeNoteEditor.kind === 'epic'
                  ? activeNoteEditor.note
                    ? 'Edit Epic Note'
                    : 'Create Epic Note'
                  : activeNoteEditor.kind === 'task'
                    ? activeNoteEditor.task.note?.trim()
                      ? 'Edit Task Note'
                      : 'Create Task Note'
                    : activeNoteEditor.subtask.note?.trim()
                      ? 'Edit Sub-task Note'
                      : 'Create Sub-task Note'
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
        <Modal onClose={() => setPriorityEvaluationModalOpen(false)} title="Priority Evaluation">
          <div className="grid gap-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-olive-100">
                <span className="font-bold text-olive-700">Base Priority</span>
                <span className="text-olive-900 font-medium">{priorityEvaluationResult.basePriority}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-olive-100">
                <span className="font-bold text-olive-700">Dynamic Priority</span>
                <span className="text-olive-900 font-bold px-2 py-0.5 bg-olive-100 rounded">{priorityEvaluationResult.dynamicPriority}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-olive-100">
                <span className="font-bold text-olive-700">Dynamic Score</span>
                <span className="text-olive-900">{priorityEvaluationResult.dynamicPriorityScore}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-olive-100">
                <span className="font-bold text-olive-700">Urgency / Impact</span>
                <span className="text-olive-900">{priorityEvaluationResult.urgencyScore} / {priorityEvaluationResult.impactScore}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-olive-100">
                <span className="font-bold text-olive-700">Downstream Impact</span>
                <span className="text-olive-900">{priorityEvaluationResult.downstreamTaskCount} tasks ({priorityEvaluationResult.dependencyWeight} weight)</span>
              </div>
            </div>
            <div className="bg-olive-50 p-3 rounded-lg border border-olive-200">
              <h4 className="text-xs font-bold text-olive-800 uppercase tracking-wider mb-1">Reasoning</h4>
              <p className="text-sm text-olive-600 m-0">{priorityEvaluationResult.reason}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                className="px-4 py-2 bg-olive-900 text-white rounded-lg text-sm font-bold hover:bg-olive-800"
                onClick={() => setPriorityEvaluationModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div >
  );
}

export default DashboardPage;
