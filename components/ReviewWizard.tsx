
import React, { useState, useEffect } from 'react';
import { InboxItem, Task, Project, TaskStatus, InboxAction } from '../types';
import { geminiService } from '../services/geminiService';
import { CheckCircle, Trash2, ArrowRight, Loader2, Sparkles, Inbox, AlertTriangle, Archive, X } from 'lucide-react';

interface ReviewWizardProps {
  inboxItems: InboxItem[];
  tasks: Task[];
  projects: Project[];
  onProcessInboxItem: (id: string, action: InboxAction) => void;
  onDeleteInboxItem: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTaskStatus: (id: string, status: TaskStatus) => void;
  onUpdateTaskAssignee: (id: string, assignee: string) => void;
  onClose: () => void;
}

type Step = 'INTRO' | 'INBOX' | 'STUCK_TASKS' | 'COMPLETE';

export const ReviewWizard: React.FC<ReviewWizardProps> = ({
    inboxItems,
    tasks,
    projects,
    onProcessInboxItem,
    onDeleteInboxItem,
    onDeleteTask,
    onUpdateTaskStatus,
    onUpdateTaskAssignee,
    onClose
}) => {
    const [step, setStep] = useState<Step>('INTRO');
    
    // Inbox State
    const [currentInboxIndex, setCurrentInboxIndex] = useState(0);
    const pendingInboxItems = inboxItems.filter(i => i.status === 'pending');
    const [isProcessingInbox, setIsProcessingInbox] = useState(false);

    // Stuck Tasks State
    const [stuckTasks, setStuckTasks] = useState<Task[]>([]);
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
    const [aiSuggestion, setAiSuggestion] = useState<string>('');
    const [loadingSuggestion, setLoadingSuggestion] = useState(false);

    useEffect(() => {
        // Identify stuck tasks (Mock logic: In Progress for > 7 days, or created > 7 days ago and not done)
        // Since we are mocking dates, let's just pick tasks that are In Progress and assume they are old for demo
        const now = new Date();
        const stuck = tasks.filter(t => {
            if (t.status !== TaskStatus.IN_PROGRESS) return false;
            // Mock: If created more than 3 days ago (for demo purposes)
            const diffTime = Math.abs(now.getTime() - new Date(t.createdAt).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            return diffDays > 3; 
        });
        setStuckTasks(stuck);
    }, [tasks]);

    // Fetch suggestion when stuck task changes
    useEffect(() => {
        if (step === 'STUCK_TASKS' && stuckTasks[currentTaskIndex]) {
            setLoadingSuggestion(true);
            const t = stuckTasks[currentTaskIndex];
            const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            geminiService.analyzeStaleTask(t.title, diffDays).then(res => {
                setAiSuggestion(res);
                setLoadingSuggestion(false);
            });
        }
    }, [step, currentTaskIndex, stuckTasks]);

    // --- Actions ---

    const handleNextInbox = () => {
        if (currentInboxIndex < pendingInboxItems.length - 1) {
            setCurrentInboxIndex(prev => prev + 1);
        } else {
            setStep('STUCK_TASKS');
        }
    };

    const handleProcessInbox = async (item: InboxItem) => {
        setIsProcessingInbox(true);
        // Quick Auto-Sort using existing service
        const result = await geminiService.organizeInboxItem(item.content, projects);
        if (result) {
            onProcessInboxItem(item.id, result);
            handleNextInbox();
        }
        setIsProcessingInbox(false);
    };

    const handleDeleteInbox = (id: string) => {
        onDeleteInboxItem(id);
        handleNextInbox();
    };

    const handleNextTask = () => {
        if (currentTaskIndex < stuckTasks.length - 1) {
            setCurrentTaskIndex(prev => prev + 1);
        } else {
            setStep('COMPLETE');
        }
    };

    const handleTaskAction = (action: 'delete' | 'done' | 'delegate') => {
        const task = stuckTasks[currentTaskIndex];
        if (action === 'delete') onDeleteTask(task.id);
        if (action === 'done') onUpdateTaskStatus(task.id, TaskStatus.DONE);
        if (action === 'delegate') onUpdateTaskAssignee(task.id, 'AI_RESEARCHER'); // Delegate to AI
        
        handleNextTask();
    };

    // --- Renderers ---

    if (step === 'INTRO') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">The Review Protocol</h2>
                <p className="text-gray-500 max-w-md mb-8 text-lg">
                    Let's clean up your workspace. We'll process your inbox and unblock stuck tasks to get you back to flow.
                </p>
                <div className="flex gap-4 text-sm text-gray-400 mb-8">
                    <div className="flex items-center gap-2"><Inbox className="w-4 h-4" /> {pendingInboxItems.length} Inbox Items</div>
                    <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {stuckTasks.length} Stuck Tasks</div>
                </div>
                <button 
                    onClick={() => setStep(pendingInboxItems.length > 0 ? 'INBOX' : stuckTasks.length > 0 ? 'STUCK_TASKS' : 'COMPLETE')}
                    className="bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-all flex items-center gap-2"
                >
                    Start Review <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        );
    }

    if (step === 'INBOX') {
        const item = pendingInboxItems[currentInboxIndex];
        if (!item) return null; // Should not happen

        return (
            <div className="flex flex-col items-center justify-center h-full p-8 max-w-2xl mx-auto w-full animate-in slide-in-from-right duration-300">
                <div className="w-full flex justify-between items-center mb-12">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Inbox Processing ({currentInboxIndex + 1}/{pendingInboxItems.length})</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full mb-8 min-h-[200px] flex items-center justify-center text-center">
                    <p className="text-2xl text-gray-800 font-serif leading-relaxed">"{item.content}"</p>
                </div>

                <div className="flex gap-4 w-full">
                    <button 
                        onClick={() => handleDeleteInbox(item.id)}
                        className="flex-1 py-4 rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all font-medium flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-5 h-5" /> Delete
                    </button>
                    <button 
                        onClick={() => handleProcessInbox(item)}
                        disabled={isProcessingInbox}
                        className="flex-[2] py-4 rounded-xl bg-black text-white hover:bg-gray-800 transition-all font-medium flex items-center justify-center gap-2"
                    >
                        {isProcessingInbox ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        Auto-File (Magic Sort)
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'STUCK_TASKS') {
        const task = stuckTasks[currentTaskIndex];
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 max-w-2xl mx-auto w-full animate-in slide-in-from-right duration-300">
                <div className="w-full flex justify-between items-center mb-12">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Unblocking Tasks ({currentTaskIndex + 1}/{stuckTasks.length})</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black"><X className="w-5 h-5" /></button>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full mb-4">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded font-bold">STUCK</span>
                        <span className="text-gray-400 text-xs">Created {new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h2>
                    <p className="text-gray-500">{task.description || "No description provided."}</p>
                </div>

                {/* AI Insight */}
                <div className="w-full bg-purple-50 border border-purple-100 p-4 rounded-xl mb-8 flex gap-3 items-start">
                    <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-purple-900">Aasani Insight</h4>
                        <p className="text-sm text-purple-800 mt-1">
                            {loadingSuggestion ? "Analyzing..." : aiSuggestion}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 w-full">
                    <button onClick={() => handleTaskAction('delete')} className="py-3 rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium">
                        Delete
                    </button>
                    <button onClick={() => handleTaskAction('delegate')} className="py-3 rounded-lg border border-gray-200 hover:bg-purple-50 hover:text-purple-600 transition-colors text-sm font-medium">
                        Delegate to AI
                    </button>
                    <button onClick={() => handleTaskAction('done')} className="py-3 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors text-sm font-medium">
                        Mark Done
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'COMPLETE') {
         return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl text-white">
                    <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">All Clean!</h2>
                <p className="text-gray-500 max-w-md mb-8 text-lg">
                    Your workspace is optimized. You've processed your inbox and unblocked stuck tasks.
                </p>
                <button 
                    onClick={onClose}
                    className="bg-gray-100 text-gray-900 px-8 py-3 rounded-full font-medium hover:bg-gray-200 transition-all"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return null;
};
