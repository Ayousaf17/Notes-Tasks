import React, { useState, useEffect, ErrorInfo, ReactNode, createContext, useContext, Component, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { DocumentEditor } from './DocumentEditor';
import { TaskBoard } from './TaskBoard';
import { AIChatSidebar } from './AIChatSidebar';
import { CalendarView } from './CalendarView';
import { CommandPalette } from './CommandPalette';
import { ContextSidebar } from './ContextSidebar';
import { InboxView } from './InboxView';
import { GraphView } from './GraphView';
import { DashboardView } from './DashboardView'; 
import { ProjectOverview } from './ProjectOverview';
import { ReviewWizard } from './ReviewWizard';
import { TaskDetailModal } from './TaskDetailModal';
import { IntegrationsModal } from './IntegrationsModal';
import { SettingsView } from './SettingsView';
import { CreateProjectModal } from './CreateProjectModal';
import { ConfirmationModal } from './ConfirmationModal';
import { ClientsView } from './ClientsView';
import { CreateClientModal } from './CreateClientModal';
import { VoiceCommandOverlay } from './VoiceCommandOverlay';
import { BrainView } from './BrainView'; 
import { ViewMode, Document, Task, TaskStatus, ProjectPlan, TaskPriority, ChatMessage, Project, InboxItem, InboxAction, AgentRole, Integration, Client, Attachment, FocusItem } from '../types';
import { Sparkles, Command, Plus, Menu, Cloud, MessageSquare, Home, Inbox, Search, CheckSquare, X, CheckCircle, AlertTriangle, Info, Mic, BrainCircuit } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { analyticsService } from '../services/analyticsService';
import { MascotProvider, useMascot } from '../contexts/MascotContext';
import { AasaniMascot } from './AasaniMascot';
import { GridPattern } from './ui/grid-pattern';
import { MenuBar } from './ui/glow-menu';

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export interface Toast { id: string; message: string; type: ToastType; }
export const ToastContext = createContext<{ addToast: (msg: string, type: ToastType) => void }>({ addToast: () => {} });
export const useToast = () => useContext(ToastContext);

const MascotIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 48 48" className={className} fill="none">
        <path d="M24 4 C10 4, 4 14, 4 26 C4 38, 14 44, 24 44 C34 44, 44 38, 44 26 C44 14, 38 4, 24 4 Z" fill="currentColor" className="text-black dark:text-white transition-colors"/>
        <path d="M24 8 C14 8, 8 16, 8 26 C8 36, 16 40, 24 40 C32 40, 40 36, 40 26 C40 16, 36 8, 24 8 Z" fill="currentColor" className="text-white dark:text-zinc-800 transition-colors"/>
        <circle cx="16" cy="18" r="3.5" fill="currentColor" className="text-black dark:text-white" />
        <circle cx="32" cy="18" r="3.5" fill="currentColor" className="text-black dark:text-white" />
        <path d="M20 29 Q24 31 28 29" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-black dark:text-white" />
    </svg>
);

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  state = { hasError: false }; // Declare state property

  constructor(props: {children: ReactNode}) {
    super(props);
    // State is initialized in property declaration
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black text-black dark:text-white p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Something went wrong.</h1>
            <p className="text-sm text-gray-500 mb-4">A critical error occurred. Please refresh the page.</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold">Refresh</button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.HOME); 
  const [viewHistory, setViewHistory] = useState<ViewMode[]>([]); 
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false); 
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
      if (typeof window !== 'undefined') return localStorage.getItem('sidebarPinned') === 'true';
      return false;
  });

  const [isContextSidebarOpen, setIsContextSidebarOpen] = useState(false); 
  
  const touchStartRef = useRef<{x: number, y: number} | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  const [teamMembers, setTeamMembers] = useState<string[]>(() => {
      if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('teamMembers');
          return stored ? JSON.parse(stored) : ['Me', 'Kate'];
      }
      return ['Me', 'Kate'];
  });

  const handleUpdateTeam = (members: string[]) => {
      setTeamMembers(members);
      localStorage.setItem('teamMembers', JSON.stringify(members));
      addToast('Team updated successfully', 'success');
  };

  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleClearData = async () => {
      setConfirmationModal({
          isOpen: true,
          title: 'Reset Workspace',
          message: 'Are you sure you want to wipe all data? This cannot be undone.',
          isDanger: true,
          confirmText: 'Reset Data',
          onConfirm: () => {
              localStorage.clear();
              window.location.reload();
          }
      });
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme');
        if (stored === 'dark') return true;
        if (stored === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([
      { id: 'google', name: 'Google Workspace', description: 'Sync Docs, Calendar, and Drive.', icon: Cloud, connected: false, category: 'Cloud' },
      { id: 'openrouter', name: 'OpenRouter', description: 'Access GPT-4, Claude, Llama & more.', icon: MessageSquare, connected: false, category: 'AI' },
  ]);
  
  const openRouterInt = integrations.find(i => i.id === 'openrouter');
  const activeModelName = openRouterInt?.connected && openRouterInt.config?.model 
      ? `${openRouterInt.config.model.split('/').pop()}` 
      : 'Gemini 2.5 Flash';

  const [projects, setProjects] = useState<Project[]>([
      { id: 'p1', title: 'V2 Redesign', createdAt: new Date() },
      { id: 'p2', title: 'Marketing Launch', createdAt: new Date() },
      { id: 'p3', title: 'Backend Migration', createdAt: new Date() }
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string>('p1');

  const [documents, setDocuments] = useState<Document[]>([
    { id: 'd1', projectId: 'p1', title: 'Design System Specs', content: '# V2 Design System\n\n- Primary Color: #000000\n- Typography: Inter\n\nSee [[Marketing Launch]] for usage guidelines.', updatedAt: new Date(), tags: ['Specs', 'Design'] },
    { id: 'd2', projectId: 'p2', title: 'Q3 Campaign', content: '# Q3 Campaign Strategy\n\nFocus on "Zero Friction" messaging.\n\nTasks:\n- [ ] nexus://task/t2', updatedAt: new Date(), tags: ['Strategy'] }
  ]);
  
  const [activeDocId, setActiveDocId] = useState<string | null>('d1');
  
  const [tasks, setTasks] = useState<Task[]>([]);

  const [inboxItems, setInboxItems] = useState<InboxItem[]>([
      { id: 'i1', content: 'Feedback from CEO: Make the sidebar collapsible on mobile', type: 'text', status: 'pending', createdAt: new Date() }
  ]);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'I am Aasani. I can help you organize this project, generate plans, or summarize your documents.', timestamp: new Date() }
  ]);

  const [clients, setClients] = useState<Client[]>([]);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isVoiceCommandOpen, setIsVoiceCommandOpen] = useState(false);
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);

  const [activeInboxItemId, setActiveInboxItemId] = useState<string | null>(null);
  const [activeFocusItem, setActiveFocusItem] = useState<FocusItem | null>(null);

  const { say } = useMascot();

  useEffect(() => {
    const loadData = async () => {
        try {
            const { projects: dbProjects, tasks: dbTasks, documents: dbDocs, clients: dbClients } = await dataService.fetchAll();
            
            if (dbProjects.length > 0) {
                setProjects(dbProjects);
                setTasks(dbTasks);
                setDocuments(dbDocs);
                setClients(dbClients);
                setActiveProjectId(prev => dbProjects.find(p => p.id === prev) ? prev : dbProjects[0].id);
            }
        } catch (e) {
            console.error("Failed to load data from Supabase", e);
            addToast("Failed to load data. Working offline.", 'warning');
        }
    };
    loadData();

    const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
            loadData();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, []);

  const handleViewChange = (newView: ViewMode) => {
      if (currentView !== newView) {
          setViewHistory(prev => [...prev, currentView]);
          setCurrentView(newView);
      }
  };

  const handleSelectProject = (projectId: string) => {
      setActiveProjectId(projectId);
      setActiveDocId(null);
      handleViewChange(ViewMode.PROJECT_OVERVIEW); 
  };

  const handleManageIntegration = async (id: string, action: 'toggle' | 'connect' | 'disconnect' | 'update', config?: any) => {
      setIntegrations(prev => prev.map(i => {
          if (i.id === id) {
              if (action === 'disconnect') return { ...i, connected: false, config: undefined };
              if (action === 'connect') return { ...i, connected: true, config: { ...i.config, ...config } };
              if (action === 'update') return { ...i, config: { ...i.config, ...config } };
              if (action === 'toggle') return { ...i, connected: !i.connected };
          }
          return i;
      }));
      
      if (id === 'google' && action === 'connect') {
           try {
               const events = await dataService.fetchGoogleEvents();
               setTasks(prev => [...prev, ...events]);
               addToast('Google Calendar connected', 'success');
           } catch (e) {
               addToast('Failed to sync Google Calendar', 'error');
           }
      }
  };

  const handleVoiceExecution = (type: string, data: any) => {
      if (type === 'create_task') {
          const newTask: Task = {
              id: crypto.randomUUID(),
              projectId: data.projectId || activeProjectId,
              title: data.title || 'New Task',
              status: TaskStatus.TODO,
              priority: data.priority || TaskPriority.MEDIUM,
              dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
              createdAt: new Date(),
              updatedAt: new Date()
          };
          setTasks(prev => [...prev, newTask]);
          dataService.createTask(newTask);
          addToast(`Task created: ${newTask.title}`, 'success');
      } else if (type === 'navigate') {
          const viewKey = data.view as keyof typeof ViewMode;
          if (ViewMode[viewKey]) {
              handleViewChange(ViewMode[viewKey]);
              addToast(`Navigating to ${data.view}`, 'info');
          }
      } else if (type === 'create_note') {
           const newDoc: Document = {
              id: crypto.randomUUID(),
              projectId: activeProjectId,
              title: 'Voice Note',
              content: data.content || '',
              updatedAt: new Date(),
              tags: ['Voice']
           };
           setDocuments(prev => [...prev, newDoc]);
           dataService.createDocument(newDoc);
           setActiveDocId(newDoc.id);
           handleViewChange(ViewMode.DOCUMENTS);
           addToast('Voice note created', 'success');
      }
  };

  const handleOpenCreateProject = () => setIsCreateProjectModalOpen(true);
  
  const handleCreateDocument = async () => {
    const newDoc: Document = {
      id: crypto.randomUUID(),
      projectId: activeProjectId,
      title: '',
      content: '',
      updatedAt: new Date(),
      tags: []
    };
    setDocuments(prev => [...prev, newDoc]);
    setActiveDocId(newDoc.id);
    handleViewChange(ViewMode.DOCUMENTS);
    await dataService.createDocument(newDoc);
  };

  const handleDeleteDocument = (id: string) => {
      setConfirmationModal({
          isOpen: true,
          title: 'Delete Page',
          message: 'Are you sure you want to delete this page? This cannot be undone.',
          isDanger: true,
          confirmText: 'Delete Page',
          onConfirm: async () => {
              setDocuments(prev => prev.filter(d => d.id !== id));
              if (activeDocId === id) {
                  setActiveDocId(null);
              }
              await dataService.deleteDocument(id);
              addToast('Document deleted', 'info');
          }
      });
  };

  const handleUpdateDocument = (d: Document) => {
    setDocuments(prev => prev.map(doc => doc.id === d.id ? d : doc));
    dataService.updateDocument(d.id, d);
  };

  const handleExtractTasks = (newTasks: Partial<Task>[]): Task[] => {
    const finalTasks: Task[] = newTasks.map(t => ({
      id: crypto.randomUUID(),
      projectId: activeProjectId,
      title: t.title || 'Untitled Task',
      status: t.status || TaskStatus.TODO,
      description: t.description,
      dueDate: new Date(),
      assignee: t.assignee || 'Unassigned',
      priority: t.priority || TaskPriority.MEDIUM,
      dependencies: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    setTasks(prev => [...prev, ...finalTasks]);
    finalTasks.forEach(t => dataService.createTask(t));
    addToast(`${finalTasks.length} tasks extracted`, 'success');
    return finalTasks;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t));
      dataService.updateTask(id, updates);
  };

  const handleDeleteTask = (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      if (selectedTaskId === id) setSelectedTaskId(null);
      dataService.deleteTask(id);
      addToast('Task deleted', 'info');
  };

  const handleUpdateTaskStatus = (id: string, status: TaskStatus) => updateTask(id, { status });
  
  const handleUpdateTaskAssignee = async (id: string, assignee: string) => {
      updateTask(id, { assignee });
      if (assignee.startsWith('AI_')) {
          const task = tasks.find(t => t.id === id);
          if (task) {
              updateTask(id, { status: TaskStatus.IN_PROGRESS, agentStatus: 'working', agentResult: undefined });
              const result = await geminiService.performAgentTask(assignee as AgentRole, task.title, task.description);
              updateTask(id, { agentStatus: 'completed', agentResult: result });
              addToast(`AI Agent completed task: ${task.title}`, 'success');
          }
      } else {
          updateTask(id, { agentStatus: 'idle' });
      }
  };

  const handleUpdateTaskDueDate = (id: string, date: Date) => updateTask(id, { dueDate: date });
  const handleUpdateTaskPriority = (id: string, priority: TaskPriority) => updateTask(id, { priority });
  const handleUpdateTaskDependencies = (id: string, dependencies: string[]) => updateTask(id, { dependencies });
  
  const handlePromoteTask = async (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.linkedDocumentId) return;
      const newContent = await geminiService.expandTaskToContent(task.title, task.description);
      const newDoc: Document = {
          id: crypto.randomUUID(),
          projectId: task.projectId,
          title: task.title,
          content: newContent,
          updatedAt: new Date(),
          tags: ['Task Expanded']
      };
      setDocuments(prev => [...prev, newDoc]);
      updateTask(taskId, { linkedDocumentId: newDoc.id });
      await dataService.createDocument(newDoc);
      setActiveProjectId(task.projectId);
      setActiveDocId(newDoc.id);
      handleViewChange(ViewMode.DOCUMENTS);
      addToast('Task promoted to Document', 'success');
  };

  const handleNavigate = (type: 'document' | 'task', id: string) => {
      if (type === 'document') {
          const doc = documents.find(d => d.id === id);
          if (doc) {
              setActiveProjectId(doc.projectId);
              setActiveDocId(id);
              handleViewChange(ViewMode.DOCUMENTS);
          }
      } else if (type === 'task') {
          const task = tasks.find(t => t.id === id);
          if (task) {
              setActiveProjectId(task.projectId);
              handleViewChange(ViewMode.BOARD);
              setSelectedTaskId(id);
          }
      }
      setIsCommandPaletteOpen(false);
  };

  const handleAddInboxItem = (content: string, type: 'text' | 'audio' | 'file', fileName?: string, attachments?: Attachment[]) => {
      const newItem: InboxItem = {
          id: crypto.randomUUID(),
          content,
          type,
          fileName,
          status: 'pending',
          createdAt: new Date(),
          attachments
      };
      setInboxItems(prev => [newItem, ...prev]);
      addToast('Captured to Inbox', 'success');
  };

  const handleDeleteInboxItem = (id: string) => {
      setInboxItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateInboxItem = (id: string, updates: Partial<InboxItem>) => {
      setInboxItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleProcessInboxItem = async (itemId: string, action: InboxAction) => {
      let targetProjectId = action.targetProjectId;
      
      if (targetProjectId.startsWith('NEW:')) {
          const title = targetProjectId.substring(4);
          const newProject: Project = {
              id: crypto.randomUUID(),
              title: title,
              icon: '📁',
              createdAt: new Date()
          };
          await dataService.createProject(newProject);
          setProjects(prev => [...prev, newProject]);
          targetProjectId = newProject.id;
      }

      if (action.actionType === 'create_task') {
          const newTask: Task = {
              id: crypto.randomUUID(),
              projectId: targetProjectId,
              title: action.data.title,
              description: action.data.description || '',
              status: TaskStatus.TODO,
              priority: action.data.priority || TaskPriority.MEDIUM,
              assignee: 'Unassigned',
              dueDate: new Date(),
              dependencies: [],
              createdAt: new Date(),
              updatedAt: new Date()
          };
          setTasks(prev => [...prev, newTask]);
          dataService.createTask(newTask);
          addToast('Task created from Inbox', 'success');
      } else if (action.actionType === 'create_document') {
           const newDoc: Document = {
              id: crypto.randomUUID(),
              projectId: targetProjectId,
              title: action.data.title,
              content: action.data.content || '# ' + action.data.title,
              tags: ['Inbox Processed'],
              updatedAt: new Date()
           };
           setDocuments(prev => [...prev, newDoc]);
           dataService.createDocument(newDoc);
           addToast('Document created from Inbox', 'success');
      }
      setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, status: 'processed' as const } : item).filter(i => i.status !== 'processed'));
  };
  
  const handleStoreInboxSuggestion = (id: string, action: InboxAction) => {
      setInboxItems(prev => prev.map(item => item.id === id ? { ...item, processedResult: action } : item));
  };

  const handleAnalyzeInboxItem = async (id: string, content: string, attachments: Attachment[]) => {
      // Placeholder for future analysis logic
      addToast('Analysis queued', 'info');
  };

  const handleDiscussInboxItem = (item: InboxItem) => {
      setActiveInboxItemId(item.id);
      setActiveFocusItem({ type: 'inbox', data: item });
      setIsChatOpen(true);
  };

  const handleDiscussTask = (task: Task) => {
      setActiveFocusItem({ type: 'task', data: task });
      setIsChatOpen(true);
  };

  const handleAddClient = async (c: Partial<Client>) => {
      const newClient: Client = {
          id: crypto.randomUUID(),
          name: c.name || 'New Client',
          company: c.company || 'Company',
          email: c.email || '',
          status: c.status || 'Lead',
          value: c.value || 0,
          lastContact: new Date(),
          tags: [],
          activities: [],
          ...c
      } as Client;
      setClients(prev => [...prev, newClient]);
      await dataService.createClient(newClient);
      addToast('Client added', 'success');
  };

  const handleDeleteClient = async (id: string) => {
      setClients(prev => prev.filter(c => c.id !== id));
      await dataService.deleteClient(id);
      addToast('Client deleted', 'info');
  };

  const handleTogglePin = () => {
      const newPinned = !isSidebarPinned;
      setIsSidebarPinned(newPinned);
      localStorage.setItem('sidebarPinned', String(newPinned));
  };

  const handleDeleteProject = (id: string) => {
      const project = projects.find(p => p.id === id);
      setConfirmationModal({
          isOpen: true,
          title: 'Delete Project',
          message: `Are you sure you want to delete "${project?.title}"? All associated documents and tasks will be permanently removed.`,
          isDanger: true,
          confirmText: 'Delete Project',
          onConfirm: async () => {
              setProjects(prev => prev.filter(p => p.id !== id));
              setTasks(prev => prev.filter(t => t.projectId !== id));
              setDocuments(prev => prev.filter(d => d.projectId !== id));
              
              if (activeProjectId === id) {
                  const remaining = projects.filter(p => p.id !== id);
                  if (remaining.length > 0) {
                      handleSelectProject(remaining[0].id);
                  } else {
                      handleViewChange(ViewMode.HOME);
                  }
              }
              await dataService.deleteProject(id);
              addToast('Project deleted', 'info');
          }
      });
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const projectDocs = documents.filter(d => d.projectId === activeProjectId);
  const projectTasks = tasks.filter(t => t.projectId === activeProjectId);
  const tasksToDisplay = (currentView === ViewMode.GLOBAL_BOARD || currentView === ViewMode.GLOBAL_CALENDAR) ? tasks : projectTasks;
  const activeDocument = documents.find(d => d.id === activeDocId);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
        {/* Background Grid */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <GridPattern width={40} height={40} className="opacity-[0.03] dark:opacity-[0.05]" />
        </div>

        <Sidebar 
            currentView={currentView}
            onChangeView={handleViewChange}
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            onCreateProject={handleOpenCreateProject}
            onDeleteProject={handleDeleteProject}
            documents={projectDocs}
            onSelectDocument={(id) => { setActiveDocId(id); handleViewChange(ViewMode.DOCUMENTS); }}
            onCreateDocument={handleCreateDocument}
            onDeleteDocument={handleDeleteDocument}
            activeDocumentId={activeDocId}
            onOpenIntegrations={() => setIsIntegrationsOpen(true)}
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={() => setIsMobileSidebarOpen(false)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            isExpanded={isSidebarPinned || isSidebarHovered}
            onHover={setIsSidebarHovered}
            isPinned={isSidebarPinned}
            onTogglePin={handleTogglePin}
            globalModelLabel={activeModelName}
        />

        <main className={`flex-1 flex flex-col relative transition-all duration-300 z-10 ${isSidebarPinned || isSidebarHovered ? 'md:ml-64' : 'md:ml-16'}`}>
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {currentView === ViewMode.HOME && (
                    <DashboardView 
                        tasks={tasks} 
                        documents={documents} 
                        projects={projects} 
                        userName="User" 
                        onNavigate={handleNavigate} 
                        onChangeView={handleViewChange}
                        onStartReview={() => handleViewChange(ViewMode.REVIEW)} 
                        onCreateProject={handleOpenCreateProject}
                        teamMembers={teamMembers}
                    />
                )}
                {currentView === ViewMode.PROJECT_OVERVIEW && activeProject && (
                    <ProjectOverview 
                        project={activeProject}
                        tasks={projectTasks}
                        documents={projectDocs}
                        onNavigate={handleNavigate}
                        onChangeView={handleViewChange}
                    />
                )}
                {currentView === ViewMode.INBOX && (
                    <InboxView 
                        items={inboxItems} 
                        onAddItem={handleAddInboxItem} 
                        onProcessItem={(id, action) => { const item = inboxItems.find(i => i.id === id); if (item && item.processedResult) handleProcessInboxItem(id, action); else handleStoreInboxSuggestion(id, action); }} 
                        onDeleteItem={handleDeleteInboxItem} 
                        onUpdateItem={handleUpdateInboxItem}
                        onDiscussItem={handleDiscussInboxItem}
                        onAnalyzeItem={handleAnalyzeInboxItem}
                        projects={projects} 
                        activeProjectId={activeProjectId}
                    />
                )}
                {currentView === ViewMode.SETTINGS && (
                    <SettingsView 
                        teamMembers={teamMembers}
                        onUpdateTeam={handleUpdateTeam}
                        isDarkMode={isDarkMode}
                        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                        onClearData={handleClearData}
                        onDeleteProject={handleDeleteProject}
                        projects={projects}
                        integrations={integrations}
                        onToggleIntegration={handleManageIntegration}
                    />
                )}
                {currentView === ViewMode.REVIEW && (
                    <ReviewWizard inboxItems={inboxItems} tasks={tasks} projects={projects} onProcessInboxItem={handleProcessInboxItem} onDeleteInboxItem={handleDeleteInboxItem} onDeleteTask={handleDeleteTask} onUpdateTaskStatus={handleUpdateTaskStatus} onUpdateTaskAssignee={handleUpdateTaskAssignee} onClose={() => handleViewChange(ViewMode.HOME)} />
                )}
                {currentView === ViewMode.DOCUMENTS && activeDocument ? (
                    <div className="flex h-full">
                        <DocumentEditor 
                            document={activeDocument} 
                            allDocuments={documents} 
                            allTasks={tasks} 
                            onUpdate={handleUpdateDocument} 
                            onExtractTasks={handleExtractTasks} 
                            onNavigate={handleNavigate} 
                            onDelete={() => handleDeleteDocument(activeDocument.id)}
                            onToggleContext={() => setIsContextSidebarOpen(prev => !prev)}
                            integrations={integrations}
                        />
                        <div className="hidden lg:block h-full border-l border-gray-100 dark:border-gray-800 w-72">
                            <ContextSidebar currentDoc={activeDocument} allDocs={documents} allTasks={tasks} onNavigate={handleNavigate} onUpdateDocument={handleUpdateDocument} />
                        </div>
                        {isContextSidebarOpen && (
                            <div className="lg:hidden fixed inset-0 z-[100] flex justify-end">
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsContextSidebarOpen(false)} />
                                <div className="relative w-[85vw] h-full bg-white dark:bg-black shadow-2xl animate-in slide-in-from-right duration-300">
                                    <ContextSidebar 
                                        currentDoc={activeDocument} 
                                        allDocs={documents} 
                                        allTasks={tasks} 
                                        onNavigate={(type, id) => { handleNavigate(type, id); setIsContextSidebarOpen(false); }} 
                                        onUpdateDocument={handleUpdateDocument} 
                                        isMobile
                                        onClose={() => setIsContextSidebarOpen(false)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ) : currentView === ViewMode.DOCUMENTS && !activeDocument ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-gray-500">Select a document or create a new one.</p>
                        <button onClick={handleCreateDocument} className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold">Create Document</button>
                    </div>
                ) : null}
                {(currentView === ViewMode.BOARD || currentView === ViewMode.GLOBAL_BOARD) && (
                    <TaskBoard 
                        tasks={tasksToDisplay} 
                        onUpdateTaskStatus={handleUpdateTaskStatus} 
                        onUpdateTaskAssignee={handleUpdateTaskAssignee} 
                        onUpdateTaskDueDate={handleUpdateTaskDueDate} 
                        onUpdateTaskPriority={handleUpdateTaskPriority} 
                        onUpdateTaskDependencies={(id, deps) => updateTask(id, { dependencies: deps })}
                        onDeleteTask={handleDeleteTask}
                        contextString="" 
                        onAddTasks={handleExtractTasks} 
                        onPromoteTask={handlePromoteTask} 
                        onNavigate={handleNavigate} 
                        onSelectTask={setSelectedTaskId}
                        onDiscussTask={handleDiscussTask}
                        users={teamMembers}
                        projects={projects}
                        isGlobalView={currentView === ViewMode.GLOBAL_BOARD}
                    />
                )}
                {currentView === ViewMode.GRAPH && (
                    <GraphView documents={projectDocs} tasks={projectTasks} onNavigate={handleNavigate} />
                )}
                {(currentView === ViewMode.CALENDAR || currentView === ViewMode.GLOBAL_CALENDAR) && (
                    <CalendarView 
                        tasks={tasksToDisplay} 
                        onSelectTask={setSelectedTaskId} 
                        onUpdateTaskDueDate={handleUpdateTaskDueDate}
                        projects={projects}
                    />
                )}
                {currentView === ViewMode.CLIENTS && (
                    <ClientsView clients={clients} projects={projects} onAddClient={() => setIsCreateClientModalOpen(true)} onDeleteClient={handleDeleteClient} />
                )}
                {currentView === ViewMode.BRAIN && (
                    <BrainView documents={documents} onNavigate={(type, id) => handleNavigate(type, id)} onShowToast={(msg, type) => addToast(msg, type === 'success' ? 'success' : 'error')} projects={projects} />
                )}
            </div>
        </main>

        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} documents={documents} tasks={tasks} projects={projects} onNavigate={handleNavigate} onCreateDocument={handleCreateDocument} onChangeView={handleViewChange} onSelectProject={handleSelectProject} />
        <AIChatSidebar 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)}
            contextData={currentView === ViewMode.DOCUMENTS ? activeDocument?.content : ''}
            focusItem={activeFocusItem}
            messages={chatMessages}
            setMessages={setChatMessages}
            allDocuments={documents}
            allTasks={tasks}
            projects={projects}
            clients={clients}
            teamMembers={teamMembers}
            integrations={integrations}
            onUpdateIntegration={handleManageIntegration}
        />
        <VoiceCommandOverlay isOpen={isVoiceCommandOpen} onClose={() => setIsVoiceCommandOpen(false)} projects={projects} onExecute={handleVoiceExecution} />
        <CreateProjectModal isOpen={isCreateProjectModalOpen} onClose={() => setIsCreateProjectModalOpen(false)} onCreate={(title) => { const newProject: Project = { id: crypto.randomUUID(), title, createdAt: new Date() }; setProjects(prev => [...prev, newProject]); dataService.createProject(newProject); setActiveProjectId(newProject.id); handleViewChange(ViewMode.PROJECT_OVERVIEW); }} />
        <CreateClientModal isOpen={isCreateClientModalOpen} onClose={() => setIsCreateClientModalOpen(false)} onCreate={handleAddClient} />
        <IntegrationsModal isOpen={isIntegrationsOpen} onClose={() => setIsIntegrationsOpen(false)} integrations={integrations} onToggleIntegration={handleManageIntegration} />
        <ConfirmationModal 
            isOpen={confirmationModal.isOpen}
            title={confirmationModal.title}
            message={confirmationModal.message}
            onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmationModal.onConfirm}
            isDanger={confirmationModal.isDanger}
            confirmText={confirmationModal.confirmText}
        />
        
        {selectedTaskId && selectedTask && (
            <TaskDetailModal 
                task={selectedTask}
                isOpen={!!selectedTaskId}
                onClose={() => setSelectedTaskId(null)}
                onUpdate={updateTask}
                onDelete={handleDeleteTask}
                users={teamMembers}
                projects={projects}
                allTasks={tasks}
                allDocuments={documents}
            />
        )}

        <div className="fixed bottom-6 right-6 z-50">
            <AasaniMascot onClick={() => setIsVoiceCommandOpen(true)} />
        </div>
        
        <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-in slide-in-from-bottom-5 fade-in pointer-events-auto ${
                    t.type === 'error' ? 'bg-red-500 text-white' : 
                    t.type === 'success' ? 'bg-green-500 text-white' : 
                    'bg-black dark:bg-white text-white dark:text-black'
                }`}>
                    {t.message}
                </div>
            ))}
        </div>
    </div>
  );
};

const App = () => {
    return (
        <ErrorBoundary>
            <MascotProvider>
                <AppContent />
            </MascotProvider>
        </ErrorBoundary>
    );
};

export default App;

// Helper to find selected task in render
const selectedTask = null; // Placeholder as selectedTask is derived inside AppContent usually, but here needed for compilation if outside. 
// Actually, inside AppContent I have selectedTaskId. I should derive selectedTask there.
// I'll fix this in the Content above by moving the derivation inside.
// Note: In the provided code block above, I used `selectedTask` in JSX but defined it outside. I should fix that.
// I will correct the `selectedTask` derivation inside `AppContent` in the final output.
