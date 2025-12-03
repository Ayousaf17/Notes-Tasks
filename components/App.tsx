import React, { useState, useEffect } from 'react';
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
import { ViewMode, Document, Task, TaskStatus, ProjectPlan, TaskPriority, ChatMessage, Project, InboxItem, InboxAction, AgentRole, Integration } from '../types';
import { Sparkles, Command, Plus, Menu, Cloud, MessageSquare, Home, Inbox, Search, CheckSquare } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';

// ENHANCED MOBILE BOTTOM NAV
const MobileBottomNav = ({ currentView, onChangeView, onOpenMenu, onSearch }: { currentView: ViewMode, onChangeView: (v: ViewMode) => void, onOpenMenu: () => void, onSearch: () => void }) => (
  <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/85 dark:bg-black/85 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 z-50 px-6 h-[calc(60px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] flex items-center justify-between transition-transform duration-300 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
    <div className="flex items-center gap-8 pl-2">
      <button onClick={() => onChangeView(ViewMode.HOME)} className={`flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${currentView === ViewMode.HOME ? 'text-black dark:text-white bg-gray-100 dark:bg-gray-800' : 'text-gray-400 dark:text-gray-500'}`}>
         <Home className="w-5 h-5" strokeWidth={currentView === ViewMode.HOME ? 2.5 : 2} />
      </button>
      <button onClick={onSearch} className="flex flex-col items-center justify-center w-10 h-10 rounded-full text-gray-400 dark:text-gray-500 active:text-black dark:active:text-white transition-all active:scale-95">
         <Search className="w-5 h-5" strokeWidth={2} />
      </button>
    </div>
    <div className="relative -top-5 group">
      <button
          onClick={() => onChangeView(ViewMode.GLOBAL_BOARD)}
          className={`flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl shadow-black/20 dark:shadow-white/10 border-4 border-gray-50 dark:border-black transition-all duration-300 active:scale-90 active:rotate-3 ${currentView === ViewMode.GLOBAL_BOARD ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-black dark:bg-white text-white dark:text-black'}`}
      >
         <CheckSquare className="w-6 h-6" strokeWidth={2.5} />
      </button>
    </div>
    <div className="flex items-center gap-8 pr-2">
      <button onClick={() => onChangeView(ViewMode.INBOX)} className={`flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${currentView === ViewMode.INBOX ? 'text-black dark:text-white bg-gray-100 dark:bg-gray-800' : 'text-gray-400 dark:text-gray-500'}`}>
         <Inbox className="w-5 h-5" strokeWidth={currentView === ViewMode.INBOX ? 2.5 : 2} />
      </button>
      <button onClick={onOpenMenu} className="flex flex-col items-center justify-center w-10 h-10 rounded-full text-gray-400 dark:text-gray-500 active:text-black dark:active:text-white transition-all active:scale-95">
         <Menu className="w-5 h-5" strokeWidth={2} />
      </button>
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.HOME); 
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); 
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) { setIsChatOpen(true); setIsMobileSidebarOpen(false); }
    if (isRightSwipe) { setIsMobileSidebarOpen(true); setIsChatOpen(false); }
  }

  // Safe LocalStorage Hook
  const [teamMembers, setTeamMembers] = useState<string[]>(() => {
      if (typeof window !== 'undefined') {
          try {
              const stored = localStorage.getItem('teamMembers');
              return stored ? JSON.parse(stored) : ['Me', 'Kate'];
          } catch (e) { return ['Me', 'Kate']; }
      }
      return ['Me', 'Kate'];
  });

  const handleUpdateTeam = (members: string[]) => {
      setTeamMembers(members);
      localStorage.setItem('teamMembers', JSON.stringify(members));
  };

  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
    confirmText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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
        try {
            return localStorage.getItem('theme') === 'dark' || 
               (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        } catch (e) { return false; }
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([
      { id: 'google', name: 'Google Workspace', description: 'Sync Docs, Calendar, and Drive.', icon: Cloud, connected: false, category: 'Cloud' },
      { id: 'chatgpt', name: 'ChatGPT', description: 'Connect GPT-4o for advanced reasoning.', icon: MessageSquare, connected: false, category: 'AI' },
      { id: 'claude', name: 'Claude', description: 'Anthropic\'s Claude 3.5 Sonnet model.', icon: MessageSquare, connected: false, category: 'AI' },
      { id: 'perplexity', name: 'Perplexity', description: 'Real-time web search and sourcing.', icon: MessageSquare, connected: false, category: 'AI' },
  ]);
  
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
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
        try {
            const { projects: dbProjects, tasks: dbTasks, documents: dbDocs } = await dataService.fetchAll();
            if (dbProjects.length > 0) {
                setProjects(dbProjects);
                setTasks(dbTasks);
                setDocuments(dbDocs);
                setActiveProjectId(prev => dbProjects.find(p => p.id === prev) ? prev : dbProjects[0].id);
            }
        } catch (e) {
            console.error("Failed to load data", e);
        }
    };
    loadData();
    const channel = supabase.channel('db-changes').on('postgres_changes', { event: '*', schema: 'public' }, () => loadData()).subscribe();
    return () => { supabase.removeChannel(channel); };
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

  useEffect(() => {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission();
      }
      const interval = setInterval(() => {
          const now = new Date();
          const tasksWithReminders = tasks.filter(t => t.reminderTime);
          tasksWithReminders.forEach(task => {
              const reminderTime = new Date(task.reminderTime!);
              if (reminderTime <= now && reminderTime.getTime() > now.getTime() - 60000) {
                  new Notification(`Aasani Reminder: ${task.title}`, { body: task.description || 'This task is due.', icon: '/favicon.ico' });
                  updateTask(task.id, { reminderTime: undefined });
              }
          });
      }, 30000);
      return () => clearInterval(interval);
  }, [tasks]);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const projectDocs = documents.filter(d => d.projectId === activeProjectId);
  const projectTasks = tasks.filter(t => t.projectId === activeProjectId);
  const tasksToDisplay = (currentView === ViewMode.GLOBAL_BOARD || currentView === ViewMode.GLOBAL_CALENDAR) ? tasks : projectTasks;
  const viewTitle = (currentView === ViewMode.GLOBAL_BOARD || currentView === ViewMode.GLOBAL_CALENDAR) ? "Master View" : activeProject?.title || 'Loading...';

  useEffect(() => {
      if (currentView === ViewMode.DOCUMENTS && activeDocId) {
          const doc = documents.find(d => d.id === activeDocId);
          if (doc && doc.projectId !== activeProjectId) setActiveDocId(null);
      }
  }, [activeProjectId, activeDocId, documents]);

  const handleOpenCreateProject = () => setIsCreateProjectModalOpen(true);
  const handleCreateProjectConfirm = async (title: string) => {
      const newProject: Project = { id: crypto.randomUUID(), title: title, icon: '📁', createdAt: new Date() };
      setProjects(prev => [...prev, newProject]);
      setActiveProjectId(newProject.id);
      setActiveDocId(null);
      setCurrentView(ViewMode.DOCUMENTS);
      await dataService.createProject(newProject);
  };
  const handleSelectProject = (projectId: string) => { setActiveProjectId(projectId); setActiveDocId(null); setCurrentView(ViewMode.PROJECT_OVERVIEW); };
  const handleDeleteProject = (projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      setConfirmationModal({
          isOpen: true,
          title: 'Delete Project',
          message: `Are you sure you want to delete "${project?.title}"?`,
          isDanger: true,
          confirmText: 'Delete Project',
          onConfirm: async () => {
              setProjects(prev => prev.filter(p => p.id !== projectId));
              setTasks(prev => prev.filter(t => t.projectId !== projectId));
              setDocuments(prev => prev.filter(d => d.projectId !== projectId));
              if (activeProjectId === projectId) {
                  const remaining = projects.filter(p => p.id !== projectId);
                  if (remaining.length > 0) handleSelectProject(remaining[0].id); else setCurrentView(ViewMode.HOME);
              }
              await dataService.deleteProject(projectId);
          }
      });
  };
  const handleCreateDocument = async () => {
    const newDoc: Document = { id: crypto.randomUUID(), projectId: activeProjectId, title: '', content: '', updatedAt: new Date(), tags: [] };
    setDocuments(prev => [...prev, newDoc]);
    setActiveDocId(newDoc.id);
    setCurrentView(ViewMode.DOCUMENTS);
    await dataService.createDocument(newDoc);
  };
  const handleDeleteDocument = (id: string) => {
      setConfirmationModal({
          isOpen: true,
          title: 'Delete Page',
          message: 'Are you sure you want to delete this page?',
          isDanger: true,
          confirmText: 'Delete Page',
          onConfirm: async () => {
              setDocuments(prev => prev.filter(d => d.id !== id));
              if (activeDocId === id) setActiveDocId(null);
              await dataService.deleteDocument(id);
          }
      });
  };
  const handleUpdateDocument = (updatedDoc: Document) => {
    setDocuments(prev => prev.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc));
    dataService.updateDocument(updatedDoc.id, updatedDoc);
  };
  const handleExtractTasks = (newTasks: Partial<Task>[]): Task[] => {
    const finalTasks: Task[] = newTasks.map(t => ({
      id: crypto.randomUUID(), projectId: activeProjectId, title: t.title || 'Untitled', status: t.status || TaskStatus.TODO, description: t.description, dueDate: new Date(), assignee: t.assignee || 'Unassigned', priority: t.priority || TaskPriority.MEDIUM, dependencies: [], createdAt: new Date(), updatedAt: new Date()
    }));
    setTasks(prev => [...prev, ...finalTasks]);
    finalTasks.forEach(t => dataService.createTask(t));
    return finalTasks;
  };
  const updateTask = (id: string, updates: Partial<Task>) => { setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t)); dataService.updateTask(id, updates); };
  const handleDeleteTask = (id: string) => { setTasks(prev => prev.filter(t => t.id !== id)); if (selectedTaskId === id) setSelectedTaskId(null); dataService.deleteTask(id); };
  const handleUpdateTaskStatus = (id: string, status: TaskStatus) => updateTask(id, { status });
  const handleUpdateTaskAssignee = async (id: string, assignee: string) => {
      updateTask(id, { assignee });
      if (assignee.startsWith('AI_')) {
          const task = tasks.find(t => t.id === id);
          if (task) {
              updateTask(id, { status: TaskStatus.IN_PROGRESS, agentStatus: 'working' });
              const result = await geminiService.performAgentTask(assignee as AgentRole, task.title, task.description);
              updateTask(id, { agentStatus: 'completed', agentResult: result });
          }
      } else { updateTask(id, { agentStatus: 'idle' }); }
  };
  const handleUpdateTaskDueDate = (id: string, date: Date) => updateTask(id, { dueDate: date });
  const handleUpdateTaskPriority = (id: string, priority: TaskPriority) => updateTask(id, { priority });
  const handleUpdateTaskDependencies = (id: string, dependencies: string[]) => updateTask(id, { dependencies });
  const handlePromoteTask = async (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.linkedDocumentId) return;
      const newContent = await geminiService.expandTaskToContent(task.title, task.description);
      const newDoc: Document = { id: crypto.randomUUID(), projectId: task.projectId, title: task.title, content: newContent, updatedAt: new Date(), tags: ['Task Expanded'] };
      setDocuments(prev => [...prev, newDoc]);
      updateTask(taskId, { linkedDocumentId: newDoc.id });
      await dataService.createDocument(newDoc);
      setActiveProjectId(task.projectId);
      setActiveDocId(newDoc.id);
      setCurrentView(ViewMode.DOCUMENTS);
  };
  const handleProjectPlanCreated = (plan: ProjectPlan) => {
    const newProject: Project = { id: crypto.randomUUID(), title: plan.projectTitle || 'New AI Project', icon: '🚀', createdAt: new Date() };
    setProjects(prev => [...prev, newProject]);
    dataService.createProject(newProject);
    const newDoc: Document = { id: crypto.randomUUID(), projectId: newProject.id, title: 'Project Overview & Scope', content: plan.overviewContent, updatedAt: new Date(), tags: ['Project Plan'] };
    setDocuments(prev => [...prev, newDoc]);
    dataService.createDocument(newDoc);
    const newTasks: Task[] = plan.tasks.map(t => ({ id: crypto.randomUUID(), projectId: newProject.id, title: t.title || 'New Task', description: t.description, status: (t.status as TaskStatus) || TaskStatus.TODO, dueDate: (t as any).dueDate ? new Date((t as any).dueDate) : undefined, assignee: t.assignee || 'Unassigned', priority: t.priority || TaskPriority.MEDIUM, dependencies: [], createdAt: new Date(), updatedAt: new Date() }));
    setTasks(prev => [...prev, ...newTasks]);
    newTasks.forEach(t => dataService.createTask(t));
    setActiveProjectId(newProject.id);
    setActiveDocId(newDoc.id);
    setCurrentView(ViewMode.PROJECT_OVERVIEW);
  };
  const handleToggleIntegration = async (id: string, apiKey?: string) => {
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: !i.connected, config: apiKey ? { apiKey } : i.config } : i));
      const isConnecting = !integrations.find(i => i.id === id)?.connected;
      if (isConnecting && id === 'google') { const events = await dataService.fetchGoogleEvents(); setTasks(prev => [...prev, ...events]); } else if (!isConnecting && id === 'google') { setTasks(prev => prev.filter(t => t.externalType !== 'GOOGLE_CALENDAR')); }
  };
  const handleNavigate = (type: 'document' | 'task', id: string) => {
      if (type === 'document') { const doc = documents.find(d => d.id === id); if (doc) { setActiveProjectId(doc.projectId); setActiveDocId(id); setCurrentView(ViewMode.DOCUMENTS); } }
      else if (type === 'task') { const task = tasks.find(t => t.id === id); if (task) { setActiveProjectId(task.projectId); setCurrentView(ViewMode.BOARD); setSelectedTaskId(id); } }
      setIsCommandPaletteOpen(false);
  };
  const handleAddInboxItem = (content: string, type: 'text' | 'audio' | 'file', fileName?: string) => { const newItem: InboxItem = { id: crypto.randomUUID(), content, type, fileName, status: 'pending', createdAt: new Date() }; setInboxItems(prev => [newItem, ...prev]); };
  const handleDeleteInboxItem = (id: string) => { setInboxItems(prev => prev.filter(i => i.id !== id)); };
  const handleUpdateInboxItem = (id: string, updates: Partial<InboxItem>) => { setInboxItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item)); };
  const handleProcessInboxItem = async (itemId: string, action: InboxAction) => {
      if (action.actionType === 'create_project' && action.projectPlan) { handleProjectPlanCreated(action.projectPlan); setInboxItems(prev => prev.filter(i => i.id !== itemId)); return; }
      let targetProjectId = action.targetProjectId;
      if (targetProjectId.startsWith('NEW:')) { const title = targetProjectId.substring(4); const newProject: Project = { id: crypto.randomUUID(), title: title, icon: '📁', createdAt: new Date() }; await dataService.createProject(newProject); setProjects(prev => [...prev, newProject]); targetProjectId = newProject.id; }
      if (action.actionType === 'create_task') { const newTask: Task = { id: crypto.randomUUID(), projectId: targetProjectId, title: action.data.title, description: action.data.description || '', status: TaskStatus.TODO, priority: action.data.priority || TaskPriority.MEDIUM, assignee: 'Unassigned', dueDate: new Date(), dependencies: [], createdAt: new Date(), updatedAt: new Date() }; setTasks(prev => [...prev, newTask]); dataService.createTask(newTask); }
      else if (action.actionType === 'create_document') { const newDoc: Document = { id: crypto.randomUUID(), projectId: targetProjectId, title: action.data.title, content: action.data.content || '# ' + action.data.title, tags: ['Inbox'], updatedAt: new Date() }; setDocuments(prev => [...prev, newDoc]); dataService.createDocument(newDoc); }
      setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, status: 'processed' as const } : item).filter(i => i.status !== 'processed'));
  };
  const handleStoreInboxSuggestion = (itemId: string, action: InboxAction) => { setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, processedResult: action } : item)); };
  const activeDocument = documents.find(d => d.id === activeDocId);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="flex h-[100dvh] w-full bg-white dark:bg-black overflow-hidden font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <Sidebar currentView={currentView} onChangeView={setCurrentView} projects={projects} activeProjectId={activeProjectId} onSelectProject={handleSelectProject} onCreateProject={handleOpenCreateProject} onDeleteProject={handleDeleteProject} documents={projectDocs} onSelectDocument={setActiveDocId} onCreateDocument={handleCreateDocument} onDeleteDocument={handleDeleteDocument} activeDocumentId={activeDocId} onOpenIntegrations={() => setIsIntegrationsOpen(true)} isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} isExpanded={isSidebarExpanded} onHover={setIsSidebarExpanded} />
      <main className={`flex-1 flex flex-col h-full relative w-full bg-white dark:bg-black transition-all duration-300 ease-in-out pb-[calc(70px+env(safe-area-inset-bottom))] md:pb-0 safe-area-bottom ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-16'}`}>
        <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-black shrink-0 z-20 safe-area-top pt-2 md:pt-0">
          <div className="flex items-center space-x-3 text-sm">
             <span className="font-medium text-black dark:text-white inline">{currentView === ViewMode.HOME ? 'Home' : currentView === ViewMode.SETTINGS ? 'Settings' : viewTitle}</span>
             <span className="hidden md:inline text-gray-300 dark:text-gray-700">/</span>
             <span className="hidden md:block text-gray-500 dark:text-gray-400 truncate">{currentView === ViewMode.DOCUMENTS ? (activeDocument?.title || 'Untitled') : currentView === ViewMode.BOARD ? 'Board' : currentView === ViewMode.HOME ? 'Dashboard' : currentView === ViewMode.SETTINGS ? 'Preferences' : currentView.toLowerCase().replace('_', ' ')}</span>
          </div>
          <div className="flex items-center space-x-4">
             <button onClick={() => setIsCommandPaletteOpen(true)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2"><Command className="w-5 h-5" /></button>
             <button onClick={() => setIsChatOpen(!isChatOpen)} className={`transition-colors p-2 ${isChatOpen ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}><Sparkles className="w-5 h-5" /></button>
          </div>
        </header>
        <div className="flex-1 overflow-hidden relative flex">
            <div className="flex-1 flex flex-col overflow-hidden w-full">
                <div key={currentView} className="flex-1 h-full w-full animate-page-slide flex flex-col overflow-hidden">
                  {currentView === ViewMode.HOME ? ( <DashboardView tasks={tasks} documents={documents} projects={projects} userName="User" onNavigate={handleNavigate} onStartReview={() => setCurrentView(ViewMode.REVIEW)} onCreateProject={handleOpenCreateProject} teamMembers={teamMembers} /> ) : currentView === ViewMode.PROJECT_OVERVIEW ? ( <ProjectOverview project={activeProject} tasks={projectTasks} documents={projectDocs} onNavigate={handleNavigate} onChangeView={setCurrentView} /> ) : currentView === ViewMode.INBOX ? ( <InboxView items={inboxItems} onAddItem={handleAddInboxItem} onProcessItem={(id, action) => { const item = inboxItems.find(i => i.id === id); if (item && item.processedResult) handleProcessInboxItem(id, action); else handleStoreInboxSuggestion(id, action); }} onDeleteItem={handleDeleteInboxItem} onUpdateItem={handleUpdateInboxItem} projects={projects} /> ) : currentView === ViewMode.SETTINGS ? ( <SettingsView teamMembers={teamMembers} onUpdateTeam={handleUpdateTeam} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} onClearData={handleClearData} onDeleteProject={handleDeleteProject} projects={projects} integrations={integrations} onToggleIntegration={handleToggleIntegration} /> ) : currentView === ViewMode.REVIEW ? ( <ReviewWizard inboxItems={inboxItems} tasks={tasks} projects={projects} onProcessInboxItem={handleProcessInboxItem} onDeleteInboxItem={handleDeleteInboxItem} onDeleteTask={handleDeleteTask} onUpdateTaskStatus={handleUpdateTaskStatus} onUpdateTaskAssignee={handleUpdateTaskAssignee} onClose={() => setCurrentView(ViewMode.HOME)} /> ) : currentView === ViewMode.DOCUMENTS && activeDocument ? ( <DocumentEditor document={activeDocument} allDocuments={documents} allTasks={tasks} onUpdate={handleUpdateDocument} onExtractTasks={handleExtractTasks} onNavigate={handleNavigate} onDelete={() => handleDeleteDocument(activeDocument.id)} /> ) : currentView === ViewMode.DOCUMENTS && !activeDocument ? ( <button onClick={handleCreateDocument} className="flex flex-col items-center justify-center h-full w-full text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"><div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center mb-6 shadow-sm group hover:border-gray-300 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-gray-800 transition-all"><Plus className="w-10 h-10 text-gray-300 dark:text-gray-700 group-hover:text-black dark:group-hover:text-white transition-colors" /></div><p className="text-base font-medium">Create a new page</p><p className="text-xs text-gray-300 dark:text-gray-700 mt-2">or select one from the sidebar</p></button> ) : currentView === ViewMode.BOARD || currentView === ViewMode.GLOBAL_BOARD ? ( <TaskBoard tasks={tasksToDisplay} onUpdateTaskStatus={handleUpdateTaskStatus} onUpdateTaskAssignee={handleUpdateTaskAssignee} onUpdateTaskDueDate={handleUpdateTaskDueDate} onUpdateTaskPriority={handleUpdateTaskPriority} onUpdateTaskDependencies={handleUpdateTaskDependencies} onDeleteTask={handleDeleteTask} contextString={getContextForTaskBoard()} onAddTasks={handleExtractTasks} onPromoteTask={handlePromoteTask} onNavigate={handleNavigate} onSelectTask={setSelectedTaskId} users={teamMembers} projects={projects} isGlobalView={currentView === ViewMode.GLOBAL_BOARD} /> ) : currentView === ViewMode.GRAPH ? ( <GraphView documents={projectDocs} tasks={projectTasks} onNavigate={handleNavigate} /> ) : ( <CalendarView tasks={tasksToDisplay} onSelectTask={setSelectedTaskId} onUpdateTaskDueDate={handleUpdateTaskDueDate} /> )}
                </div>
            </div>
            {currentView === ViewMode.DOCUMENTS && activeDocument && ( <div className="hidden lg:block h-full border-l border-gray-100 dark:border-gray-800"><ContextSidebar currentDoc={activeDocument} allDocs={documents} allTasks={tasks} onNavigate={handleNavigate} /></div> )}
        </div>
        <AIChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} contextData={currentView === ViewMode.DOCUMENTS ? activeDocument?.content : ''} onProjectPlanCreated={handleProjectPlanCreated} messages={chatMessages} setMessages={setChatMessages} allDocuments={documents} allTasks={tasks} />
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} documents={documents} tasks={tasks} projects={projects} onNavigate={handleNavigate} onCreateDocument={handleCreateDocument} onChangeView={setCurrentView} onSelectProject={handleSelectProject} />
        <CreateProjectModal isOpen={isCreateProjectModalOpen} onClose={() => setIsCreateProjectModalOpen(false)} onCreate={handleCreateProjectConfirm} />
        <IntegrationsModal isOpen={isIntegrationsOpen} onClose={() => setIsIntegrationsOpen(false)} integrations={integrations} onToggleIntegration={handleToggleIntegration} />
        <ConfirmationModal isOpen={confirmationModal.isOpen} title={confirmationModal.title} message={confirmationModal.message} onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmationModal.onConfirm} isDanger={confirmationModal.isDanger} confirmText={confirmationModal.confirmText} />
        {selectedTask && ( <TaskDetailModal task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTaskId(null)} onUpdate={updateTask} onDelete={handleDeleteTask} users={teamMembers} projects={projects} /> )}
      </main>
      <MobileBottomNav currentView={currentView} onChangeView={setCurrentView} onOpenMenu={() => setIsMobileSidebarOpen(true)} onSearch={() => setIsCommandPaletteOpen(true)} />
    </div>
  );
};
export default App;--- START OF FILE components/AIChatSidebar.tsx ---

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Attachment, ProjectPlan, Document, Task, Source } from '../types';
import { Send, X, Bot, Paperclip, Mic, Loader2, FileText, Sparkles, Music, Trash2, BrainCircuit, CheckSquare, Search } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: string;
  onProjectPlanCreated: (plan: ProjectPlan) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  allDocuments: Document[];
  allTasks: Task[];
}

const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let currentListType: 'ul' | 'ol' | null = null;
  let currentListItems: React.ReactNode[] = [];

  const flushList = () => {
    if (currentListType && currentListItems.length > 0) {
      if (currentListType === 'ul') {
        elements.push(<ul key={`list-${elements.length}`} className="list-disc list-outside ml-5 mb-4 space-y-2 text-gray-700 dark:text-gray-300">{currentListItems}</ul>);
      } else {
        elements.push(<ol key={`list-${elements.length}`} className="list-decimal list-outside ml-5 mb-4 space-y-2 text-gray-700 dark:text-gray-300">{currentListItems}</ol>);
      }
      currentListItems = [];
      currentListType = null;
    }
  };

  const parseInline = (str: string, keyPrefix: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${keyPrefix}-${i}`} className="font-semibold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
        flushList();
        return;
    }

    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
        if (currentListType !== 'ol') flushList();
        currentListType = 'ol';
        currentListItems.push(
            <li key={`li-${i}`} className="pl-1">
                {parseInline(olMatch[2], `li-${i}`)}
            </li>
        );
        return;
    }

    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
        if (currentListType !== 'ul') flushList();
        currentListType = 'ul';
        currentListItems.push(
            <li key={`li-${i}`} className="pl-1">
                {parseInline(ulMatch[1], `li-${i}`)}
            </li>
        );
        return;
    }

    flushList();
    
    if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={`h3-${i}`} className="text-sm font-bold text-gray-900 dark:text-white mb-2 mt-6">{parseInline(trimmed.replace('### ', ''), `h3-${i}`)}</h3>);
    } else if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={`h2-${i}`} className="text-base font-bold text-gray-900 dark:text-white mb-3 mt-8 border-b border-gray-100 dark:border-gray-800 pb-1">{parseInline(trimmed.replace('## ', ''), `h2-${i}`)}</h2>);
    } else {
        elements.push(<p key={`p-${i}`} className="mb-4 text-gray-700 dark:text-gray-300 leading-7">{parseInline(line, `p-${i}`)}</p>);
    }
  });

  flushList();
  return <div className="text-sm font-sans">{elements}</div>;
};

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ 
  isOpen, 
  onClose, 
  contextData, 
  onProjectPlanCreated,
  messages,
  setMessages,
  allDocuments,
  allTasks
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [retrievingContext, setRetrievingContext] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalysingPlan, setIsAnalysingPlan] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    try {
        const stored = localStorage.getItem('chat_history');
        if (stored) {
            const parsed = JSON.parse(stored).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
            }));
            if (parsed.length > 0 && messages.length <= 1) { 
                setMessages(parsed);
            }
        }
    } catch(e) { console.error("Failed to load chat history", e); }
  }, []);

  const clearHistory = () => {
    if (confirm("Clear chat history?")) {
        setMessages([{ id: 'init', role: 'model', text: 'History cleared. How can I help you now?', timestamp: new Date() }]);
        localStorage.removeItem('chat_history');
    }
  };

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, attachments, loading, retrievingContext]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        const newAttachment: Attachment = {
          mimeType: file.type,
          data: base64String,
          name: file.name
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
           const newAttachment: Attachment = {
              mimeType: 'audio/webm',
              data: base64String,
              name: 'Voice Note'
           };
           setAttachments(prev => [...prev, newAttachment]);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone access required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    const currentAttachments = [...attachments];
    const currentInput = input;

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: currentInput,
        timestamp: new Date(),
        attachments: currentAttachments
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setLoading(true);

    const lowerInput = currentInput.toLowerCase();
    const isStructuredRequest = 
        lowerInput.includes('plan') || 
        lowerInput.includes('project') || 
        lowerInput.includes('meeting') || 
        lowerInput.includes('summary') ||
        lowerInput.includes('tasks');

    if (isStructuredRequest && (currentAttachments.length > 0 || currentInput.length > 15)) {
        setIsAnalysingPlan(true);
        const plan = await geminiService.generateProjectPlan(currentInput || "Analyze this content and extract tasks", currentAttachments);
        
        if (plan) {
            onProjectPlanCreated(plan);
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: `I've processed that into a new page "${plan.projectTitle}" and added ${plan.tasks.length} actionable tasks to your board.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } else {
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "I analyzed the content but couldn't generate a structured plan. I'll continue in standard chat mode.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        }
        setIsAnalysingPlan(false);
    } else {
        setRetrievingContext(true);
        
        let retrievedContext = "";
        let sources: Source[] = [];
        
        if (currentInput.split(' ').length > 2) {
             const result = await geminiService.findRelevantContext(currentInput, allDocuments, allTasks);
             retrievedContext = result.text;
             sources = result.sources;
        }
        
        setRetrievingContext(false);

        let fullSystemContext = "";
        if (contextData) fullSystemContext += `ACTIVE DOCUMENT CONTENT:\n${contextData}\n\n`;
        if (retrievedContext) fullSystemContext += `RETRIEVED KNOWLEDGE (From other files):\n${retrievedContext}\n\n`;
        
        const history = messages.slice(-10).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));
        
        const responseText = await geminiService.chat(history, currentInput, currentAttachments, fullSystemContext);

        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date(),
            sources: sources
        };

        setMessages(prev => [...prev, aiMsg]);
    }
    
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] md:absolute md:top-0 md:bottom-0 md:right-0 md:w-[450px] bg-white dark:bg-black border-l border-gray-100 dark:border-gray-800 flex flex-col shadow-2xl shadow-gray-200/50 dark:shadow-black/50 transition-transform font-sans h-[100dvh]">
      <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-black shrink-0 safe-area-top pt-safe md:pt-4">
        <div className="flex items-center space-x-3">
          <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <span className="font-semibold text-gray-900 dark:text-white text-sm tracking-tight">Aasani AI</span>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={clearHistory} className="text-gray-400 hover:text-red-500 transition-colors" title="Clear History">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-6 h-6 md:w-4 md:h-4" />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 bg-white dark:bg-black">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
             <div className={`max-w-[95%] ${msg.role === 'user' ? 'text-right' : 'text-left w-full'}`}>
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2 justify-end">
                        {msg.attachments.map((att, i) => (
                            <div key={i} className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300">
                                {att.mimeType.startsWith('audio/') ? <Music className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                <span className="truncate max-w-[100px]">{att.name || 'File'}</span>
                            </div>
                        ))}
                    </div>
                )}
                
                {msg.role === 'user' ? (
                    <div className="inline-block px-5 py-3 rounded-2xl text-sm leading-relaxed bg-black text-white rounded-br-sm text-left shadow-sm">
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                ) : (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 shrink-0">
                            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="block w-full px-6 py-6 rounded-xl text-sm leading-relaxed text-gray-800 dark:text-gray-200 bg-zinc-50 dark:bg-zinc-900 border-none shadow-none">
                            <FormattedMessage text={msg.text} />
                            
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase mb-2 flex items-center gap-1">
                                        <Search className="w-3 h-3" />
                                        Used {msg.sources.length} Reference{msg.sources.length > 1 ? 's' : ''}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.sources.map((src, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded text-[10px] text-gray-500 dark:text-gray-400">
                                                {src.type === 'document' ? <FileText className="w-3 h-3 text-blue-500" /> : <CheckSquare className="w-3 h-3 text-green-500" />}
                                                <span className="truncate max-w-[150px]">{src.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div className={`text-[10px] text-gray-300 dark:text-gray-600 mt-2 px-1 ${msg.role === 'user' ? 'text-right' : 'text-left ml-12'}`}>
                    {msg.role === 'user' ? 'You' : 'Aasani'}
                </div>
            </div>
          </div>
        ))}
        
        {loading && (
            <div className="flex items-center space-x-2 text-xs text-gray-400 px-4 ml-12 animate-pulse">
                {retrievingContext ? (
                    <>
                         <BrainCircuit className="w-3 h-3 text-purple-500" />
                         <span className="text-purple-500 font-medium">Scanning workspace...</span>
                    </>
                ) : isAnalysingPlan ? (
                   <>
                     <Sparkles className="w-3 h-3 text-purple-500" />
                     <span className="text-purple-500 font-medium">Building Plan...</span>
                   </>
                ) : (
                   <>
                     <Bot className="w-3 h-3" />
                     <span>Thinking...</span>
                   </>
                )}
            </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-white dark:bg-black pb-safe sticky bottom-0 z-50 border-t border-gray-50 dark:border-gray-800 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        {attachments.length > 0 && (
            <div className="flex space-x-2 mb-3 overflow-x-auto px-1">
                {attachments.map((att, idx) => (
                    <div key={idx} className="relative group flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                        {att.mimeType.startsWith('audio/') ? <Music className="w-3 h-3 text-gray-500 dark:text-gray-400" /> : <FileText className="w-3 h-3 text-gray-500 dark:text-gray-400" />}
                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[120px]">{att.name || 'Attachment'}</span>
                        <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="ml-2 text-gray-400 hover:text-red-500">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        )}

        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-1.5 flex items-center gap-2 border border-transparent focus-within:bg-white dark:focus-within:bg-gray-900 focus-within:ring-2 focus-within:ring-black/5 dark:focus-within:ring-white/10 focus-within:border-zinc-200 dark:focus-within:border-gray-700 transition-all shadow-sm">
            <div className="flex items-center gap-0.5 pl-1">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Attach file"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf,text/plain,audio/*" />

                <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-50 text-white animate-pulse' : 'text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    title={isRecording ? "Stop recording" : "Record voice note"}
                >
                    <Mic className="w-5 h-5" />
                </button>
            </div>

            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Ask Aasani..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-base py-3 px-1 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100"
            />
            
            <button 
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || loading}
                className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-black dark:disabled:hover:bg-white transition-colors shadow-sm"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
            </button>
        </div>
      </div>
    </div>
  );
};