
import React, { useState, useEffect } from 'react';
import { InboxItem, Task, Project, TaskStatus, InboxAction, TaskPriority } from '../types';
import { geminiService } from '../services/geminiService';
import { CheckCircle, Trash2, ArrowRight, Loader2, Sparkles, Inbox, AlertTriangle, Archive, X, CheckSquare, SkipForward } from 'lucide-react';

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
    const [pendingInboxItems, setPendingInboxItems] = useState<InboxItem[]>([]);
    const [currentInboxIndex, setCurrentInboxIndex] = useState(0);
    const [isProcessingInbox, setIsProcessingInbox] = useState(false);

    // Stuck Tasks State
    const [stuckTasks, setStuckTasks] = useState<Task[]>([]);
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
    const [aiSuggestion, setAiSuggestion] = useState<string>('');
    const [loadingSuggestion, setLoadingSuggestion] = useState(false);

    useEffect(() => {
        setPendingInboxItems(inboxItems.filter(i => i.status === 'pending'));
        
        // Identify stuck tasks (e.g., created > 7 days ago and still TODO/IN_PROGRESS)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const stuck = tasks.filter(t => 
            (t.status === TaskStatus.TODO || t.status === TaskStatus.IN_PROGRESS) && 
            new Date(t.createdAt) < sevenDaysAgo
        );
        setStuckTasks(stuck);
    }, [inboxItems, tasks]);

    useEffect(() => {
        if (step === 'STUCK_TASKS' && stuckTasks[currentTaskIndex]) {
            // Generate AI suggestion for the stuck task
            const task = stuckTasks[currentTaskIndex];
            setLoadingSuggestion(true);
            geminiService.analyzeStaleTask(task.title, 7).then(suggestion => {
                setAiSuggestion(suggestion);
                setLoadingSuggestion(false);
            });
        }
    }, [step, currentTaskIndex, stuckTasks]);

    const handleNextInbox = () => {
        if (currentInboxIndex < pendingInboxItems.length - 1) {
            setCurrentInboxIndex(prev => prev + 1);
        } else {
            setStep('STUCK_TASKS');
        }
    };

    const handleProcessCurrentInbox = async (actionType: 'delete' | 'task' | 'skip') => {
        const item = pendingInboxItems[currentInboxIndex];
        if (!item) return;

        setIsProcessingInbox(true);

        if (actionType === 'delete') {
            onDeleteInboxItem(item.id);
        } else if (actionType === 'task') {
             // Simple conversion to task in default project or inferred
             const action: InboxAction = {
                 actionType: 'create_task',
                 targetProjectId: projects[0]?.id || 'default',
                 data: {
                     title: item.content,
                     priority: TaskPriority.MEDIUM
                 },
                 reasoning: 'Quick convert during review'
             };
             onProcessInboxItem(item.id, action);
        }
        
        // Wait a bit for animation or state update
        setTimeout(() => {
            setIsProcessingInbox(false);
            handleNextInbox();
        }, 300);
    };

    const handleNextTask = () => {
        if (currentTaskIndex < stuckTasks.length - 1) {
            setCurrentTaskIndex(prev => prev + 1);
        } else {
            setStep('COMPLETE');
        }
    };

    const handleProcessCurrentTask = (actionType: 'delete' | 'done' | 'keep') => {
        const task = stuckTasks[currentTaskIndex];
        if (!task) return;

        if (actionType === 'delete') {
            onDeleteTask(task.id);
        } else if (actionType === 'done') {
            onUpdateTaskStatus(task.id, TaskStatus.DONE);
        }
        // If 'keep', do nothing

        handleNextTask();
    };

    // Renders
    if (step === 'INTRO') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-6">
                    <Sparkles className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Ready to Review?</h2>
                <p className="text-gray-600 dark:text-gray-300 max-w-md mb-8">
                    Let's clear your inbox ({pendingInboxItems.length} items) and review stale tasks ({stuckTasks.length} items).
                </p>
                <button 
                    onClick={() => setStep(pendingInboxItems.length > 0 ? 'INBOX' : stuckTasks.length > 0 ? 'STUCK_TASKS' : 'COMPLETE')}
                    className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
                >
                    Start Review
                </button>
            </div>
        );
    }

    if (step === 'INBOX') {
        const item = pendingInboxItems[currentInboxIndex];
        if (!item) return null; // Should move to next step logic handles this but safe guard

        return (
            <div className="flex flex-col h-full max-w-2xl mx-auto p-6 justify-center">
                <div className="flex justify-between items-center mb-8">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Inbox Review ({currentInboxIndex + 1}/{pendingInboxItems.length})</div>
                    <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white"><X className="w-5 h-5"/></button>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-xl mb-8 flex-1 flex flex-col justify-center items-center text-center relative overflow-hidden">
                     {isProcessingInbox && (
                         <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center z-10">
                             <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                         </div>
                     )}
                     <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-full">
                         <Inbox className="w-8 h-8 text-gray-600 dark:text-gray-300" />
                     </div>
                     <p className="text-xl md:text-2xl font-medium text-gray-900 dark:text-white leading-relaxed">
                         "{item.content}"
                     </p>
                     <div className="text-sm text-gray-400 mt-4">
                         Captured {item.createdAt.toLocaleDateString()}
                     </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <button onClick={() => handleProcessCurrentInbox('delete')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all group">
                        <Trash2 className="w-6 h-6 text-gray-400 group-hover:text-red-500" />
                        <span className="text-xs font-bold text-gray-500 group-hover:text-red-600">Delete</span>
                    </button>
                    <button onClick={() => handleProcessCurrentInbox('skip')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group">
                        <SkipForward className="w-6 h-6 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                        <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white">Keep / Skip</span>
                    </button>
                    <button onClick={() => handleProcessCurrentInbox('task')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-800 transition-all group">
                        <CheckCircle className="w-6 h-6 text-gray-400 group-hover:text-green-500" />
                        <span className="text-xs font-bold text-gray-500 group-hover:text-green-600">Create Task</span>
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'STUCK_TASKS') {
        const task = stuckTasks[currentTaskIndex];
        if (!task) return (
             // Fallback if array empty but step active
             <div className="flex flex-col items-center justify-center h-full">
                 <p>No stuck tasks!</p>
                 <button onClick={() => setStep('COMPLETE')} className="mt-4 px-4 py-2 bg-black text-white rounded">Continue</button>
             </div>
        );

        return (
            <div className="flex flex-col h-full max-w-2xl mx-auto p-6 justify-center">
                <div className="flex justify-between items-center mb-8">
                     <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Stale Tasks ({currentTaskIndex + 1}/{stuckTasks.length})</div>
                     <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white"><X className="w-5 h-5"/></button>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-xl mb-8 flex-1 flex flex-col">
                     <div className="flex items-start gap-4 mb-6">
                         <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-500">
                             <AlertTriangle className="w-6 h-6" />
                         </div>
                         <div>
                             <h3 className="text-xl font-bold text-gray-900 dark:text-white">{task.title}</h3>
                             <div className="text-sm text-gray-500 mt-1">Status: {task.status} • Created {new Date(task.createdAt).toLocaleDateString()}</div>
                         </div>
                     </div>

                     {task.description && (
                         <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm text-gray-700 dark:text-gray-300 mb-6 italic">
                             "{task.description}"
                         </div>
                     )}

                     <div className="mt-auto">
                         <div className="flex items-center gap-2 text-xs font-bold text-purple-500 uppercase tracking-wider mb-2">
                             <Sparkles className="w-3 h-3" /> AI Suggestion
                         </div>
                         <div className="text-sm text-gray-600 dark:text-gray-300">
                             {loadingSuggestion ? "Analyzing task..." : aiSuggestion || "Review this task manually."}
                         </div>
                     </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <button onClick={() => handleProcessCurrentTask('delete')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all group">
                        <Trash2 className="w-6 h-6 text-gray-400 group-hover:text-red-500" />
                        <span className="text-xs font-bold text-gray-500 group-hover:text-red-600">Delete</span>
                    </button>
                    <button onClick={() => handleProcessCurrentTask('keep')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group">
                        <Archive className="w-6 h-6 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                        <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white">Keep It</span>
                    </button>
                    <button onClick={() => handleProcessCurrentTask('done')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-800 transition-all group">
                        <CheckSquare className="w-6 h-6 text-gray-400 group-hover:text-green-500" />
                        <span className="text-xs font-bold text-gray-500 group-hover:text-green-600">Mark Done</span>
                    </button>
                </div>
            </div>
        );
    }

    // COMPLETE
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in-95">
             <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                 <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
             </div>
             <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">All Done!</h2>
             <p className="text-gray-600 dark:text-gray-300 max-w-md mb-8">
                 You've processed your inbox and cleaned up stale tasks.
             </p>
             <button 
                 onClick={onClose}
                 className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
             >
                 Back to Dashboard
             </button>
         </div>
    );
};
