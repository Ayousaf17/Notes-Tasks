
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
import { ViewMode, Document, Task, TaskStatus, ProjectPlan, TaskPriority, ChatMessage, Project, InboxItem, InboxAction, AgentRole } from './types';
import { Sparkles, Command, Plus, Menu } from 'lucide-react';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.HOME); 
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const [projects, setProjects] = useState<Project[]>([
      { id: 'p1', title: 'V2 Redesign', icon: '🎨', createdAt: new Date() },
      { id: 'p2', title: 'Marketing Launch', icon: '🚀', createdAt: new Date() },
      { id: 'p3', title: 'Backend Migration', icon: '⚙️', createdAt: new Date() }
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string>('p1');

  const [documents, setDocuments] = useState<Document[]>([
    { id: 'd1', projectId: 'p1', title: 'Design System Specs', content: '# V2 Design System\n\n- Primary Color: #000000\n- Typography: Inter\n\nSee [[Marketing Launch]] for usage guidelines.', updatedAt: new Date(), tags: ['Specs', 'Design'] },
    { id: 'd2', projectId: 'p2', title: 'Q3 Campaign', content: '# Q3 Campaign Strategy\n\nFocus on "Zero Friction" messaging.\n\nTasks:\n- [ ] nexus://task/t2', updatedAt: new Date(), tags: ['Strategy'] }
  ]);
  
  const [activeDocId, setActiveDocId] = useState<string | null>('d1');
  
  const now = new Date();
  const yesterday = new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000));
  const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const oldTaskDate = new Date(now.getTime() - (12 * 24 * 60 * 60 * 1000));

  const [tasks, setTasks] = useState<Task[]>([
    { id: 't1', projectId: 'p1', title: 'Finalize Figma Components', status: TaskStatus.DONE, description: 'Button variants and input states', assignee: 'Alice', priority: TaskPriority.HIGH, dueDate: yesterday, dependencies: [], createdAt: weekAgo, updatedAt: yesterday },
    { id: 't2', projectId: 'p1', title: 'Implement React Components', status: TaskStatus.IN_PROGRESS, description: 'Port Figma components to code', assignee: 'Me', priority: TaskPriority.HIGH, dueDate: now, dependencies: ['t1'], createdAt: weekAgo, updatedAt: now },
    { id: 't3', projectId: 'p2', title: 'Draft Blog Post', status: TaskStatus.TODO, description: 'Announce the V2 redesign', assignee: 'AI_WRITER', priority: TaskPriority.MEDIUM, dueDate: new Date(now.getTime() + 86400000), dependencies: ['t2'], createdAt: now, updatedAt: now },
    { id: 't4', projectId: 'p3', title: 'Database Schema Update', status: TaskStatus.IN_PROGRESS, description: 'Add new fields for user preferences', assignee: 'Bob', priority: TaskPriority.LOW, dueDate: oldTaskDate, dependencies: [], createdAt: oldTaskDate, updatedAt: oldTaskDate }
  ]);

  const [inboxItems, setInboxItems] = useState<InboxItem[]>([
      { id: 'i1', content: 'Feedback from CEO: Make the sidebar collapsible on mobile', type: 'text', status: 'pending', createdAt: new Date() }
  ]);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'I am Aasani. I can help you organize this project, generate plans, or summarize your documents.', timestamp: new Date() }
  ]);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
    : activeProject.title;

  useEffect(() => {
      if (currentView === ViewMode.DOCUMENTS && activeDocId) {
          const doc = documents.find(d => d.id === activeDocId);
          if (doc && doc.projectId !== activeProjectId) {
              setActiveDocId(null);
          }
      }
  }, [activeProjectId, activeDocId, documents]);

  const handleCreateProject = () => {
      const name = prompt("Enter Project Name:");
      if (name) {
          const newProject: Project = {
              id: Date.now().toString(),
              title: name,
              icon: '📁',
              createdAt: new Date()
          };
          setProjects(prev => [...prev, newProject]);
          setActiveProjectId(newProject.id);
          setActiveDocId(null);
          setCurrentView(ViewMode.DOCUMENTS);
      }
  };

  const handleCreateDocument = () => {
    const newDoc: Document = {
      id: Date.now().toString(),
      projectId: activeProjectId,
      title: '',
      content: '',
      updatedAt: new Date(),
      tags: []
    };
    setDocuments(prev => [...prev, newDoc]);
    setActiveDocId(newDoc.id);
    setCurrentView(ViewMode.DOCUMENTS);
  };

  const handleUpdateDocument = (updatedDoc: Document) => {
    setDocuments(prev => prev.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc));
  };

  const handleExtractTasks = (newTasks: Partial<Task>[]): Task[] => {
    const finalTasks: Task[] = newTasks.map(t => ({
      id: Date.now().toString() + Math.random(),
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
    return finalTasks;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t));
  };

  const handleDeleteTask = (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      if (selectedTaskId === id) setSelectedTaskId(null);
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
          id: Date.now().toString(),
          projectId: task.projectId,
          title: task.title,
          content: newContent,
          updatedAt: new Date(),
          tags: ['Task Expanded']
      };
      setDocuments(prev => [...prev, newDoc]);
      updateTask(taskId, { linkedDocumentId: newDoc.id });
      setActiveProjectId(task.projectId);
      setActiveDocId(newDoc.id);
      setCurrentView(ViewMode.DOCUMENTS);
  };

  const handleProjectPlanCreated = (plan: ProjectPlan) => {
    const newProject: Project = {
        id: Date.now().toString(),
        title: plan.projectTitle || 'New AI Project',
        icon: '🚀',
        createdAt: new Date()
    };
    setProjects(prev => [...prev, newProject]);
    
    const newDoc: Document = {
        id: Date.now().toString(),
        projectId: newProject.id,
        title: 'Project Overview & Scope',
        content: plan.overviewContent,
        updatedAt: new Date(),
        tags: ['Project Plan', 'Proposal']
    };
    setDocuments(prev => [...prev, newDoc]);
    
    const newTasks: Task[] = plan.tasks.map(t => ({
        id: Date.now().toString() + Math.random(),
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

    setActiveProjectId(newProject.id);
    setActiveDocId(newDoc.id);
    setCurrentView(ViewMode.DOCUMENTS);
  };

  const handleConnectGoogle = () => {
    const confirm = window.confirm(isGoogleConnected ? "Disconnect Cloud Sync?" : "Connect Cloud Sync? (Simulation)");
    if (confirm) setIsGoogleConnected(!isGoogleConnected);
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
              // Optionally select it too
              setSelectedTaskId(id);
          }
      }
      setIsCommandPaletteOpen(false);
  };

  const handleAddInboxItem = (content: string, type: 'text' | 'audio') => {
      const newItem: InboxItem = {
          id: Date.now().toString(),
          content,
          type,
          status: 'pending',
          createdAt: new Date()
      };
      setInboxItems(prev => [newItem, ...prev]);
  };

  const handleDeleteInboxItem = (id: string) => {
      setInboxItems(prev => prev.filter(i => i.id !== id));
  };

  const handleProcessInboxItem = (itemId: string, action: InboxAction) => {
      if (action.actionType === 'create_task') {
          const newTask: Task = {
              id: Date.now().toString(),
              projectId: action.targetProjectId,
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
      } else if (action.actionType === 'create_document') {
           const newDoc: Document = {
              id: Date.now().toString(),
              projectId: action.targetProjectId,
              title: action.data.title,
              content: action.data.content || '# ' + action.data.title,
              tags: ['Inbox Processed'],
              updatedAt: new Date()
           };
           setDocuments(prev => [...prev, newDoc]);
      }
      setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, status: 'processed' } : item).filter(i => i.status !== 'processed'));
  };
  
  const handleStoreInboxSuggestion = (itemId: string, action: InboxAction) => {
      setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, processedResult: action } : item));
  };

  const activeDocument = documents.find(d => d.id === activeDocId);

  const getContextForTaskBoard = () => {
    let context = `Project Context: ${activeProject.title}\n`;
    if (activeDocument && activeDocument.content.trim()) context += `Active Document Content:\n${activeDocument.content}\n\n`;
    const recentChats = chatMessages.slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
    if (recentChats) context += `Recent Chat History:\n${recentChats}`;
    return context;
  };

  const allAssignees = Array.from(new Set(tasks.map(t => t.assignee || 'Unassigned')));
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-gray-900">
      
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onCreateProject={handleCreateProject}
        documents={projectDocs}
        onSelectDocument={setActiveDocId}
        onCreateDocument={handleCreateDocument}
        activeDocumentId={activeDocId}
        isGoogleConnected={isGoogleConnected}
        onConnectGoogle={handleConnectGoogle}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-full relative w-full bg-white">
        {/* Minimalist Header */}
        <header className="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0 z-20">
          <div className="flex items-center space-x-3 text-sm">
             <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-black">
                 <Menu className="w-5 h-5" />
             </button>
             <span className="font-medium text-black hidden md:inline">
                 {currentView === ViewMode.HOME ? 'Home' : viewTitle}
             </span>
             <span className="text-gray-300 hidden md:inline">/</span>
             <span className="text-gray-500 truncate">
                 {currentView === ViewMode.DOCUMENTS ? (activeDocument?.title || 'Untitled') : 
                  currentView === ViewMode.BOARD ? 'Board' : 
                  currentView === ViewMode.HOME ? 'Dashboard' :
                  currentView.toLowerCase().replace('_', ' ')}
             </span>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={() => setIsCommandPaletteOpen(true)} className="text-gray-400 hover:text-black transition-colors">
                <Command className="w-4 h-4" />
            </button>
            <button onClick={() => setIsChatOpen(!isChatOpen)} className={`transition-colors ${isChatOpen ? 'text-purple-600' : 'text-gray-400 hover:text-black'}`}>
                <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative flex">
            <div className="flex-1 flex flex-col overflow-hidden w-full">
                {currentView === ViewMode.HOME ? (
                    <DashboardView tasks={tasks} documents={documents} projects={projects} userName="User" onNavigate={handleNavigate} onStartReview={() => setCurrentView(ViewMode.REVIEW)} />
                ) : currentView === ViewMode.INBOX ? (
                    <InboxView items={inboxItems} onAddItem={handleAddInboxItem} onProcessItem={(id, action) => { const item = inboxItems.find(i => i.id === id); if (item && item.processedResult) handleProcessInboxItem(id, action); else handleStoreInboxSuggestion(id, action); }} onDeleteItem={handleDeleteInboxItem} projects={projects} />
                ) : currentView === ViewMode.REVIEW ? (
                    <ReviewWizard inboxItems={inboxItems} tasks={tasks} projects={projects} onProcessInboxItem={handleProcessInboxItem} onDeleteInboxItem={handleDeleteInboxItem} onDeleteTask={handleDeleteTask} onUpdateTaskStatus={handleUpdateTaskStatus} onUpdateTaskAssignee={handleUpdateTaskAssignee} onClose={() => setCurrentView(ViewMode.HOME)} />
                ) : currentView === ViewMode.DOCUMENTS && activeDocument ? (
                    <DocumentEditor document={activeDocument} allDocuments={documents} allTasks={tasks} onUpdate={handleUpdateDocument} onExtractTasks={handleExtractTasks} onNavigate={handleNavigate} />
                ) : currentView === ViewMode.DOCUMENTS && !activeDocument ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300">
                        <Plus className="w-8 h-8 mb-4 text-gray-200" />
                        <p className="text-sm">Select or create a page</p>
                    </div>
                ) : currentView === ViewMode.BOARD || currentView === ViewMode.GLOBAL_BOARD ? (
                    <TaskBoard 
                      tasks={tasksToDisplay} 
                      onUpdateTaskStatus={handleUpdateTaskStatus} 
                      onUpdateTaskAssignee={handleUpdateTaskAssignee} 
                      onUpdateTaskDueDate={handleUpdateTaskDueDate} 
                      onUpdateTaskPriority={handleUpdateTaskPriority} 
                      onUpdateTaskDependencies={handleUpdateTaskDependencies} 
                      contextString={getContextForTaskBoard()} 
                      onAddTasks={handleExtractTasks} 
                      onPromoteTask={handlePromoteTask} 
                      onNavigate={handleNavigate} 
                      onSelectTask={setSelectedTaskId}
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
            
            {currentView === ViewMode.DOCUMENTS && activeDocument && (
                <div className="hidden lg:block h-full border-l border-gray-100">
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
        />

        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} documents={documents} tasks={tasks} projects={projects} onNavigate={handleNavigate} onCreateDocument={handleCreateDocument} onChangeView={setCurrentView} onSelectProject={setActiveProjectId} />

        {/* Task Details Modal */}
        {selectedTask && (
            <TaskDetailModal 
                task={selectedTask}
                isOpen={!!selectedTask}
                onClose={() => setSelectedTaskId(null)}
                onUpdate={updateTask}
                onDelete={handleDeleteTask}
                users={['Me', 'Alice', 'Bob', 'Charlie']}
            />
        )}

      </main>
    </div>
  );
};

export default App;
