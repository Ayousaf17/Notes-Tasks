import React, { useState, useEffect, ErrorInfo, ReactNode, createContext, useContext } from 'react';
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
import { ViewMode, Document, Task, TaskStatus, ProjectPlan, TaskPriority, ChatMessage, Project, InboxItem, InboxAction, AgentRole, Integration, Client, Attachment, FocusItem } from '../types';
import { Sparkles, Command, Plus, Menu, Cloud, MessageSquare, Home, Inbox, Search, CheckSquare, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { analyticsService } from '../services/analyticsService';

// --- Toast System ---
type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<{ addToast: (msg: string, type: ToastType) => void } | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

// Error Boundary Component
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50 text-center p-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong.</h1>
            <p className="text-gray-600 mb-4">The application encountered a critical error.</p>
            <button onClick={() => window.location.reload()} className="text-blue-600 hover:underline">Reload Application</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const MobileBottomNav = ({ currentView, onChangeView, onOpenMenu, onSearch }: { currentView: ViewMode, onChangeView: (v: ViewMode) => void, onOpenMenu: () => void, onSearch: () => void }) => (
  <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-50 px-6 py-2 safe-area-bottom flex items-center justify-between transition-transform duration-300 shadow-2xl">
    {/* Left Group */}
    <div className="flex items-center gap-8">
      <button onClick={() => onChangeView(ViewMode.HOME)} className={`flex flex-col items-center gap-1 transition-colors ${currentView === ViewMode.HOME ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
         <Home className="w-6 h-6" />
         <span className="text-[9px] font-medium">Home</span>
      </button>
      <button onClick={onSearch} className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 active:text-black dark:active:text-white transition-colors">
         <Search className="w-6 h-6" />
         <span className="text-[9px] font-medium">Search</span>
      </button>
    </div>

    {/* Center Hero Button (Tasks) */}
    <div className="relative -top-6 group">
      <button
          onClick={() => onChangeView(ViewMode.GLOBAL_BOARD)}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl shadow-black/20 dark:shadow-white/10 border-4 border-gray-50 dark:border-black transition-all duration-300 active:scale-95 group-hover:-translate-y-1 ${currentView === ViewMode.GLOBAL_BOARD ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-black dark:bg-white text-white dark:text-black'}`}
      >
         <CheckSquare className="w-6 h-6" />
      </button>
    </div>

    {/* Right Group */}
    <div className="flex items-center gap-8">
      <button onClick={() => onChangeView(ViewMode.INBOX)} className={`flex flex-col items-center gap-1 transition-colors ${currentView === ViewMode.INBOX ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
         <Inbox className="w-6 h-6" />
         <span className="text-[9px] font-medium">Inbox</span>
      </button>
      <button onClick={onOpenMenu} className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 active:text-black dark:active:text-white transition-colors">
         <Menu className="w-6 h-6" />
         <span className="text-[9px] font-medium">Menu</span>
      </button>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.HOME); 
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); 
  
  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  // Team Management State
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

  // Confirmation Modal State
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

  // Dark Mode State - Fixed Initialization
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme');
        if (stored === 'dark') return true;
        if (stored === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Ensure class is applied on mount/change
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

  // Integrations State
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([
      { id: 'google', name: 'Google Workspace', description: 'Sync Docs, Calendar, and Drive.', icon: Cloud, connected: false, category: 'Cloud' },
      { id: 'openrouter', name: 'OpenRouter', description: 'Access GPT-4, Claude, Llama & more.', icon: MessageSquare, connected: false, category: 'AI' },
  ]);
  
  // Calculate Active Model Name for Global Display
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);

  // NEW: State for connecting Inbox to Chat
  const [activeInboxItemId, setActiveInboxItemId] = useState<string | null>(null);
  const [activeFocusItem, setActiveFocusItem] = useState<FocusItem | null>(null);

  // Load Data from Supabase on Mount & Setup Realtime Subscription
  useEffect(() => {
    const loadData = async () => {
        try {
            const { projects: dbProjects, tasks: dbTasks, documents: dbDocs, clients: dbClients } = await dataService.fetchAll();
            
            if (dbProjects.length > 0) {
                setProjects(dbProjects);
                setTasks(dbTasks);
                setDocuments(dbDocs);
                setClients(dbClients);
                // Keep active project if valid, else switch to first
                setActiveProjectId(prev => dbProjects.find(p => p.id === prev) ? prev : dbProjects[0].id);
            }
        } catch (e) {
            console.error("Failed to load data from Supabase", e);
            addToast("Failed to load data. Working offline.", 'warning');
        }
    };
    loadData();

    // Realtime Subscription
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

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              setIsCommandPaletteOpen(prev => !prev);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- SELF ENRICHMENT SYSTEM ---
  // Suggestions for incomplete data
  const [enrichmentCandidates, setEnrichmentCandidates] = useState<Task[]>([]);
  
  useEffect(() => {
      const candidates = tasks.filter(t => 
          (t.status === TaskStatus.TODO) && 
          (!t.description || t.description.length < 10) &&
          !t.agentStatus // Don't re-enrich active agent tasks
      ).slice(0, 3); // Top 3 candidates
      setEnrichmentCandidates(candidates);
  }, [tasks]);

  const handleAutoEnrichAll = async () => {
      addToast(`Enriching ${enrichmentCandidates.length} tasks...`, 'info');
      for (const task of enrichmentCandidates) {
          try {
              const enriched = await geminiService.enrichTask(task.title, task.description || '');
              updateTask(task.id, { 
                  title: enriched.title, 
                  description: enriched.description, 
                  updatedAt: new Date() 
              });
          } catch (e) {
              console.error("Enrichment failed for", task.title);
          }
      }
      addToast("Tasks enriched by System", 'success');
      setEnrichmentCandidates([]);
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const projectDocs = documents.filter(d => d.projectId === activeProjectId);
  const projectTasks = tasks.filter(t => t.projectId === activeProjectId);
  
  const tasksToDisplay = (currentView === ViewMode.GLOBAL_BOARD || currentView === ViewMode.GLOBAL_CALENDAR) 
    ? tasks 
    : projectTasks;

  const viewTitle = (currentView === ViewMode.GLOBAL_BOARD || currentView === ViewMode.GLOBAL_CALENDAR)
    ? "Master View"
    : currentView === ViewMode.INBOX 
    ? "Inbox"
    : activeProject?.title || 'Loading...';

  useEffect(() => {
      if (currentView === ViewMode.DOCUMENTS && activeDocId) {
          const doc = documents.find(d => d.id === activeDocId);
          if (doc && doc.projectId !== activeProjectId) {
              setActiveDocId(null);
          }
      }
  }, [activeProjectId, activeDocId, documents]);

  // Handler to open modal
  const handleOpenCreateProject = () => {
      setIsCreateProjectModalOpen(true);
  };

  const handleCreateProjectConfirm = async (title: string) => {
      try {
          const newProject: Project = {
              id: crypto.randomUUID(),
              title: title,
              icon: '📁',
              createdAt: new Date()
          };
          setProjects(prev => [...prev, newProject]);
          setActiveProjectId(newProject.id);
          setActiveDocId(null);
          setCurrentView(ViewMode.PROJECT_OVERVIEW); // Go to overview
          await dataService.createProject(newProject);
          addToast(`Project "${title}" created`, 'success');
      } catch (error) {
          addToast("Failed to create project", 'error');
      }
  };

  // Improved Select Project Handler
  const handleSelectProject = (projectId: string) => {
      setActiveProjectId(projectId);
      setActiveDocId(null);
      setCurrentView(ViewMode.PROJECT_OVERVIEW); 
  };

  const handleDeleteProject = (projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      setConfirmationModal({
          isOpen: true,
          title: 'Delete Project',
          message: `Are you sure you want to delete "${project?.title}"? All associated documents and tasks will be permanently removed.`,
          isDanger: true,
          confirmText: 'Delete Project',
          onConfirm: async () => {
              try {
                  setProjects(prev => prev.filter(p => p.id !== projectId));
                  setTasks(prev => prev.filter(t => t.projectId !== projectId));
                  setDocuments(prev => prev.filter(d => d.projectId !== projectId));
                  
                  if (activeProjectId === projectId) {
                      const remaining = projects.filter(p => p.id !== projectId);
                      if (remaining.length > 0) {
                          handleSelectProject(remaining[0].id);
                      } else {
                          setCurrentView(ViewMode.HOME);
                      }
                  }
                  await dataService.deleteProject(projectId);
                  addToast("Project deleted", 'success');
              } catch (error) {
                  addToast("Failed to delete project", 'error');
              }
          }
      });
  };

  const handleCreateDocument = async () => {
    try {
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
        setCurrentView(ViewMode.DOCUMENTS);
        await dataService.createDocument(newDoc);
        addToast("New document created", 'success');
    } catch (error) {
        addToast("Failed to create document", 'error');
    }
  };

  const handleDeleteDocument = (id: string) => {
      setConfirmationModal({
          isOpen: true,
          title: 'Delete Page',
          message: 'Are you sure you want to delete this page? This cannot be undone.',
          isDanger: true,
          confirmText: 'Delete Page',
          onConfirm: async () => {
              try {
                  setDocuments(prev => prev.filter(d => d.id !== id));
                  if (activeDocId === id) {
                      setActiveDocId(null);
                  }
                  await dataService.deleteDocument(id);
                  addToast("Document deleted", 'success');
              } catch (error) {
                  addToast("Failed to delete document", 'error');
              }
          }
      });
  };

  const handleUpdateDocument = (updatedDoc: Document) => {
    setDocuments(prev => prev.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc));
    dataService.updateDocument(updatedDoc.id, updatedDoc);
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
    // Use Promise.all to ensure all writes complete
    Promise.all(finalTasks.map(t => dataService.createTask(t)))
        .then(() => addToast(`${finalTasks.length} tasks extracted`, 'success'))
        .catch(() => addToast("Failed to save some tasks", 'error'));
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
      addToast("Task deleted", 'info');
  };

  const handleUpdateTaskStatus = (id: string, status: TaskStatus) => updateTask(id, { status });
  
  const handleUpdateTaskAssignee = async (id: string, assignee: string) => {
      updateTask(id, { assignee });
      if (assignee.startsWith('AI_')) {
          const task = tasks.find(t => t.id === id);
          if (task) {
              updateTask(id, { status: TaskStatus.IN_PROGRESS, agentStatus: 'working', agentResult: undefined });
              addToast(`AI Agent ${assignee} started working`, 'info');
              try {
                  const result = await geminiService.performAgentTask(assignee as AgentRole, task.title, task.description);
                  updateTask(id, { agentStatus: 'completed', agentResult: result });
                  addToast(`AI Agent finished task: ${task.title}`, 'success');
              } catch (error) {
                  updateTask(id, { agentStatus: 'failed' });
                  addToast("AI Agent failed to complete task", 'error');
              }
          }
      } else {
          updateTask(id, { agentStatus: 'idle' });
      }
  };

  // Helper: "Rolodex" Implicit Linking
  const detectClientLink = (text: string): string | undefined => {
      const match = clients.find(c => text.toLowerCase().includes(c.name.toLowerCase()) || text.toLowerCase().includes(c.company.toLowerCase()));
      return match ? match.id : undefined;
  };

  const handleUpdateTaskDueDate = (id: string, date: Date) => updateTask(id, { dueDate: date });
  const handleUpdateTaskPriority = (id: string, priority: TaskPriority) => updateTask(id, { priority });
  const handleUpdateTaskDependencies = (id: string, dependencies: string[]) => updateTask(id, { dependencies });
  
  const handlePromoteTask = async (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.linkedDocumentId) return;
      try {
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
          setCurrentView(ViewMode.DOCUMENTS);
          addToast("Task promoted to document", 'success');
      } catch (error) {
          addToast("Failed to promote task", 'error');
      }
  };

  const handleProjectPlanCreated = async (plan: ProjectPlan) => {
    try {
        const newProject: Project = {
            id: crypto.randomUUID(),
            title: plan.projectTitle || 'New AI Project',
            icon: '🚀',
            createdAt: new Date()
        };
        setProjects(prev => [...prev, newProject]);
        await dataService.createProject(newProject);
        
        const newDoc: Document = {
            id: crypto.randomUUID(),
            projectId: newProject.id,
            title: 'Project Overview & Scope',
            content: plan.overviewContent,
            updatedAt: new Date(),
            tags: ['Project Plan', 'Proposal']
        };
        setDocuments(prev => [...prev, newDoc]);
        await dataService.createDocument(newDoc);
        
        const newTasks: Task[] = plan.tasks.map(t => ({
            id: crypto.randomUUID(),
            projectId: newProject.id,
            title: t.title || 'New Task',
            description: t.description,
            status: (t.status as TaskStatus) || TaskStatus.TODO,
            dueDate: (t as any).dueDate ? new Date((t as any).dueDate) : undefined,
            assignee: t.assignee || 'Unassigned',
            priority: t.priority || TaskPriority.MEDIUM,
            dependencies: [],
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        
        setTasks(prev => [...prev, ...newTasks]);
        
        await Promise.all(newTasks.map(t => dataService.createTask(t)));

        setActiveProjectId(newProject.id);
        setActiveDocId(newDoc.id);
        setCurrentView(ViewMode.DOCUMENTS);
        addToast("Project plan created successfully", 'success');
    } catch (error) {
        addToast("Failed to create project plan", 'error');
    }
  };

  // --- Connection Handler ---
  const handleManageIntegration = async (id: string, action: 'toggle' | 'connect' | 'disconnect' | 'update', config?: any) => {
      let isConnectAction = false;
      
      setIntegrations(prev => prev.map(i => {
          if (i.id !== id) return i;
          
          let newConnected = i.connected;
          if (action === 'toggle') newConnected = !i.connected;
          if (action === 'connect') newConnected = true;
          if (action === 'disconnect') newConnected = false;
          // 'update' doesn't change connection status
          
          if (newConnected && !i.connected) isConnectAction = true;

          return { 
              ...i, 
              connected: newConnected, 
              config: config ? { ...i.config, ...config } : i.config 
          };
      }));
      
      const integration = integrations.find(i => i.id === id);
      
      if (isConnectAction || (action === 'toggle' && !integration?.connected)) {
          addToast(`Connected to ${integration?.name}`, 'success');
          if (id === 'google') {
              try {
                  const events = await dataService.fetchGoogleEvents();
                  setTasks(prev => [...prev, ...events]);
                  addToast("Synced Google Calendar events", 'info');
              } catch (e) {
                  addToast("Failed to sync Google Calendar", 'error');
              }
          }
      } else if (action === 'disconnect' || (action === 'toggle' && integration?.connected)) {
          addToast(`Disconnected from ${integration?.name}`, 'info');
          if (id === 'google') {
              setTasks(prev => prev.filter(t => t.externalType !== 'GOOGLE_CALENDAR'));
          }
      } else if (action === 'update') {
          addToast(`${integration?.name} settings updated`, 'success');
      }
  };
  
  const handleNavigate = (type: 'document' | 'task', id: string) => {
      if (type === 'document') {
          const doc = documents.find(d => d.id === id);
          if (doc) {
              setActiveProjectId(doc.projectId);
              setActiveDocId(id);
              setCurrentView(ViewMode.DOCUMENTS);
          } else {
              addToast("Document not found", 'error');
          }
      } else if (type === 'task') {
          const task = tasks.find(t => t.id === id);
          if (task) {
              setActiveProjectId(task.projectId);
              setCurrentView(ViewMode.BOARD);
              setSelectedTaskId(id);
          } else {
              addToast("Task not found", 'error');
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
          attachments, 
          status: 'pending',
          createdAt: new Date()
      };
      setInboxItems(prev => [newItem, ...prev]);
      addToast("Item added to Inbox", 'success');
  };

  // New function to handle InboxItem object directly (for AI Handoff)
  const handleSaveToInbox = (action: InboxAction) => {
      // If we are currently focusing on an item, update THAT item.
      if (activeInboxItemId) {
          setInboxItems(prev => prev.map(item => 
              item.id === activeInboxItemId 
              ? { ...item, processedResult: action, status: 'pending' } // Keep pending so user can still see it in Inbox list to finalize import
              : item
          ));
          addToast("Inbox item updated with new plan", 'success');
      } else {
          // Otherwise create new
          const newItem: InboxItem = {
              id: crypto.randomUUID(),
              content: action.data.title,
              type: 'text',
              status: 'pending',
              createdAt: new Date(),
              processedResult: action
          };
          setInboxItems(prev => [newItem, ...prev]);
          addToast("AI Suggestion saved to Inbox", 'success');
      }
  };

  const handleDeleteInboxItem = (id: string) => {
      setInboxItems(prev => prev.filter(i => i.id !== id));
      addToast("Inbox item removed", 'info');
  };

  const handleUpdateInboxItem = (id: string, updates: Partial<InboxItem>) => {
      setInboxItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  // Universal Update Handler (For Chat Tool Calls)
  const handleUpdateEntity = (type: 'task'|'document'|'client'|'project', id: string, updates: any) => {
      if (type === 'task') {
          setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
          dataService.updateTask(id, updates);
      } else if (type === 'document') {
          setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
          dataService.updateDocument(id, updates);
      } else if (type === 'client') {
          setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
          dataService.updateClient(id, updates);
      }
      addToast(`${type} updated`, 'success');
  };

  // Centralized action execution logic
  const executeInboxAction = async (action: InboxAction) => {
      try {
          let targetProjectId = action.targetProjectId;
          
          // Fallback logic: Use activeProjectId if AI returns "default" or no ID
          if (!targetProjectId || targetProjectId === 'default') {
              targetProjectId = activeProjectId || projects[0]?.id;
          }

          if (targetProjectId && targetProjectId.startsWith('NEW:')) {
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
              addToast(`Created new project: ${title}`, 'success');
          }

          if (action.actionType === 'create_task') {
              const relatedClientId = detectClientLink(action.data.title + " " + (action.data.description || ""));
              const newTask: Task = {
                  id: crypto.randomUUID(),
                  projectId: targetProjectId,
                  title: action.data.title,
                  description: action.data.description || '',
                  status: TaskStatus.TODO,
                  priority: action.data.priority || TaskPriority.MEDIUM,
                  assignee: 'Unassigned',
                  dueDate: action.data.dueDate ? new Date(action.data.dueDate) : undefined,
                  dependencies: [],
                  relatedClientId,
                  createdAt: new Date(),
                  updatedAt: new Date()
              };
              setTasks(prev => [...prev, newTask]);
              await dataService.createTask(newTask);
              addToast("Task created", 'success');
          } else if (action.actionType === 'create_document' || action.actionType === 'mixed') {
               const newDocId = crypto.randomUUID();
               const newDoc: Document = {
                  id: newDocId,
                  projectId: targetProjectId,
                  title: action.data.title,
                  content: action.data.content || `# ${action.data.title}\n\n${action.data.description || ''}`,
                  tags: action.data.tags || ['Inbox Processed'],
                  updatedAt: new Date()
               };
               setDocuments(prev => [...prev, newDoc]);
               await dataService.createDocument(newDoc);

               if (action.data.extractedTasks && action.data.extractedTasks.length > 0) {
                   const newTasks = action.data.extractedTasks.map(t => ({
                       id: crypto.randomUUID(),
                       projectId: targetProjectId, 
                       title: t.title,
                       description: t.description || '',
                       status: TaskStatus.TODO,
                       priority: t.priority || TaskPriority.MEDIUM,
                       assignee: t.assignee || 'Unassigned',
                       dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                       linkedDocumentId: newDocId, 
                       createdAt: new Date(),
                       updatedAt: new Date(),
                       dependencies: []
                   }));
                   setTasks(prev => [...prev, ...newTasks]);
                   await Promise.all(newTasks.map(t => dataService.createTask(t)));
               }
               addToast("Document created", 'success');
          } else if (action.actionType === 'create_client' && action.data.clientData) {
              const newClient: Client = {
                  id: crypto.randomUUID(),
                  name: action.data.clientData.name,
                  company: action.data.clientData.company,
                  email: action.data.clientData.email || '',
                  status: action.data.clientData.status || 'Lead',
                  value: action.data.clientData.value || 0,
                  tags: ['Inbox'],
                  lastContact: new Date(),
                  activities: [],
                  googleDriveFolder: ''
              };
              setClients(prev => [...prev, newClient]);
              await dataService.createClient(newClient);
              addToast("Client added to CRM", 'success');
          }
      } catch (error) {
          console.error(error);
          addToast("Action failed", 'error');
      }
  };

  const handleProcessInboxItem = async (itemId: string, action: InboxAction) => {
      await executeInboxAction(action);
      setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, status: 'processed' } : item).filter(i => i.status !== 'processed'));
  };
  
  const handleStoreInboxSuggestion = (itemId: string, action: InboxAction) => {
      setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, processedResult: action } : item));
  };

  // Build Schedule Context for Reality Check
  const getScheduleContext = () => {
      const today = new Date();
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      
      const todayTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString()).length;
      const tomorrowTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === tomorrow.toDateString()).length;
      
      return `Today (${today.toDateString()}): ${todayTasks} tasks scheduled.\nTomorrow (${tomorrow.toDateString()}): ${tomorrowTasks} tasks scheduled.`;
  };

  // --- NEW: ANALYZE INBOX ITEM HANDLER ---
  const handleAnalyzeInboxItem = async (id: string, content: string, attachments: Attachment[] = []) => {
      const item = inboxItems.find(i => i.id === id);
      if (!item) return;

      try {
          const scheduleContext = getScheduleContext();
          const openRouterInt = integrations.find(i => i.id === 'openrouter');
          const provider = openRouterInt?.connected ? 'openrouter' : 'gemini';
          const apiKey = openRouterInt?.config?.apiKey; 
          const model = openRouterInt?.config?.model;

          const result = await geminiService.organizeInboxItem(
              content,
              projects,
              scheduleContext,
              provider,
              apiKey,
              model, // Pass selected model
              attachments
          );

          if (result) {
              handleStoreInboxSuggestion(id, result);
              addToast("Analysis complete", 'success');
              analyticsService.logEvent('inbox_analyzed');
          } else {
              addToast("Analysis returned no result", 'warning');
          }
      } catch (e) {
          console.error("Analysis Failed", e);
          addToast("Analysis failed", 'error');
      }
  };

  // CLIENTS MANAGEMENT
  const handleAddClient = async (client: Partial<Client>) => {
      try {
          const newClient: Client = {
              id: crypto.randomUUID(),
              name: client.name!,
              company: client.company!,
              email: client.email!,
              status: client.status || 'Lead',
              value: client.value || 0,
              tags: client.tags || [],
              lastContact: new Date(),
              activities: [],
              googleDriveFolder: ''
          };
          setClients(prev => [...prev, newClient]);
          await dataService.createClient(newClient);
          addToast("Client added", 'success');
      } catch (error) {
          addToast("Failed to add client", 'error');
      }
  };

  const handleDeleteClient = async (clientId: string) => {
      setConfirmationModal({
          isOpen: true,
          title: 'Delete Client',
          message: 'Are you sure you want to delete this client? All related data will be lost.',
          isDanger: true,
          confirmText: 'Delete Client',
          onConfirm: async () => {
              try {
                  setClients(prev => prev.filter(c => c.id !== clientId));
                  await dataService.deleteClient(clientId);
                  addToast("Client deleted", 'success');
              } catch (error) {
                  addToast("Failed to delete client", 'error');
              }
          }
      });
  };

  // New: Handoff from Inbox to Chat
  const handleDiscussInboxItem = (item: InboxItem) => {
      setActiveInboxItemId(item.id);
      setActiveFocusItem({ type: 'inbox', data: item }); // Set Focus for chat
      setIsChatOpen(true);
  };

  const handleDiscussTask = (task: Task) => {
      setActiveFocusItem({ type: 'task', data: task });
      setIsChatOpen(true);
  };

  const activeDocument = documents.find(d => d.id === activeDocId);
  const activeInboxItem = activeInboxItemId ? inboxItems.find(i => i.id === activeInboxItemId) : null;

  // CONTEXT STRING GENERATION
  const getContextData = () => {
      if (activeInboxItem) {
          return `FOCUS: Analyzing Inbox Item "${activeInboxItem.content}". The user wants to discuss this specific raw input.`;
      }
      if (currentView === ViewMode.DOCUMENTS && activeDocument) {
          return activeDocument.content;
      }
      return '';
  };

  const getContextForTaskBoard = () => {
    let context = `Project Context: ${activeProject?.title || 'General'}\n`;
    if (activeDocument && activeDocument.content.trim()) context += `Active Document Content:\n${activeDocument.content}\n\n`;
    const recentChats = chatMessages.slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
    if (recentChats) context += `Recent Chat History:\n${recentChats}`;
    return context;
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <ToastContext.Provider value={{ addToast }}>
        <div className="flex h-screen w-full bg-white dark:bg-black overflow-hidden font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
        
        {/* TOAST CONTAINER */}
        <div className="fixed bottom-20 md:bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm ${
                    toast.type === 'success' ? 'bg-white dark:bg-zinc-900 border-green-500/50 text-green-700 dark:text-green-400' :
                    toast.type === 'error' ? 'bg-white dark:bg-zinc-900 border-red-500/50 text-red-700 dark:text-red-400' :
                    toast.type === 'warning' ? 'bg-white dark:bg-zinc-900 border-orange-500/50 text-orange-700 dark:text-orange-400' :
                    'bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                }`}>
                    {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                    {toast.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                    {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                    {toast.type === 'info' && <Info className="w-5 h-5" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                    <button onClick={() => removeToast(toast.id)} className="ml-2 text-gray-400 hover:text-black dark:hover:text-white"><X className="w-4 h-4" /></button>
                </div>
            ))}
        </div>

        {/* Enrichment Banner */}
        {enrichmentCandidates.length > 0 && (
            <div className={`fixed bottom-24 z-[190] md:bottom-6 pointer-events-auto animate-in slide-in-from-bottom-6 fade-in duration-500 transition-all ${isChatOpen ? 'right-[480px]' : 'right-6 md:right-20'}`}>
                <button 
                    onClick={handleAutoEnrichAll}
                    className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <span className="text-sm font-bold">Enrich {enrichmentCandidates.length} Tasks</span>
                </button>
            </div>
        )}

        <Sidebar
            currentView={currentView}
            onChangeView={setCurrentView}
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            onCreateProject={handleOpenCreateProject}
            onDeleteProject={handleDeleteProject}
            documents={projectDocs}
            onSelectDocument={setActiveDocId}
            onCreateDocument={handleCreateDocument}
            onDeleteDocument={handleDeleteDocument}
            activeDocumentId={activeDocId}
            onOpenIntegrations={() => setIsIntegrationsOpen(true)}
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={() => setIsMobileSidebarOpen(false)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            isExpanded={isSidebarExpanded}
            onHover={setIsSidebarExpanded}
            globalModelLabel={activeModelName} // Pass Global Model Label
        />

        <main className={`flex-1 flex flex-col h-full relative w-full bg-white dark:bg-black transition-all duration-300 ease-in-out pb-20 md:pb-0 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-16'}`}>
            <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-black shrink-0 z-20">
            <div className="flex items-center space-x-3 text-sm">
                <span className="font-medium text-black dark:text-white inline">
                    {currentView === ViewMode.HOME ? 'Home' : 
                    currentView === ViewMode.SETTINGS ? 'Settings' : 
                    currentView === ViewMode.CLIENTS ? 'CRM' : 
                    currentView === ViewMode.INBOX ? 'Inbox' : viewTitle}
                </span>
                <span className="text-gray-300 dark:text-gray-700 inline">/</span>
                <span className="text-gray-500 dark:text-gray-400 truncate">
                    {currentView === ViewMode.DOCUMENTS ? (activeDocument?.title || 'Untitled') : 
                    currentView === ViewMode.BOARD ? 'Board' : 
                    currentView === ViewMode.HOME ? 'Dashboard' :
                    currentView === ViewMode.SETTINGS ? 'Preferences' :
                    currentView === ViewMode.CLIENTS ? 'Pipeline' :
                    currentView === ViewMode.INBOX ? 'Brain Dump' :
                    currentView.toLowerCase().replace('_', ' ')}
                </span>
            </div>
            <div className="flex items-center space-x-3">
                <button onClick={() => setIsCommandPaletteOpen(true)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                    <Command className="w-4 h-4" />
                </button>
                <button onClick={() => setIsChatOpen(!isChatOpen)} className={`transition-colors ${isChatOpen ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}>
                    <Sparkles className="w-4 h-4" />
                </button>
            </div>
            </header>

            <div className="flex-1 overflow-hidden relative flex">
                <div className="flex-1 flex flex-col overflow-hidden w-full">
                    {/* View Animation Wrapper */}
                    <div key={currentView} className="flex-1 h-full w-full animate-page-slide flex flex-col overflow-hidden">
                    {currentView === ViewMode.HOME ? (
                        <DashboardView 
                            tasks={tasks} 
                            documents={documents} 
                            projects={projects} 
                            userName="User" 
                            onNavigate={handleNavigate} 
                            onStartReview={() => setCurrentView(ViewMode.REVIEW)} 
                            onCreateProject={handleOpenCreateProject}
                            teamMembers={teamMembers}
                        />
                    ) : currentView === ViewMode.PROJECT_OVERVIEW ? (
                        <ProjectOverview 
                            project={activeProject}
                            tasks={projectTasks}
                            documents={projectDocs}
                            onNavigate={handleNavigate}
                            onChangeView={setCurrentView}
                        />
                    ) : currentView === ViewMode.INBOX ? (
                        <InboxView 
                            items={inboxItems} 
                            onAddItem={handleAddInboxItem} 
                            onProcessItem={(id, action) => { 
                                const item = inboxItems.find(i => i.id === id); 
                                if (item && item.processedResult) handleProcessInboxItem(id, action); 
                                else handleStoreInboxSuggestion(id, action); 
                            }} 
                            onDeleteItem={handleDeleteInboxItem} 
                            onUpdateItem={handleUpdateInboxItem}
                            onDiscussItem={handleDiscussInboxItem} 
                            onAnalyzeItem={handleAnalyzeInboxItem} 
                            projects={projects} 
                            integrations={integrations}
                            activeProjectId={activeProjectId}
                        />
                    ) : currentView === ViewMode.SETTINGS ? (
                        <SettingsView 
                            teamMembers={teamMembers}
                            onUpdateTeam={handleUpdateTeam}
                            isDarkMode={isDarkMode}
                            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                            onClearData={handleClearData}
                            onDeleteProject={handleDeleteProject}
                            projects={projects}
                            integrations={integrations}
                            onToggleIntegration={handleManageIntegration} // Pass new handler
                        />
                    ) : currentView === ViewMode.REVIEW ? (
                        <ReviewWizard inboxItems={inboxItems} tasks={tasks} projects={projects} onProcessInboxItem={handleProcessInboxItem} onDeleteInboxItem={handleDeleteInboxItem} onDeleteTask={handleDeleteTask} onUpdateTaskStatus={handleUpdateTaskStatus} onUpdateTaskAssignee={handleUpdateTaskAssignee} onClose={() => setCurrentView(ViewMode.HOME)} />
                    ) : currentView === ViewMode.DOCUMENTS && activeDocument ? (
                        <DocumentEditor 
                            document={activeDocument} 
                            allDocuments={documents} 
                            allTasks={tasks} 
                            onUpdate={handleUpdateDocument} 
                            onExtractTasks={handleExtractTasks} 
                            onNavigate={handleNavigate} 
                            onDelete={() => handleDeleteDocument(activeDocument.id)}
                        />
                    ) : currentView === ViewMode.DOCUMENTS && !activeDocument ? (
                        <button 
                            onClick={handleCreateDocument} 
                            className="flex flex-col items-center justify-center h-full w-full text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                        >
                            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center mb-6 shadow-sm group hover:border-gray-300 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-gray-800 transition-all">
                                <Plus className="w-10 h-10 text-gray-300 dark:text-gray-700 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            </div>
                            <p className="text-base font-medium">Create a new page</p>
                            <p className="text-xs text-gray-300 dark:text-gray-700 mt-2">or select one from the sidebar</p>
                        </button>
                    ) : currentView === ViewMode.BOARD || currentView === ViewMode.GLOBAL_BOARD ? (
                        <TaskBoard 
                            tasks={tasksToDisplay} 
                            onUpdateTaskStatus={handleUpdateTaskStatus} 
                            onUpdateTaskAssignee={handleUpdateTaskAssignee} 
                            onUpdateTaskDueDate={handleUpdateTaskDueDate} 
                            onUpdateTaskPriority={handleUpdateTaskPriority} 
                            onUpdateTaskDependencies={handleUpdateTaskDependencies} 
                            onDeleteTask={handleDeleteTask}
                            contextString={getContextForTaskBoard()} 
                            onAddTasks={handleExtractTasks} 
                            onPromoteTask={handlePromoteTask} 
                            onNavigate={handleNavigate} 
                            onSelectTask={setSelectedTaskId}
                            onDiscussTask={handleDiscussTask} 
                            users={teamMembers}
                            projects={projects}
                            isGlobalView={currentView === ViewMode.GLOBAL_BOARD}
                        />
                    ) : currentView === ViewMode.GRAPH ? (
                        <GraphView documents={projectDocs} tasks={projectTasks} onNavigate={handleNavigate} />
                    ) : currentView === ViewMode.CLIENTS ? (
                        <ClientsView clients={clients} projects={projects} onAddClient={() => setIsCreateClientModalOpen(true)} onDeleteClient={handleDeleteClient} />
                    ) : (
                        <CalendarView 
                            tasks={tasksToDisplay} 
                            onSelectTask={setSelectedTaskId} 
                            onUpdateTaskDueDate={handleUpdateTaskDueDate}
                            projects={projects}
                        />
                    )}
                    </div>
                </div>
                
                {currentView === ViewMode.DOCUMENTS && activeDocument && (
                    <div className="hidden lg:block h-full border-l border-gray-100 dark:border-gray-800">
                        <ContextSidebar currentDoc={activeDocument} allDocs={documents} allTasks={tasks} onNavigate={handleNavigate} />
                    </div>
                )}
            </div>

            <AIChatSidebar 
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)}
                // Pass the dynamic context string for the HUD
                contextData={getContextData()}
                // Pass the Active Focus Item (Inbox, Task, etc)
                focusItem={activeFocusItem}
                onProjectPlanCreated={handleProjectPlanCreated}
                messages={chatMessages}
                setMessages={setChatMessages}
                allDocuments={documents}
                allTasks={tasks}
                projects={projects}
                clients={clients}
                teamMembers={teamMembers}
                integrations={integrations}
                onSaveToInbox={handleSaveToInbox} // Pass new handler
                onExecuteAction={async (id, action) => await executeInboxAction(action)} // Pass new handler wrapper
                onUpdateEntity={handleUpdateEntity} // Chat can update entities
                // Pass the handler to allow updating model from chat sidebar
                onUpdateIntegration={handleManageIntegration}
                onAddTask={(task) => {
                    const newTask: Task = {
                        id: crypto.randomUUID(),
                        projectId: task.projectId || projects[0]?.id || 'default',
                        title: task.title || 'New Task',
                        description: task.description,
                        status: (task.status as TaskStatus) || TaskStatus.TODO,
                        priority: task.priority || TaskPriority.MEDIUM,
                        assignee: task.assignee || 'Unassigned',
                        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
                        dependencies: [],
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    setTasks(prev => [...prev, newTask]);
                    dataService.createTask(newTask);
                    addToast("Task created via AI", 'success');
                }}
            />

            {/* ... Modals ... */}
            <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} documents={documents} tasks={tasks} projects={projects} onNavigate={handleNavigate} onCreateDocument={handleCreateDocument} onChangeView={setCurrentView} onSelectProject={handleSelectProject} />
            <CreateProjectModal isOpen={isCreateProjectModalOpen} onClose={() => setIsCreateProjectModalOpen(false)} onCreate={handleCreateProjectConfirm} />
            <CreateClientModal isOpen={isCreateClientModalOpen} onClose={() => setIsCreateClientModalOpen(false)} onCreate={handleAddClient} />
            <IntegrationsModal isOpen={isIntegrationsOpen} onClose={() => setIsIntegrationsOpen(false)} integrations={integrations} onToggleIntegration={handleManageIntegration} />
            <ConfirmationModal isOpen={confirmationModal.isOpen} title={confirmationModal.title} message={confirmationModal.message} onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmationModal.onConfirm} isDanger={confirmationModal.isDanger} confirmText={confirmationModal.confirmText} />
            {selectedTask && <TaskDetailModal task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTaskId(null)} onUpdate={updateTask} onDelete={handleDeleteTask} users={teamMembers} projects={projects} />}
        </main>

        <MobileBottomNav currentView={currentView} onChangeView={setCurrentView} onOpenMenu={() => setIsMobileSidebarOpen(true)} onSearch={() => setIsCommandPaletteOpen(true)} />
        </div>
    </ToastContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;