import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DocumentEditor } from './components/DocumentEditor';
import { TaskBoard } from './components/TaskBoard';
import { AIChatSidebar } from './components/AIChatSidebar';
import { CalendarView } from './components/CalendarView';
import { ViewMode, Document, Task, TaskStatus, ProjectPlan, TaskPriority, ChatMessage } from './types';
import { Sparkles, Bot } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.DOCUMENTS);
  const [documents, setDocuments] = useState<Document[]>([
    { id: '1', title: 'Welcome to Nexus', content: '# Simplicity is the ultimate sophistication.\n\nUse the AI Assistant (bottom right or command+k) to:\n1. Create project plans from PDFs.\n2. Talk to your workspace.\n3. Organize your thoughts.', updatedAt: new Date(), tags: [] }
  ]);
  const [activeDocId, setActiveDocId] = useState<string | null>('1');
  const [tasks, setTasks] = useState<Task[]>([
    { id: 't1', title: 'Review Proposal', status: TaskStatus.IN_PROGRESS, description: 'Check the PDF attachment', assignee: 'Me', priority: TaskPriority.HIGH, dueDate: new Date(), dependencies: [] }
  ]);
  
  // Lifted Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'I can help you create project plans from files, summarize meetings, or organize your tasks.', timestamp: new Date() }
  ]);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // --- Handlers ---

  const handleCreateDocument = () => {
    const newDoc: Document = {
      id: Date.now().toString(),
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
      title: t.title || 'Untitled Task',
      status: t.status || TaskStatus.TODO,
      description: t.description,
      dueDate: new Date(),
      assignee: t.assignee || 'Unassigned', // Respect extracted assignee or default to Unassigned
      priority: t.priority || TaskPriority.MEDIUM,
      dependencies: []
    }));
    setTasks(prev => [...prev, ...finalTasks]);
  };

  const handleUpdateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const handleUpdateTaskAssignee = (taskId: string, assignee: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignee } : t));
  };

  const handleUpdateTaskDueDate = (taskId: string, date: Date) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dueDate: date } : t));
  };

  const handleUpdateTaskPriority = (taskId: string, priority: TaskPriority) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority } : t));
  };

  const handleUpdateTaskDependencies = (taskId: string, dependencyIds: string[]) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dependencies: dependencyIds } : t));
  };

  const handleProjectPlanCreated = (plan: ProjectPlan) => {
    // 1. Create the Document
    const newDoc: Document = {
        id: Date.now().toString(),
        title: plan.projectTitle,
        content: plan.overviewContent,
        updatedAt: new Date(),
        tags: ['Project Plan']
    };
    setDocuments(prev => [...prev, newDoc]);

    // 2. Create the Tasks
    const newTasks: Task[] = plan.tasks.map(t => ({
        id: Date.now().toString() + Math.random(),
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
    if (!process.env.API_KEY) {
        alert("Please provide an API_KEY in the environment variables to enable AI features.");
    }
    const confirm = window.confirm(
        isGoogleConnected 
        ? "Disconnect Google Workspace?" 
        : "Connect Google Workspace? (Simulation)"
    );
    if (confirm) setIsGoogleConnected(!isGoogleConnected);
  };

  // --- Derived State ---
  const activeDocument = documents.find(d => d.id === activeDocId);

  // Combine context for AI Suggestions in TaskBoard
  const getContextForTaskBoard = () => {
    let context = '';
    if (activeDocument && activeDocument.content.trim()) {
        context += `Active Document Content:\n${activeDocument.content}\n\n`;
    }
    // Add recent chat context (last 5 user/model turns)
    const recentChats = chatMessages.slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
    if (recentChats) {
        context += `Recent Chat History:\n${recentChats}`;
    }
    return context;
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-gray-900">
      
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        documents={documents}
        onSelectDocument={setActiveDocId}
        onCreateDocument={handleCreateDocument}
        activeDocumentId={activeDocId}
        isGoogleConnected={isGoogleConnected}
        onConnectGoogle={handleConnectGoogle}
      />

      <main className="flex-1 flex flex-col h-full relative">
        {/* Minimalist Header */}
        <header className="h-14 border-b border-gray-50 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm shrink-0 z-20">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
             <span>{currentView === ViewMode.DOCUMENTS ? 'Documents' : currentView === ViewMode.BOARD ? 'Board' : 'Calendar'}</span>
             <span className="text-gray-300">/</span>
             <span className="text-gray-900 font-medium">{currentView === ViewMode.DOCUMENTS ? (activeDocument?.title || 'Untitled') : 'All Tasks'}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all text-sm border ${isChatOpen ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-white">
            {currentView === ViewMode.DOCUMENTS && activeDocument ? (
                <DocumentEditor 
                    document={activeDocument}
                    onUpdate={handleUpdateDocument}
                    onExtractTasks={handleExtractTasks}
                />
            ) : currentView === ViewMode.DOCUMENTS && !activeDocument ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-300">
                    <p>Select a page or create a new one.</p>
                </div>
            ) : currentView === ViewMode.BOARD ? (
                <TaskBoard 
                    tasks={tasks}
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
                    tasks={tasks}
                    onSelectTask={(id) => {
                        // For now, just switch to board view to edit.
                        // Ideally, open a modal.
                        const t = tasks.find(t => t.id === id);
                        if(t) alert(`Task: ${t.title}\nStatus: ${t.status}\nDue: ${t.dueDate?.toLocaleDateString()}`);
                    }}
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
                : `Tasks:\n${tasks.map(t => `- ${t.title} (${t.status})`).join('\n')}`
            }
            onProjectPlanCreated={handleProjectPlanCreated}
            messages={chatMessages}
            setMessages={setChatMessages}
        />
      </main>
    </div>
  );
};

export default App;