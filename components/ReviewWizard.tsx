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