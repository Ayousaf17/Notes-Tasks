import React, { useState, useEffect, ErrorInfo, ReactNode, createContext, useContext, Component } from 'react';
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
import { ViewMode, Document, Task, TaskStatus, ProjectPlan, TaskPriority, ChatMessage, Project, InboxItem, InboxAction, AgentRole, Integration, Client, Attachment, FocusItem } from '../types';
import { Sparkles, Command, Plus, Menu, Cloud, MessageSquare, Home, Inbox, Search, CheckSquare, X, CheckCircle, AlertTriangle, Info, Mic } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { analyticsService } from '../services/analyticsService';
import { MascotProvider, useMascot } from '../contexts/MascotContext';
import { AasaniMascot } from './AasaniMascot';

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

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-background text-center p-4 text-foreground">
          <div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong.</h1>
            <p className="text-muted-foreground mb-4">The application encountered a critical error.</p>
            <button onClick={() => window.location.reload()} className="text-primary hover:underline">Reload Application</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const MobileBottomNav = ({ currentView, onChangeView, onOpenMenu, onSearch }: { currentView: ViewMode, onChangeView: (v: ViewMode) => void, onOpenMenu: () => void, onSearch: () => void }) => (
  <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border z-50 px-6 py-2 safe-area-bottom flex items-center justify-between transition-transform duration-300 shadow-2xl">
    {/* Left Group */}
    <div className="flex items-center gap-8">
      <button onClick={() => onChangeView(ViewMode.HOME)} className={`flex flex-col items-center gap-1 transition-colors ${currentView === ViewMode.HOME ? 'text-foreground' : 'text-muted-foreground'}`}>
         <Home className="w-6 h-6" />
         <span className="text-[9px] font-medium">Home</span>
      </button>
      <button onClick={onSearch} className="flex flex-col items-center gap-1 text-muted-foreground active:text-foreground transition-colors">
         <Search className="w-6 h-6" />
         <span className="text-[9px] font-medium">Search</span>
      </button>
    </div>

    {/* Center Hero Button (Tasks) */}
    <div className="relative -top-6 group">
      <button
          onClick={() => onChangeView(ViewMode.GLOBAL_BOARD)}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl border-4 border-background transition-all duration-300 active:scale-95 group-hover:-translate-y-1 ${currentView === ViewMode.GLOBAL_BOARD ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground'}`}
      >
         <CheckSquare className="w-6 h-6" />
      </button>
    </div>

    {/* Right Group */}
    <div className="flex items-center gap-8">
      <button onClick={() => onChangeView(ViewMode.INBOX)} className={`flex flex-col items-center gap-1 transition-colors ${currentView === ViewMode.INBOX ? 'text-foreground' : 'text-muted-foreground'}`}>
         <Inbox className="w-6 h-6" />
         <span className="text-[9px] font-medium">Inbox</span>
      </button>
      <button onClick={onOpenMenu} className="flex flex-col items-center gap-1 text-muted-foreground active:text-foreground transition-colors">
         <Menu className="w-6 h-6" />
         <span className="text-[9px] font-medium">Menu</span>
      </button>
    </div>
  </div>
);

// Wrapper to inject Mascot Context features into AppContent logic
const AppContentWithMascotFeatures: React.FC<{
    projects: Project[];
    tasks: Task[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    documents: Document[];
    setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    loadData: () => Promise<void>;
}> = ({ projects, tasks, setProjects, setTasks, documents, setDocuments, clients, setClients, loadData }) => {
    // This is essentially main logic but separated to allow useMascot hook access if needed higher up, 
    // but for simplicity we'll keep main logic in AppContent and just use mascot here.
    // Actually, refactoring the entire large component is risky. 
    // Instead, we will wrap the Mascot call at the end of the return statement of AppContent.
    return null; 
};

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

  // Mascot Context to trigger whisper
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
                
                // TRIGGER MASCOT WHISPER ON LOAD
                geminiService.generateMascotWhisper(dbTasks, dbProjects).then(whisper => {
                    setTimeout(() => say(whisper, 8000, 'thinking'), 2000);
                });
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

  const [enrichmentCandidates, setEnrichmentCandidates] = useState<Task[]>([]);
  
  useEffect(() => {
      const candidates = tasks.filter(t => 
          (t.status === TaskStatus.TODO) && 
          (!t.description || t.description.length < 10) &&
          !t.agentStatus 
      ).slice(0, 3);
      setEnrichmentCandidates(candidates);
  }, [tasks]);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const projectDocs = documents.filter(d => d.projectId === activeProjectId);
  const projectTasks = tasks.filter(t => t.projectId === activeProjectId);
  
  const tasksToDisplay = (currentView === ViewMode.GLOBAL_BOARD || currentView === ViewMode.GLOBAL_CALENDAR) 
    ? tasks 
    : projectTasks;

  const handleOpenCreateProject = () => setIsCreateProjectModalOpen(true);
  const handleSelectProject = (projectId: string) => {
      setActiveProjectId(projectId);
      setActiveDocId(null);
      setCurrentView(ViewMode.PROJECT_OVERVIEW); 
  };
  const handleManageIntegration = async (id: string, action: 'toggle' | 'connect' | 'disconnect' | 'update', config?: any) => {
      let isConnectAction = false;
      setIntegrations(prev => prev.map(i => {
          if (i.id !== id) return i;
          let newConnected = i.connected;
          if (action === 'toggle') newConnected = !i.connected;
          if (action === 'connect') newConnected = true;
          if (action === 'disconnect') newConnected = false;
          if (newConnected && !i.connected) isConnectAction = true;
          return { ...i, connected: newConnected, config: config ? { ...i.config, ...config } : i.config };
      }));
      const integration = integrations.find(i => i.id === id);
      if (isConnectAction || (action === 'toggle' && !integration?.connected)) {
          addToast(`Connected to ${integration?.name}`, 'success');
      }
  };

  const createNewProject = async (title: string) => {
      const newProject: Project = {
          id: crypto.randomUUID(),
          title: title,
          icon: '📁',
          createdAt: new Date()
      };
      setProjects(prev => [...prev, newProject]);
      setActiveProjectId(newProject.id);
      await dataService.createProject(newProject);
      return newProject.id;
  };

  const handleVoiceExecution = async (type: string, data: any) => {
      if (type === 'create_task') {
          const targetProjectId = data.projectId === 'default' ? activeProjectId : data.projectId;
          const newTask: Task = {
              id: crypto.randomUUID(),
              projectId: targetProjectId || projects[0]?.id,
              title: data.title,
              description: '',
              status: TaskStatus.TODO,
              priority: data.priority === 'High' ? TaskPriority.HIGH : data.priority === 'Low' ? TaskPriority.LOW : TaskPriority.MEDIUM,
              assignee: 'Unassigned',
              dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
              createdAt: new Date(),
              updatedAt: new Date()
          };
          setTasks(prev => [...prev, newTask]);
          await dataService.createTask(newTask);
          addToast("Task created via voice", 'success');
      } else if (type === 'create_note') {
          handleAddInboxItem(data.content, 'text');
          addToast("Note saved to inbox", 'success');
      } else if (type === 'navigate') {
          const view = data.view?.toUpperCase();
          if (ViewMode[view as keyof typeof ViewMode]) {
              setCurrentView(ViewMode[view as keyof typeof ViewMode]);
              addToast(`Navigated to ${data.view}`, 'info');
          }
      }
  };

  const handleCreateProjectConfirm = async (title: string) => { await createNewProject(title); addToast(`Project "${title}" created`, 'success'); };
  const handleDeleteProject = (id: string) => { 
      setProjects(prev => prev.filter(p => p.id !== id));
      setTasks(prev => prev.filter(t => t.projectId !== id));
      setDocuments(prev => prev.filter(d => d.projectId !== id));
      dataService.deleteProject(id);
      addToast('Project deleted', 'info');
  }; 
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
    setCurrentView(ViewMode.DOCUMENTS);
    await dataService.createDocument(newDoc);
  };
  const handleDeleteDocument = (id: string) => {
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (activeDocId === id) setActiveDocId(null);
      dataService.deleteDocument(id);
      addToast('Document deleted', 'info');
  };
  const handleUpdateDocument = (d: Document) => { setDocuments(prev => prev.map(doc => doc.id === d.id ? d : doc)); dataService.updateDocument(d.id, d); };
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
    return finalTasks;
  };
  const updateTask = (id: string, updates: Partial<Task>) => { setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t)); dataService.updateTask(id, updates); };
  const handleDeleteTask = (id: string) => { setTasks(prev => prev.filter(t => t.id !== id)); dataService.deleteTask(id); };
  const handleUpdateTaskStatus = (id: string, status: TaskStatus) => updateTask(id, { status });
  const handleUpdateTaskAssignee = (id: string, assignee: string) => updateTask(id, { assignee });
  const handleUpdateTaskDueDate = (id: string, date: Date) => updateTask(id, { dueDate: date });
  const handleUpdateTaskPriority = (id: string, priority: TaskPriority) => updateTask(id, { priority });
  const handleUpdateTaskDependencies = (id: string, deps: string[]) => updateTask(id, { dependencies: deps });
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
      setCurrentView(ViewMode.DOCUMENTS);
      addToast('Task promoted to Document', 'success');
  };
  const handleNavigate = (type: 'document' | 'task', id: string) => { 
      if(type==='document'){ setActiveDocId(id); setCurrentView(ViewMode.DOCUMENTS); }
      if(type==='task'){ setSelectedTaskId(id); setCurrentView(ViewMode.BOARD); }
  };
  const handleAddInboxItem = (content: string, type: 'text' | 'audio' | 'file', fileName?: string, attachments?: Attachment[]) => {
      const newItem: InboxItem = { id: crypto.randomUUID(), content, type, fileName, attachments, status: 'pending', createdAt: new Date() };
      setInboxItems(prev => [newItem, ...prev]);
  };
  const handleSaveToInbox = (action: InboxAction) => { 
      handleAddInboxItem(action.data.title, 'text'); 
      addToast('Saved to Inbox', 'success');
  };
  const handleDeleteInboxItem = (id: string) => setInboxItems(prev => prev.filter(i => i.id !== id));
  const handleUpdateInboxItem = (id: string, updates: Partial<InboxItem>) => setInboxItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
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
          addToast('Task Created', 'success');
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
           addToast('Document Created', 'success');
      }
      setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, status: 'processed' } : item).filter(i => i.status !== 'processed'));
  };
  const handleStoreInboxSuggestion = (id: string, action: InboxAction) => setInboxItems(prev => prev.map(i => i.id === id ? { ...i, processedResult: action } : i));
  const handleAnalyzeInboxItem = async (id: string, content: string, attachments: Attachment[]) => { 
      // Construct schedule context for deep reasoning about conflicts
      const now = new Date();
      const upcoming = tasks
          .filter(t => t.dueDate && new Date(t.dueDate) > now)
          .slice(0, 10)
          .map(t => `${t.title} (Due: ${new Date(t.dueDate!).toLocaleDateString()})`)
          .join('\n');

      const action = await geminiService.organizeInboxItem(
          content, 
          projects, 
          upcoming, 
          openRouterInt?.connected ? 'openrouter' : 'gemini', 
          openRouterInt?.config?.apiKey, 
          openRouterInt?.config?.model, 
          attachments
      );
      if(action) handleStoreInboxSuggestion(id, action);
  };
  const handleAddClient = async (c: Partial<Client>) => { 
      const newClient = { ...c, id: crypto.randomUUID() } as Client;
      setClients(prev => [...prev, newClient]);
      await dataService.createClient(newClient);
      addToast('Client Added', 'success');
  };
  const handleDeleteClient = async (id: string) => { 
      setClients(prev => prev.filter(c => c.id !== id));
      await dataService.deleteClient(id);
      addToast('Client Deleted', 'info');
  };
  const handleDiscussInboxItem = (item: InboxItem) => { setActiveFocusItem({ type: 'inbox', data: item }); setIsChatOpen(true); };
  const handleDiscussTask = (task: Task) => { setActiveFocusItem({ type: 'task', data: task }); setIsChatOpen(true); };
  
  const executeInboxAction = async (action: InboxAction) => { 
      // Reuse logic from handleProcessInboxItem but without item ID context
       let targetProjectId = action.targetProjectId;
      if (targetProjectId.startsWith('NEW:')) {
          const title = targetProjectId.substring(4);
          const newProject: Project = { id: crypto.randomUUID(), title: title, icon: '📁', createdAt: new Date() };
          await dataService.createProject(newProject);
          setProjects(prev => [...prev, newProject]);
          targetProjectId = newProject.id;
      }
      if (action.actionType === 'create_task') {
          const newTask: Task = {
              id: crypto.randomUUID(),
              projectId: targetProjectId,
              title: action.data.title,
              description: action.data.description,
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
          addToast('Task Created', 'success');
      }
      if (action.actionType === 'create_document') {
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
           addToast('Document Created', 'success');
      }
  };
  const handleProjectPlanCreated = async (plan: ProjectPlan) => { 
    const newProject: Project = {
        id: crypto.randomUUID(),
        title: plan.projectTitle || 'New AI Project',
        icon: '🚀',
        createdAt: new Date()
    };
    setProjects(prev => [...prev, newProject]);
    dataService.createProject(newProject);
    
    const newDoc: Document = {
        id: crypto.randomUUID(),
        projectId: newProject.id,
        title: 'Project Overview & Scope',
        content: plan.overviewContent,
        updatedAt: new Date(),
        tags: ['Project Plan', 'Proposal']
    };
    setDocuments(prev => [...prev, newDoc]);
    dataService.createDocument(newDoc);
    
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
    newTasks.forEach(t => dataService.createTask(t));

    setActiveProjectId(newProject.id);
    setActiveDocId(newDoc.id);
    setCurrentView(ViewMode.DOCUMENTS);
    addToast('Project Plan Generated', 'success');
  };
  const handleUpdateEntity = (type: string, id: string, updates: any) => { 
      if(type==='task') updateTask(id, updates);
      if(type==='document') handleUpdateDocument({ ...documents.find(d=>d.id===id)!, ...updates });
      addToast(`${type} updated`, 'success');
  };

  const activeDocument = documents.find(d => d.id === activeDocId);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Helper Functions for Context
  const getContextForTaskBoard = () => {
    let context = `Project Context: ${activeProject?.title || 'General'}\n`;
    if (activeDocument && activeDocument.content.trim()) context += `Active Document Content:\n${activeDocument.content}\n\n`;
    const recentChats = chatMessages.slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
    if (recentChats) context += `Recent Chat History:\n${recentChats}`;
    return context;
  };

  const getContextData = () => {
      if (currentView === ViewMode.DOCUMENTS && activeDocument) return activeDocument.content;
      if (currentView === ViewMode.BOARD || currentView === ViewMode.GLOBAL_BOARD) return getContextForTaskBoard();
      if (currentView === ViewMode.INBOX) return inboxItems.map(i => `- ${i.content}`).join('\n');
      return '';
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
        <div className="flex h-screen w-full bg-white dark:bg-black overflow-hidden font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
        
        {/* TOAST CONTAINER */}
        <div className="fixed bottom-20 md:bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm ${
                    toast.type === 'success' ? 'bg-white dark:bg-zinc-900 border-green-500/50 text-green-700 dark:text-green-400' :
                    'bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                }`}>
                    {toast.type === 'info' && <Info className="w-5 h-5" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                    <button onClick={() => removeToast(toast.id)} className="ml-2"><X className="w-4 h-4" /></button>
                </div>
            ))}
        </div>

        {/* Global Sticker Mascot - Updated with Chat Toggle */}
        <AasaniMascot fixed onClick={() => setIsChatOpen(true)} />

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
            globalModelLabel={activeModelName}
        />

        <main className={`flex-1 flex flex-col h-full relative w-full bg-white dark:bg-black transition-all duration-300 ease-in-out pb-20 md:pb-0 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-16'}`}>
            <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-black shrink-0 z-20">
            <div className="flex items-center space-x-3 text-sm">
                <span className="font-medium text-black dark:text-white inline">{currentView}</span>
            </div>
            <div className="flex items-center space-x-3">
                {/* Voice Command Button */}
                <button onClick={() => setIsVoiceCommandOpen(true)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group" title="Voice Command">
                    <Mic className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-purple-500" />
                </button>
                
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
                    <div key={currentView} className="flex-1 h-full w-full animate-page-slide flex flex-col overflow-hidden">
                    {currentView === ViewMode.HOME ? (
                        <DashboardView 
                            tasks={tasks} 
                            documents={documents} 
                            projects={projects} 
                            userName="User" 
                            onNavigate={handleNavigate} 
                            onChangeView={setCurrentView}
                            onStartReview={() => setCurrentView(ViewMode.REVIEW)} 
                            onCreateProject={handleOpenCreateProject}
                            teamMembers={teamMembers}
                            clients={clients} 
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
                            onProcessItem={(id, action) => { const item = inboxItems.find(i => i.id === id); if (item && item.processedResult) handleProcessInboxItem(id, action); else handleStoreInboxSuggestion(id, action); }} 
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
                            onToggleIntegration={handleManageIntegration}
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
                        <button onClick={handleCreateDocument} className="flex flex-col items-center justify-center h-full w-full text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer">
                            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center mb-6 shadow-sm group hover:border-gray-300 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-gray-800 transition-all">
                                <Plus className="w-10 h-10 text-gray-300 dark:text-gray-700 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            </div>
                            <p className="text-base font-medium">Create a new page</p>
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
                contextData={getContextData()}
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
                onSaveToInbox={handleSaveToInbox}
                onExecuteAction={async (id, action) => await executeInboxAction(action)}
                onUpdateEntity={handleUpdateEntity}
                onUpdateIntegration={handleManageIntegration}
            />

            {/* Voice Command Overlay */}
            <VoiceCommandOverlay 
                isOpen={isVoiceCommandOpen} 
                onClose={() => setIsVoiceCommandOpen(false)} 
                projects={projects}
                onExecute={handleVoiceExecution}
            />

            {/* Other Modals */}
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
      <MascotProvider>
        <AppContent />
      </MascotProvider>
    </ErrorBoundary>
  );
};

export default App;