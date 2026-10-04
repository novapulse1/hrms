// ====================================================================
// TASK MANAGEMENT & SEQUENTIAL TEAM PROJECT WORKFLOW MODULE
// Integrated into NovaPulse HRMS with Reporting Hierarchy Security
// ====================================================================

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  LayoutDashboard,
  UserCheck,
  Users,
  Layers,
  GitPullRequest,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { TaskService } from '../../services/taskService';
import { TaskItem, TeamProject, TaskStatus } from '../../database/schema';
import { StorageEngine } from '../../database/storageEngine';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

// Sub-Tab Components
import { TaskDashboardTab } from './components/TaskDashboardTab';
import { MyTasksTab } from './components/MyTasksTab';
import { AssignedTasksTab } from './components/AssignedTasksTab';
import { TeamProjectsTab } from './components/TeamProjectsTab';
import { ProjectWorkflowTab } from './components/ProjectWorkflowTab';

// Modals
import { CreateTaskModal } from './components/CreateTaskModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ProjectDetailModal } from './components/ProjectDetailModal';

export const TaskManagementModule: React.FC = () => {
  const { currentUser, currentEmployee, isSuperAdmin, isHR } = useAuth();
  const [dataVersion, setDataVersion] = useState(0);

  // Active Sub-Tab Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my_tasks' | 'assigned_tasks' | 'projects' | 'workflows'>('dashboard');

  // Selected Entities & Modals
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  const [selectedProject, setSelectedProject] = useState<TeamProject | null>(null);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  // Subscribe to storage changes for reactive state
  useEffect(() => {
    const unsub = StorageEngine.subscribe(() => {
      setDataVersion(v => v + 1);
    });
    return unsub;
  }, []);

  // Fetch Tasks & Projects
  const currentEmpId = currentEmployee?.id || currentUser.id;
  const allTenantTasks = TaskService.getAllTasks();
  const myTasks = TaskService.getMyTasks(currentEmpId);
  const isSuperOrHR = isSuperAdmin || isHR;
  const assignedTasks = TaskService.getAssignedTasks(currentEmpId, isSuperOrHR, currentUser.id);
  const allProjects = TaskService.getProjects();

  // Task Handlers
  const handleOpenTask = (task: TaskItem) => {
    setSelectedTask(task);
    setIsTaskDetailModalOpen(true);
  };

  const handleUpdateTask = (taskId: string, status: TaskStatus, progress: number) => {
    TaskService.updateTask(
      taskId,
      { status, progress },
      currentUser,
      currentEmployee
    );
    setDataVersion(v => v + 1);
  };

  const handleDeleteTask = (taskId: string) => {
    TaskService.deleteTask(taskId, currentUser, currentEmployee);
    setDataVersion(v => v + 1);
  };

  // Project Handlers
  const handleOpenProject = (project: TeamProject) => {
    setSelectedProject(project);
    setIsProjectDetailModalOpen(true);
  };

  const handleNavigateToWorkflow = (project: TeamProject) => {
    setSelectedProject(project);
    setActiveTab('workflows');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-2xl w-fit overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 inline text-purple-600" />
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'my_tasks'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 inline text-purple-600" />
            My Tasks
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assigned_tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'assigned_tasks'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 inline text-purple-600" />
            Assigned Tasks
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'projects'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 inline text-purple-600" />
            Team Projects
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'workflows'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5 inline text-purple-600" />
            Project Workflow
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsCreateProjectModalOpen(true)}
            leftIcon={<Layers className="w-3.5 h-3.5 text-purple-600" />}
          >
            New Project
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => setIsCreateTaskModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'dashboard' && (
        <TaskDashboardTab
          tasks={allTenantTasks}
          projects={allProjects}
          onSelectTask={handleOpenTask}
          onSelectProject={handleOpenProject}
          onNavigateTab={tab => setActiveTab(tab)}
        />
      )}

      {activeTab === 'my_tasks' && (
        <MyTasksTab
          tasks={myTasks}
          onSelectTask={handleOpenTask}
          onUpdateTask={handleUpdateTask}
        />
      )}

      {activeTab === 'assigned_tasks' && (
        <AssignedTasksTab
          tasks={assignedTasks}
          onSelectTask={handleOpenTask}
          onOpenCreateModal={() => setIsCreateTaskModalOpen(true)}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {activeTab === 'projects' && (
        <TeamProjectsTab
          projects={allProjects}
          onSelectProject={handleOpenProject}
          onOpenCreateModal={() => setIsCreateProjectModalOpen(true)}
          onNavigateToWorkflow={handleNavigateToWorkflow}
        />
      )}

      {activeTab === 'workflows' && (
        <ProjectWorkflowTab
          projects={allProjects}
          selectedProject={selectedProject}
          onSelectProject={p => setSelectedProject(p)}
          onProjectUpdated={p => {
            setSelectedProject(p);
            setDataVersion(v => v + 1);
          }}
        />
      )}

      {/* Task Creation Modal */}
      {isCreateTaskModalOpen && (
        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => setIsCreateTaskModalOpen(false)}
          onTaskCreated={newTask => {
            setDataVersion(v => v + 1);
            setSelectedTask(newTask);
            setIsTaskDetailModalOpen(true);
          }}
        />
      )}

      {/* Task Detail Modal */}
      {isTaskDetailModalOpen && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={isTaskDetailModalOpen}
          onClose={() => {
            setIsTaskDetailModalOpen(false);
            setSelectedTask(null);
          }}
          onTaskUpdated={updated => {
            setSelectedTask(updated);
            setDataVersion(v => v + 1);
          }}
        />
      )}

      {/* Project Creation Modal */}
      {isCreateProjectModalOpen && (
        <CreateProjectModal
          isOpen={isCreateProjectModalOpen}
          onClose={() => setIsCreateProjectModalOpen(false)}
          onProjectCreated={newProj => {
            setDataVersion(v => v + 1);
            setSelectedProject(newProj);
            setActiveTab('workflows');
          }}
        />
      )}

      {/* Project Detail Modal */}
      {isProjectDetailModalOpen && (
        <ProjectDetailModal
          project={selectedProject}
          isOpen={isProjectDetailModalOpen}
          onClose={() => {
            setIsProjectDetailModalOpen(false);
            setSelectedProject(null);
          }}
          onProjectUpdated={updated => {
            setSelectedProject(updated);
            setDataVersion(v => v + 1);
          }}
        />
      )}
    </div>
  );
};
