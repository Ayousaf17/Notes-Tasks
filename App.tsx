
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DocumentEditor } from './components/DocumentEditor';
import { TaskBoard } from './components/TaskBoard';
import { AIChatSidebar } from './components/AIChatSidebar';
import { CalendarView } from './components/CalendarView';
import { CommandPalette } from './components/CommandPalette';
import { ContextSidebar } from './components/ContextSidebar';
import { InboxView } from './components/InboxView';
import { GraphView } from './components/GraphView';
import { DashboardView } from './components/DashboardView'; 
import { ReviewWizard } from './components/ReviewWizard';
import { TaskDetailModal } from './components/TaskDetailModal';
import { IntegrationsModal } from './components/IntegrationsModal';
import { SettingsView } from './components/SettingsView';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ViewMode, Document, Task, TaskStatus, ProjectPlan, TaskPriority, ChatMessage, Project, InboxItem, InboxAction, AgentRole, Integration } from './types';
import { Sparkles, Command, Plus, Menu, Cloud, MessageSquare, Home, Inbox, Search, CheckSquare } from 'lucide-react';
import { geminiService } from './services/geminiService';
import { dataService } from './services/dataService';
import { supabase } from './services/supabase';

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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.HOME); 
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); 
  
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
  };

  const handleClearData = async () => {
      localStorage.clear();
      window.location.reload();
  };

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('theme') === 'dark' || 
               (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
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

  // Integrations State
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
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  // Load Data from Supabase on Mount & Setup Realtime Subscription
  useEffect(() => {
    const loadData = async () => {
        try {
            const { projects: dbProjects, tasks: dbTasks, documents: dbDocs } = await dataService.fetchAll();
            
            if (dbProjects.length > 0) {
                setProjects(dbProjects);
                setTasks(dbTasks);
                setDocuments(dbDocs);
                // Keep active project if valid, else switch to first
                setActiveProjectId(prev => dbProjects.find(p => p.id === prev) ? prev : dbProjects[0].id);
            }
        } catch (e) {
            console.error("Failed to load data from Supabase", e);
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

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const projectDocs = documents.filter(d => d.projectId === activeProjectId);
  const projectTasks = tasks.filter(t => t.projectId === activeProjectId);
  
  const tasksToDisplay = (currentView === ViewMode.GLOBAL_BOARD || currentView === ViewMode.GLOBAL_CALENDAR) 
    ? tasks 
    : projectTasks;

  const viewTitle = (currentView === ViewMode.GLOBAL_BOARD || currentView === ViewMode.GLOBAL_CALENDAR)
    ? "Master View"
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
      const newProject: Project = {
          id: crypto.randomUUID(),
          title: title,
          icon: '📁',
          createdAt: new Date()
      };
      setProjects(prev => [...prev, newProject]);
      setActiveProjectId(newProject.id);
      setActiveDocId(null);
      setCurrentView(ViewMode.DOCUMENTS);
      await dataService.createProject(newProject);
  };

  const handleDeleteProject = async (projectId: string) => {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setTasks(prev => prev.filter(t => t.projectId !== projectId));
      setDocuments(prev => prev.filter(d => d.projectId !== projectId));
      
      if (activeProjectId === projectId) {
          const remaining = projects.filter(p => p.id !== projectId);
          if (remaining.length > 0) {
              setActiveProjectId(remaining[0].id);
          } else {
              setCurrentView(ViewMode.HOME);
          }
      }

      await dataService.deleteProject(projectId);
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
    finalTasks.forEach(t => dataService.createTask(t));
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
      setCurrentView(ViewMode.DOCUMENTS);
  };

  const handleProjectPlanCreated = (plan: ProjectPlan) => {
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
  };

  // --- Connection Handler ---
  const handleToggleIntegration = async (id: string, apiKey?: string) => {
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: !i.connected, config: apiKey ? { apiKey } : i.config } : i));
      const isConnecting = !integrations.find(i => i.id === id)?.connected;
      if (isConnecting && id === 'google') {
          const events = await dataService.fetchGoogleEvents();
          setTasks(prev => [...prev, ...events]);
      } else if (!isConnecting && id === 'google') {
          setTasks(prev => prev.filter(t => t.externalType !== 'GOOGLE_CALENDAR'));
      }
  };
  
  const handleNavigate = (type: 'document' | 'task', id: string) => {
      if (type === 'document') {
          const doc = documents.find(d => d.id === id);
          if (doc) {
              setActiveProjectId(doc.projectId);
              setActiveDocId(id);
              setCurrentView(ViewMode.DOCUMENTS);
          }
      } else if (type === 'task') {
          const task = tasks.find(t => t.id === id);
          if (task) {
              setActiveProjectId(task.projectId);
              setCurrentView(ViewMode.BOARD);
              setSelectedTaskId(id);
          }
      }
      setIsCommandPaletteOpen(false);
  };

  const handleAddInboxItem = (content: string, type: 'text' | 'audio' | 'file', fileName?: string) => {
      const newItem: InboxItem = {
          id: crypto.randomUUID(),
          content,
          type,
          fileName,
          status: 'pending',
          createdAt: new Date()
      };
      setInboxItems(prev => [newItem, ...prev]);
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
      }
      setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, status: 'processed' } : item).filter(i => i.status !== 'processed'));
  };
  
  const handleStoreInboxSuggestion = (itemId: string, action: InboxAction) => {
      setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, processedResult: action } : item));
  };

  const activeDocument = documents.find(d => d.id === activeDocId);

  const getContextForTaskBoard = () => {
    let context = `Project Context: ${activeProject?.title || 'General'}\n`;
    if (activeDocument && activeDocument.content.trim()) context += `Active Document Content:\n${activeDocument.content}\n\n`;
    const recentChats = chatMessages.slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
    if (recentChats) context += `Recent Chat History:\n${recentChats}`;
    return context;
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="flex h-screen w-full bg-white dark:bg-black overflow-hidden font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onCreateProject={handleOpenCreateProject}
        documents={projectDocs}
        onSelectDocument={setActiveDocId}
        onCreateDocument={handleCreateDocument}
        activeDocumentId={activeDocId}
        onOpenIntegrations={() => setIsIntegrationsOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isExpanded={isSidebarExpanded}
        onHover={setIsSidebarExpanded}
      />

      <main className={`flex-1 flex flex-col h-full relative w-full bg-white dark:bg-black transition-all duration-300 ease-in-out pb-20 md:pb-0 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-16'}`}>
        <header className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-black shrink-0 z-20">
          <div className="flex items-center space-x-3 text-sm">
             {/* Hamburger removed for mobile as requested */}
             <span className="font-medium text-black dark:text-white inline">
                 {currentView === ViewMode.HOME ? 'Home' : 
                  currentView === ViewMode.SETTINGS ? 'Settings' : viewTitle}
             </span>
             <span className="text-gray-300 dark:text-gray-700 inline">/</span>
             <span className="text-gray-500 dark:text-gray-400 truncate">
                 {currentView === ViewMode.DOCUMENTS ? (activeDocument?.title || 'Untitled') : 
                  currentView === ViewMode.BOARD ? 'Board' : 
                  currentView === ViewMode.HOME ? 'Dashboard' :
                  currentView === ViewMode.SETTINGS ? 'Preferences' :
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
                  ) : currentView === ViewMode.INBOX ? (
                      <InboxView 
                          items={inboxItems} 
                          onAddItem={handleAddInboxItem} 
                          onProcessItem={(id, action) => { const item = inboxItems.find(i => i.id === id); if (item && item.processedResult) handleProcessInboxItem(id, action); else handleStoreInboxSuggestion(id, action); }} 
                          onDeleteItem={handleDeleteInboxItem} 
                          onUpdateItem={handleUpdateInboxItem}
                          projects={projects} 
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
                          onToggleIntegration={handleToggleIntegration}
                      />
                  ) : currentView === ViewMode.REVIEW ? (
                      <ReviewWizard inboxItems={inboxItems} tasks={tasks} projects={projects} onProcessInboxItem={handleProcessInboxItem} onDeleteInboxItem={handleDeleteInboxItem} onDeleteTask={handleDeleteTask} onUpdateTaskStatus={handleUpdateTaskStatus} onUpdateTaskAssignee={handleUpdateTaskAssignee} onClose={() => setCurrentView(ViewMode.HOME)} />
                  ) : currentView === ViewMode.DOCUMENTS && activeDocument ? (
                      <DocumentEditor document={activeDocument} allDocuments={documents} allTasks={tasks} onUpdate={handleUpdateDocument} onExtractTasks={handleExtractTasks} onNavigate={handleNavigate} />
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
                        users={teamMembers}
                        projects={projects}
                        isGlobalView={currentView === ViewMode.GLOBAL_BOARD}
                      />
                  ) : currentView === ViewMode.GRAPH ? (
                      <GraphView documents={projectDocs} tasks={projectTasks} onNavigate={handleNavigate} />
                  ) : (
                      <CalendarView 
                        tasks={tasksToDisplay} 
                        onSelectTask={setSelectedTaskId} 
                        onUpdateTaskDueDate={handleUpdateTaskDueDate}
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
            contextData={currentView === ViewMode.DOCUMENTS ? activeDocument?.content : ''}
            onProjectPlanCreated={handleProjectPlanCreated}
            messages={chatMessages}
            setMessages={setChatMessages}
            allDocuments={documents}
            allTasks={tasks}
        />

        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} documents={documents} tasks={tasks} projects={projects} onNavigate={handleNavigate} onCreateDocument={handleCreateDocument} onChangeView={setCurrentView} onSelectProject={setActiveProjectId} />
        
        <CreateProjectModal 
          isOpen={isCreateProjectModalOpen}
          onClose={() => setIsCreateProjectModalOpen(false)}
          onCreate={handleCreateProjectConfirm}
        />

        <IntegrationsModal 
          isOpen={isIntegrationsOpen} 
          onClose={() => setIsIntegrationsOpen(false)} 
          integrations={integrations}
          onToggleIntegration={handleToggleIntegration}
        />

        {selectedTask && (
            <TaskDetailModal 
                task={selectedTask}
                isOpen={!!selectedTask}
                onClose={() => setSelectedTaskId(null)}
                onUpdate={updateTask}
                onDelete={handleDeleteTask}
                users={teamMembers}
                projects={projects}
            />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav 
        currentView={currentView}
        onChangeView={setCurrentView}
        onOpenMenu={() => setIsMobileSidebarOpen(true)}
        onSearch={() => setIsCommandPaletteOpen(true)}
      />
    </div>
  );
};

export default App;
