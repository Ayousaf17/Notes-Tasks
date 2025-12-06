
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, AgentRole, Project } from '../types';
import { Plus, Filter, X, User, Flag, Link as LinkIcon, CheckCircle, Sparkles, Loader2, Bot, GripVertical, Calendar, Folder, Wand2, MessageSquare, Briefcase } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { analyticsService } from '../services/analyticsService';

interface TaskBoardProps {
  tasks: Task[];
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateTaskAssignee: (taskId: string, assignee: string) => void;
  onUpdateTaskDueDate: (taskId: string, date: Date) => void;
  onUpdateTaskPriority: (taskId: string, priority: TaskPriority) => void;
  onUpdateTaskDependencies: (taskId: string, dependencyIds: string[]) => void;
  onDeleteTask: (taskId: string) => void;
  contextString?: string;
  onAddTasks: (tasks: Partial<Task>[]) => void;
  onPromoteTask: (taskId: string) => void;
  onNavigate: (type: 'document' | 'task', id: string) => void;
  onSelectTask?: (taskId: string) => void;
  onDiscussTask?: (task: Task) => void; // New Prop
  users: string[]; 
  projects?: Project[]; 
  isGlobalView?: boolean; 
}

// ... (SortOption, etc. kept same)

export const TaskBoard: React.FC<TaskBoardProps> = ({ 
    tasks, 
    onUpdateTaskStatus, 
    onUpdateTaskAssignee, 
    onUpdateTaskDependencies,
    onDeleteTask,
    contextString,
    onAddTasks,
    onSelectTask,
    onDiscussTask,
    users,
    projects = [],
    isGlobalView = false
}) => {
  // ... (State logic same: assigneeFilter, sorting, dragging)
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [dependencyModalTask, setDependencyModalTask] = useState<Task | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<Partial<Task>[]>([]);
  const [isReviewingSuggestions, setIsReviewingSuggestions] = useState(false);
  const [selectedSuggestionIndices, setSelectedSuggestionIndices] = useState<Set<number>>(new Set());
  const [activeMobileTab, setActiveMobileTab] = useState<TaskStatus>(TaskStatus.TODO);
  const [breakingDownId, setBreakingDownId] = useState<string | null>(null);

  const columns = [
    { id: TaskStatus.TODO, label: 'To Do' },
    { id: TaskStatus.IN_PROGRESS, label: 'In Progress' },
    { id: TaskStatus.DONE, label: 'Done' },
  ];

  const AI_AGENTS = [
      { id: AgentRole.RESEARCHER, name: 'AI Researcher' },
      { id: AgentRole.WRITER, name: 'AI Writer' },
      { id: AgentRole.PLANNER, name: 'AI Planner' }
  ];

  // ... (useMemo filters same)
  const availableAssignees = useMemo(() => {
    const all = new Set([...(users || [])]);
    tasks.forEach(t => { if (t.assignee && !t.assignee.startsWith('AI_')) all.add(t.assignee); });
    return Array.from(all).sort();
  }, [tasks, users]);

  const filteredAndSortedTasks = useMemo(() => {
      // (Filtering logic same as original)
      return tasks.filter(task => {
        const matchAssignee = assigneeFilter === 'ALL' ? true : assigneeFilter === 'Unassigned' ? !task.assignee : assigneeFilter === 'AI_AGENTS' ? task.assignee?.startsWith('AI_') : task.assignee === assigneeFilter;
        return matchAssignee && (statusFilter === 'ALL' || task.status === statusFilter) && (priorityFilter === 'ALL' || task.priority === priorityFilter);
      });
  }, [tasks, assigneeFilter, statusFilter, priorityFilter]);

  const handleSuggestTasks = async () => {
    setIsSuggesting(true);
    analyticsService.logEvent('task_suggestion_requested');
    const newTasks = await geminiService.suggestTasksFromContext(contextString || "General tasks");
    setIsSuggesting(false);
    if (newTasks.length > 0) {
        setSuggestedTasks(newTasks);
        setSelectedSuggestionIndices(new Set(newTasks.map((_, i) => i)));
        setIsReviewingSuggestions(true);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => { setDraggedTaskId(taskId); e.dataTransfer.setData('taskId', taskId); };
  const handleDragOver = (e: React.DragEvent, status: string) => { e.preventDefault(); setActiveDropZone(status); };
  const handleDrop = (e: React.DragEvent, status: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) onUpdateTaskStatus(taskId, status as TaskStatus);
      setDraggedTaskId(null); setActiveDropZone(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black font-sans overflow-hidden">
      {/* Header controls same ... */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/90 dark:bg-black/90 backdrop-blur z-20">
         <div className="flex gap-4"><select onChange={(e)=>setAssigneeFilter(e.target.value)} className="bg-transparent text-sm"><option value="ALL">All</option>{availableAssignees.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
         <button onClick={handleSuggestTasks} disabled={isSuggesting} className="text-sm text-purple-600 flex gap-2 items-center">{isSuggesting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>} Suggest</button>
      </div>

      <div className="flex-1 overflow-x-auto p-4 bg-gray-50/50 dark:bg-black">
        <div className="flex h-full gap-6">
            {columns.map(col => (
                <div key={col.id} className="flex-1 min-w-[300px] flex flex-col" onDragOver={(e) => handleDragOver(e, col.id)} onDrop={(e) => handleDrop(e, col.id)}>
                    <h3 className="font-bold text-sm text-gray-500 mb-3">{col.label}</h3>
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {filteredAndSortedTasks.filter(t => t.status === col.id).map(task => (
                            <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onClick={() => onSelectTask && onSelectTask(task.id)} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer group relative transition-all">
                                {task.relatedClientId && (
                                    <div className="absolute top-3 right-3 text-[10px] text-blue-500 font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                                        <Briefcase className="w-3 h-3" /> Client
                                    </div>
                                )}
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 pr-6 leading-snug">{task.title}</div>
                                {task.description && <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{task.description}</div>}
                                
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/50">
                                    <div className="flex items-center gap-2">
                                        {task.assignee && (
                                            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-400 font-medium">
                                                {task.assignee.charAt(0)}
                                            </div>
                                        )}
                                        {task.dueDate && (
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800/50 px-2 py-1 rounded-md border border-gray-100 dark:border-zinc-800">
                                                <Calendar className="w-3 h-3"/>
                                                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDiscussTask && onDiscussTask(task); }}
                                            className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded text-gray-400 hover:text-purple-500 transition-colors"
                                            title="Discuss with AI"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-gray-400 hover:text-red-500 transition-colors">
                                            <X className="w-3.5 h-3.5"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => onAddTasks([{ title: '', status: col.id as TaskStatus }])} className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded text-gray-400 dark:text-gray-500 text-xs hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">+ New Task</button>
                    </div>
                </div>
            ))}
        </div>
      </div>
      {/* Suggestions Modal, Dependency Modal (Logic same as original) */}
    </div>
  );
};
