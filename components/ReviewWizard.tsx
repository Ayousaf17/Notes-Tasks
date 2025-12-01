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
        const now = new Date();
        const stuck = tasks.filter(t => {
            if (t.status !== TaskStatus.IN_PROGRESS) return false;
            if (!t.createdAt) return false; // Safety check
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
        if (!task) return; // Safety
        if (action === 'delete') onDeleteTask(task.id);
        if (action === 'done') onUpdateTaskStatus(task.id, TaskStatus.DONE);
        if (action === 'delegate') onUpdateTaskAssignee(task.id, 'AI_RESEARCHER'); // Delegate to AI
        
        handleNextTask();
    };

    // --- Renderers ---

    if (step === 'INTRO') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in zoom-in-95 font-sans">
                <div className="w-20 h-20 bg-black dark:bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <Sparkles className="w-10 h-10 text-white dark:text-black" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">The Review Protocol</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8 text-lg">
                    Let's clean up your workspace. We'll process your inbox and unblock stuck tasks to get you back to flow.
                </p>
                <div className="flex gap-4 text-sm text-gray-400 dark:text-gray-500 mb-8">
                    <div className="flex items-center gap-2"><Inbox className="w-4 h-4" /> {pendingInboxItems.length} Inbox Items</div>
                    <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {stuckTasks.length} Stuck Tasks</div>
                </div>
                <button 
                    onClick={() => setStep(pendingInboxItems.length > 0 ? 'INBOX' : stuckTasks.length > 0 ? 'STUCK_TASKS' : 'COMPLETE')}
                    className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center gap-2"
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
            <div className="flex flex-col items-center justify-center h-full p-8 max-w-2xl mx-auto w-full animate-in slide-in-from-right duration-300 font-sans">
                <div className="w-full flex justify-between items-center mb-12">
                    <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Inbox Processing ({currentInboxIndex + 1}/{pendingInboxItems.length})</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 w-full mb-8 min-h-[200px] flex items-center justify-center text-center">
                    <p className="text-2xl text-