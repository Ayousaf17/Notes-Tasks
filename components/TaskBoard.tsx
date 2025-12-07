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
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<Partial<Task>[]>([]);
  const [isReviewingSuggestions, setIsReviewingSuggestions] = useState(false);
  const [selectedSuggestionIndices, setSelectedSuggestionIndices] = useState<Set<number>>(new Set());

  const columns = [
    { id: TaskStatus.TODO, label: 'To Do' },
    { id: TaskStatus.IN_PROGRESS, label: 'In Progress' },
    { id: TaskStatus.DONE, label: 'Done' },
  ];

  const availableAssignees = useMemo(() => {
    const all = new Set([...(users || [])]);
    tasks.forEach(t => { if (t.assignee && !t.assignee.startsWith('AI_')) all.add(t.assignee); });
    return Array.from(all).sort();
  }, [tasks, users]);

  const filteredAndSortedTasks = useMemo(() => {
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

  const getPriorityBadge = (priority: TaskPriority) => {
      switch(priority) {
          case TaskPriority.HIGH: return <span className="w-1.5 h-1.5 rounded-full bg-red-500" />;
          case TaskPriority.MEDIUM: return <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />;
          case TaskPriority.LOW: return <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />;
          default: return null;
      }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans overflow-hidden">
      {/* Header Controls */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card z-20 shadow-sm">
         <div className="flex gap-4 items-center">
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                 <Filter className="w-4 h-4" />
                 <span className="text-xs font-bold uppercase tracking-wider">Filter</span>
             </div>
             <select onChange={(e)=>setAssigneeFilter(e.target.value)} className="bg-muted/50 border-none rounded-md px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary">
                 <option value="ALL">All Assignees</option>
                 {availableAssignees.map(u=><option key={u} value={u}>{u}</option>)}
             </select>
         </div>
         <button 
            onClick={handleSuggestTasks} 
            disabled={isSuggesting} 
            className="text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-full flex gap-2 items-center transition-colors"
         >
             {isSuggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>} 
             Auto-Suggest
         </button>
      </div>

      <div className="flex-1 overflow-x-auto p-4 md:p-6 bg-background">
        <div className="flex h-full gap-6 min-w-full md:min-w-0">
            {columns.map(col => (
                <div 
                    key={col.id} 
                    className={`flex-1 min-w-[300px] flex flex-col rounded-xl bg-muted/30 p-3 border border-transparent transition-colors ${activeDropZone === col.id ? 'border-primary/50 bg-primary/5' : ''}`}
                    onDragOver={(e) => handleDragOver(e, col.id)} 
                    onDrop={(e) => handleDrop(e, col.id)}
                >
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-widest">{col.label}</h3>
                        <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {filteredAndSortedTasks.filter(t => t.status === col.id).length}
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-4">
                        {filteredAndSortedTasks.filter(t => t.status === col.id).map(task => (
                            <div 
                                key={task.id} 
                                draggable 
                                onDragStart={(e) => handleDragStart(e, task.id)} 
                                onClick={() => onSelectTask && onSelectTask(task.id)} 
                                className="bg-card text-card-foreground p-4 rounded-xl shadow-sm border border-border hover:shadow-md hover:border-primary/20 cursor-pointer group relative transition-all duration-200"
                            >
                                {task.relatedClientId && (
                                    <div className="absolute top-3 right-3 text-[10px] text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" /> Client
                                    </div>
                                )}
                                
                                <div className="flex items-start gap-2 mb-2 pr-6">
                                    {getPriorityBadge(task.priority || TaskPriority.MEDIUM)}
                                    <div className="text-sm font-semibold leading-snug">{task.title}</div>
                                </div>
                                
                                {task.description && <div className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed pl-3.5">{task.description}</div>}
                                
                                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                    <div className="flex items-center gap-3">
                                        {task.assignee ? (
                                            <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-secondary-foreground shadow-sm" title={task.assignee}>
                                                {task.assignee.charAt(0)}
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center">
                                                <User className="w-3 h-3 text-muted-foreground/50" />
                                            </div>
                                        )}
                                        
                                        {task.dueDate && (
                                            <div className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded ${new Date(task.dueDate) < new Date() ? 'text-red-500 bg-red-50 dark:bg-red-900/10' : 'text-muted-foreground bg-muted'}`}>
                                                <Calendar className="w-3 h-3"/>
                                                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDiscussTask && onDiscussTask(task); }}
                                            className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
                                            title="Discuss"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} className="p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-colors">
                                            <X className="w-3.5 h-3.5"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        <button 
                            onClick={() => onAddTasks([{ title: '', status: col.id as TaskStatus }])} 
                            className="w-full py-2.5 border border-dashed border-border rounded-xl text-muted-foreground text-xs hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-3.5 h-3.5" /> New Task
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};