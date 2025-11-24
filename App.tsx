import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DocumentEditor } from './components/DocumentEditor';
import { TaskBoard } from './components/TaskBoard';
import { AIChatSidebar } from './components/AIChatSidebar';
import { CalendarView } from './components/CalendarView';
import { CommandPalette } from './components/CommandPalette';
import { ContextSidebar } from './components/ContextSidebar';
import { ViewMode, Document, Task, TaskStatus, ProjectPlan, TaskPriority, ChatMessage, Project } from './types';
import { Sparkles, Bot, Command, Plus } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.DOCUMENTS);
  
  // Projects State
  const [projects, setProjects] = useState<Project[]>([
      { id: 'p1', title: 'General', icon: '🏠', createdAt: new Date() },
      { id: 'p2', title: 'Product Launch', icon: '🚀', createdAt: new Date() }
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string>('p1');

  // Documents State (Linked to ProjectId)
  const [documents, setDocuments] = useState<Document[]>([
    { id: '1', projectId: 'p1', title: 'Welcome to Aasani OS', content: '# Aasani OS\n\nThe operating system for your work.\n\nEverything is organized into **Projects**. Select a project from the sidebar to view its documents, tasks, and timeline.', updatedAt: new Date(), tags: ['Guide'] },
    { id: '2', projectId: 'p2', title: 'Launch Strategy', content: '# Q3 Launch\n\n- [ ] Define MVP\n- [ ] Hire Design Agency', updatedAt: new Date(), tags: ['Strategy'] }
  ]);
  
  const [activeDocId, setActiveDocId] = useState<string | null>('1');
  
  // Tasks State (Linked to ProjectId)
  const [tasks, setTasks] = useState<Task[]>([
    { id: 't1', projectId: 'p1', title: 'Explore the system', status: TaskStatus.IN_PROGRESS, description: 'Try creating a new project', assignee: 'Me', priority: TaskPriority.HIGH, dueDate: new Date(), dependencies: [] },
    { id: 't2', projectId: 'p2', title: 'Draft Press Release', status: TaskStatus.TODO, description: 'Announce the launch', assignee: 'Alice', priority: TaskPriority.MEDIUM, dueDate: new Date(), dependencies: [] }
  ]);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'I am Aasani. I can help you organize this project, generate plans, or summarize your documents.', timestamp: new Date() }
  ]);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // --- Keyboard Shortcuts ---
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

  // --- Filtered Data Helpers ---
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const projectDocs = documents.filter(d => d.projectId === activeProjectId);
  const projectTasks = tasks.filter(t => t.projectId === activeProjectId);
  
  // Ensure active document belongs to active project
  useEffect(() => {
      if (currentView === ViewMode.DOCUMENTS && activeDocId) {
          const doc = documents.find(d => d.id === activeDocId);
          if (doc && doc.projectId !== activeProjectId) {
              setActiveDocId(null); // Deselect if switching projects
          }
      }
  }, [activeProjectId, activeDocId, documents]);

  // --- Handlers ---

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

  const handleExtractTasks = (newTasks: Partial<Task>[]) => {
    const finalTasks: Task[] = newTasks.map(t => ({
      id: Date.now().toString() + Math.random(),
      projectId: activeProjectId, // Assign to current project
      title: t.title || 'Untitled Task',
      status: t.status || TaskStatus.TODO,
      description: t.description,
      dueDate: new Date(),
      assignee: t.assignee || 'Unassigned',
      priority: t.priority || TaskPriority.MEDIUM,
      dependencies: []
    }));
    setTasks(prev => [...prev, ...finalTasks]);
  };

  // Task Updaters
  const updateTask = (id: string, updates: Partial<Task>) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleUpdateTaskStatus = (id: string, status: TaskStatus) => updateTask(id, { status });
  const handleUpdateTaskAssignee = (id: string, assignee: string) => updateTask(id, { assignee });
  const handleUpdateTaskDueDate = (id: string, date: Date) => updateTask(id, { dueDate: date });
  const handleUpdateTaskPriority = (id: string, priority: TaskPriority) => updateTask(id, { priority });
  const handleUpdateTaskDependencies = (id: string, dependencies: string[]) => updateTask(id, { dependencies });

  const handleProjectPlanCreated = (plan: ProjectPlan) => {
    // 1. Create the Document in active project
    const newDoc: Document = {
        id: Date.now().toString(),
        projectId: activeProjectId,
        title: plan.projectTitle,
        content: plan.overviewContent,
        updatedAt: new Date(),
        tags: ['Project Plan']
    };
    setDocuments(prev => [...prev, newDoc]);

    // 2. Create the Tasks in active project
    const newTasks: Task[] = plan.tasks.map(t => ({
        id: Date.now().toString() + Math.random(),
        projectId: activeProjectId,
        title: t.title || 'New Task',
        description: t.description,
        status: (t.status as TaskStatus) || TaskStatus.TODO,
        dueDate: new Date(),
        assignee: t.assignee || 'Unassigned',
        priority: t.priority || TaskPriority.MEDIUM,
        dependencies: []
    }));
    setTasks(prev => [...prev, ...newTasks]);

    // 3. Switch View
    setActiveDocId(newDoc.id);
    setCurrentView(ViewMode.DOCUMENTS);
  };

  const handleConnectGoogle = () => {
    const confirm = window.confirm(
        isGoogleConnected 
        ? "Disconnect Cloud Sync?" 
        : "Connect Cloud Sync? (Simulation)"
    );
    if (confirm) setIsGoogleConnected(!isGoogleConnected);
  };
  
  const handleNavigate = (type: 'document' | 'task', id: string) => {
      if (type === 'document') {
          const doc = documents.find(d => d.id === id);
          if (doc) {
              setActiveProjectId(doc.projectId); // Switch project context
              setActiveDocId(id);
              setCurrentView(ViewMode.DOCUMENTS);
          }
      } else if (type === 'task') {
          const task = tasks.find(t => t.id === id);
          if (task) {
              setActiveProjectId(task.projectId); // Switch project context
              setCurrentView(ViewMode.BOARD);
          }
      }
      setIsCommandPaletteOpen(false);
  };

  const activeDocument = documents.find(d => d.id === activeDocId);

  // Combine context for AI
  const getContextForTaskBoard = () => {
    let context = `Project Context: ${activeProject.title}\n`;
    if (activeDocument && activeDocument.content.trim()) {
        context += `Active Document Content:\n${activeDocument.content}\n\n`;
    }
    const recentChats = chatMessages.slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
    if (recentChats) context += `Recent Chat History:\n${recentChats}`;
    return context;
  };

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
      />

      <main className="flex-1 flex flex-col h-full relative">
        {/* OS Header */}
        <header className="h-14 border-b border-gray-50 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm shrink-0 z-20">
          <div className="flex items-center space-x-2 text-sm">
             <span className="font-semibold text-gray-900">{activeProject.title}</span>
             <span className="text-gray-300">/</span>
             <span className="text-gray-500">{currentView === ViewMode.DOCUMENTS ? (activeDocument?.title || 'Documents') : currentView === ViewMode.BOARD ? 'Task Board' : 'Timeline'}</span>
          </div>
          <div className="flex items-center space-x-3">
             <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center space-x-1.5 px-2 py-1 rounded bg-gray-50 border border-gray-200 text-xs text-gray-400 hover:border-gray-300 transition-all mr-2"
            >
                <Command className="w-3 h-3" />
                <span>K</span>
            </button>

            <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all text-sm border ${isChatOpen ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Aasani AI</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-white flex">
            {/* Main View */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {currentView === ViewMode.DOCUMENTS && activeDocument ? (
                    <DocumentEditor 
                        document={activeDocument}
                        allDocuments={documents} // Pass all for linking across projects
                        allTasks={tasks}
                        onUpdate={handleUpdateDocument}
                        onExtractTasks={handleExtractTasks}
                        onNavigate={handleNavigate}
                    />
                ) : currentView === ViewMode.DOCUMENTS && !activeDocument ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Plus className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="mb-4">No page selected</p>
                        <button onClick={handleCreateDocument} className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">Create Page</button>
                    </div>
                ) : currentView === ViewMode.BOARD ? (
                    <TaskBoard 
                        tasks={projectTasks}
                        onUpdateTaskStatus={handleUpdateTaskStatus}
                        onUpdateTaskAssignee={handleUpdateTaskAssignee}
                        onUpdateTaskDueDate={handleUpdateTaskDueDate}
                        onUpdateTaskPriority={handleUpdateTaskPriority}
                        onUpdateTaskDependencies={handleUpdateTaskDependencies}
                        contextString={getContextForTaskBoard()}
                        onAddTasks={handleExtractTasks}
                    />
                ) : (
                    <CalendarView 
                        tasks={projectTasks}
                        onSelectTask={(id) => {
                             // Simple alert for now, could be better modal
                             const t = tasks.find(t => t.id === id);
                             if(t) alert(`Task: ${t.title}\nStatus: ${t.status}`);
                        }}
                    />
                )}
            </div>
            
            {/* Context Sidebar (Only visible in Document Mode) */}
            {currentView === ViewMode.DOCUMENTS && activeDocument && (
                <ContextSidebar 
                    currentDoc={activeDocument}
                    allDocs={documents}
                    allTasks={tasks}
                    onNavigate={handleNavigate}
                />
            )}
        </div>

        {/* AI Assistant Overlay */}
        <AIChatSidebar 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)}
            contextData={
                currentView === ViewMode.DOCUMENTS 
                ? activeDocument?.content 
                : `Active Project: ${activeProject.title}\nTasks:\n${projectTasks.map(t => `- ${t.title} (${t.status})`).join('\n')}`
            }
            onProjectPlanCreated={handleProjectPlanCreated}
            messages={chatMessages}
            setMessages={setChatMessages}
        />

        {/* Command Palette Overlay */}
        <CommandPalette 
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            documents={documents}
            tasks={tasks}
            projects={projects}
            onNavigate={handleNavigate}
            onCreateDocument={handleCreateDocument}
            onChangeView={setCurrentView}
            onSelectProject={setActiveProjectId}
        />

      </main>
    </div>
  );
};

export default App;