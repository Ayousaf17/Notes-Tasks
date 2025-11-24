
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, AgentRole } from '../types';
import { Plus, Filter, X, ArrowUpDown, User, Flag, Link as LinkIcon, AlertCircle, CheckCircle, Sparkles, Loader2, Bot, ChevronDown, ChevronUp, GripVertical, CheckSquare, Square, Calendar, MoreHorizontal, Paperclip } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface TaskBoardProps {
  tasks: Task[];
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateTaskAssignee: (taskId: string, assignee: string) => void;
  onUpdateTaskDueDate: (taskId: string, date: Date) => void;
  onUpdateTaskPriority: (taskId: string, priority: TaskPriority) => void;
  onUpdateTaskDependencies: (taskId: string, dependencyIds: string[]) => void;
  contextString?: string;
  onAddTasks: (tasks: Partial<Task>[]) => void;
  onPromoteTask: (taskId: string) => void;
  onNavigate: (type: 'document' | 'task', id: string) => void;
  onSelectTask?: (taskId: string) => void;
}

type SortOption = 'NONE' | 'PRIORITY_DESC' | 'DUE_DATE_ASC';

export const TaskBoard: React.FC<TaskBoardProps> = ({ 
    tasks, 
    onUpdateTaskStatus, 
    onUpdateTaskAssignee, 
    onUpdateTaskDueDate,
    onUpdateTaskPriority,
    onUpdateTaskDependencies,
    contextString,
    onAddTasks,
    onPromoteTask,
    onNavigate,
    onSelectTask
}) => {
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('NONE');
  
  const [dependencyModalTask, setDependencyModalTask] = useState<Task | null>(null);

  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<Partial<Task>[]>([]);
  const [isReviewingSuggestions, setIsReviewingSuggestions] = useState(false);
  const [selectedSuggestionIndices, setSelectedSuggestionIndices] = useState<Set<number>>(new Set());
  
  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  const columns = [
    { id: TaskStatus.TODO, label: 'To Do' },
    { id: TaskStatus.IN_PROGRESS, label: 'In Progress' },
    { id: TaskStatus.DONE, label: 'Done' },
  ];

  const MOCK_USERS = ['Me', 'Alice', 'Bob', 'Charlie', 'Dave'];
  const AI_AGENTS = [
      { id: AgentRole.RESEARCHER, name: 'AI Researcher' },
      { id: AgentRole.WRITER, name: 'AI Writer' },
      { id: AgentRole.PLANNER, name: 'AI Planner' }
  ];

  const availableAssignees = useMemo(() => {
    const users = new Set(MOCK_USERS);
    tasks.forEach(t => {
        if (t.assignee && !t.assignee.startsWith('AI_')) users.add(t.assignee);
    });
    return Array.from(users).sort();
  }, [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
      let result = tasks.filter(task => {
        const matchAssignee = assigneeFilter === 'ALL' ? true : assigneeFilter === 'Unassigned' ? !task.assignee : assigneeFilter === 'AI_AGENTS' ? task.assignee?.startsWith('AI_') : task.assignee === assigneeFilter;
        const matchStatus = statusFilter === 'ALL' ? true : task.status === statusFilter;
        const matchPriority = priorityFilter === 'ALL' ? true : task.priority === priorityFilter;
        return matchAssignee && matchStatus && matchPriority;
      });

      if (sortBy === 'PRIORITY_DESC') {
          const score = (p?: TaskPriority) => p === TaskPriority.HIGH ? 3 : p === TaskPriority.MEDIUM ? 2 : 1;
          result.sort((a, b) => score(b.priority) - score(a.priority));
      } else if (sortBy === 'DUE_DATE_ASC') {
          result.sort((a, b) => (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity));
      }
      return result;
  }, [tasks, assigneeFilter, statusFilter, priorityFilter, sortBy]);

  const handleSuggestTasks = async () => {
    if (isSuggesting) return;
    setIsSuggesting(true);
    const contextToUse = (contextString && contextString.length > 50) ? contextString : "Project Initiation tasks.";
    const newTasks = await geminiService.suggestTasksFromContext(contextToUse);
    setIsSuggesting(false);
    if (newTasks.length > 0) {
        setSuggestedTasks(newTasks);
        setSelectedSuggestionIndices(new Set(newTasks.map((_, i) => i)));
        setIsReviewingSuggestions(true);
    }
  };

  const confirmSuggestions = () => {
    onAddTasks(suggestedTasks.filter((_, i) => selectedSuggestionIndices.has(i)));
    setIsReviewingSuggestions(false);
    setSuggestedTasks([]);
  };

  const isTaskBlocked = (task: Task) => task.dependencies && task.dependencies.some(depId => tasks.find(t => t.id === depId)?.status !== TaskStatus.DONE);

  const toggleDependency = (targetId: string) => {
      if (!dependencyModalTask) return;
      const cur = dependencyModalTask.dependencies || [];
      const newDeps = cur.includes(targetId) ? cur.filter(id => id !== targetId) : [...cur, targetId];
      onUpdateTaskDependencies(dependencyModalTask.id, newDeps);
      setDependencyModalTask({ ...dependencyModalTask, dependencies: newDeps });
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.setData('taskId', taskId);
      e.dataTransfer.effectAllowed = 'move';
      document.body.style.cursor = 'grabbing';
  };

  const handleDragEnd = () => {
      setDraggedTaskId(null);
      setActiveDropZone(null);
      document.body.style.cursor = 'default';
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
      e.preventDefault(); 
      if (activeDropZone !== status) {
          setActiveDropZone(status);
      }
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) {
          onUpdateTaskStatus(taskId, status as TaskStatus);
      }
      setDraggedTaskId(null);
      setActiveDropZone(null);
      document.body.style.cursor = 'default';
  };

  const handleQuickAdd = (status: TaskStatus) => {
      onAddTasks([{
          title: '',
          status: status,
          priority: TaskPriority.MEDIUM
      }]);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 font-sans overflow-hidden transition-colors duration-200">
      {/* Header Controls */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-20 sticky top-0">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Filter className="w-4 h-4 text-gray-400" />
                <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="bg-transparent border-none text-sm focus:ring-0 p-0 cursor-pointer hover:text-black dark:hover:text-white font-medium dark:bg-gray-900">
                    <option value="ALL">All Assignees</option>
                    <option value="Unassigned">Unassigned</option>
                    <option value="AI_AGENTS">AI Agents</option>
                    {availableAssignees.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>
            {(assigneeFilter !== 'ALL' || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
                <button onClick={() => { setAssigneeFilter('ALL'); setStatusFilter('ALL'); setPriorityFilter('ALL'); }} className="text-xs text-gray-400 hover:text-black dark:hover:text-white"><X className="w-3 h-3" /></button>
            )}
        </div>

        <div className="flex items-center gap-4">
             <button onClick={handleSuggestTasks} disabled={isSuggesting} className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 disabled:opacity-50 transition-colors font-medium">
                {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Suggest Tasks</span>
            </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-gray-50/50 dark:bg-gray-950">
        <div className="flex gap-6 h-full min-w-max">
            {columns.map(col => {
                const colTasks = filteredAndSortedTasks.filter(t => t.status === col.id);
                const isActiveDrop = activeDropZone === col.id;
                
                return (
                    <div 
                        key={col.id} 
                        className={`w-80 flex-shrink-0 flex flex-col h-full rounded-xl transition-all duration-200 ${isActiveDrop ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'bg-transparent'}`}
                        onDragOver={(e) => handleDragOver(e, col.id)}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        {/* Column Header (Sticky) */}
                        <div className="flex items-center justify-between px-1 py-3 mb-2 sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm rounded-lg border border-transparent shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 pl-2">{col.label}</h3>
                            <span className="text-xs font-medium text-gray-400 pr-2">{colTasks.length}</span>
                        </div>
                        
                        {/* Task List (Scrollable) */}
                        <div className="flex-1 overflow-y-auto px-1 pb-4 space-y-3 no-scrollbar">
                            {colTasks.map(task => {
                                const blocked = isTaskBlocked(task);
                                const isAgentWorking = task.agentStatus === 'working';
                                const isDragging = draggedTaskId === task.id;

                                return (
                                    <div 
                                        key={task.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => onSelectTask && onSelectTask(task.id)}
                                        className={`group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col gap-3 ${blocked ? 'opacity-70 bg-gray-50 dark:bg-gray-800' : ''} ${isDragging ? 'opacity-50 ring-2 ring-indigo-400 rotate-2 scale-95 z-50' : 'hover:-translate-y-0.5'}`}
                                    >
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 dark:text-gray-600 pointer-events-none">
                                            <GripVertical className="w-4 h-4" />
                                        </div>

                                        <div className="flex flex-col gap-1 pointer-events-none">
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm text-gray-900 dark:text-gray-100 leading-snug font-medium line-clamp-2 pr-6">{task.title || 'Untitled Task'}</span>
                                            </div>
                                            {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{task.description}</p>}
                                        </div>

                                        {isAgentWorking && (
                                            <div className="flex items-center gap-2 text-[10px] text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 px-2 py-1 rounded-md self-start pointer-events-none">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                <span>AI Working...</span>
                                            </div>
                                        )}

                                        {/* Meta Row */}
                                        <div className="flex items-center justify-between pt-2 mt-auto border-t border-gray-50 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                                             <div className="flex items-center gap-2">
                                                 {/* Assignee Avatar */}
                                                 <div className="relative group/assignee" title={task.assignee || 'Unassigned'}>
                                                     <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300 border border-white dark:border-gray-700 shadow-sm overflow-hidden font-medium">
                                                         {task.assignee ? (task.assignee.startsWith('AI_') ? <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : task.assignee.charAt(0)) : <User className="w-3.5 h-3.5 text-gray-400" />}
                                                     </div>
                                                     <select value={task.assignee || ''} onChange={(e) => onUpdateTaskAssignee(task.id, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer text-xs">
                                                         <option value="">Unassigned</option>
                                                         <optgroup label="Team">{MOCK_USERS.map(u => <option key={u} value={u}>{u}</option>)}</optgroup>
                                                         <optgroup label="AI">{AI_AGENTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
                                                     </select>
                                                 </div>
                                                 
                                                 {/* Priority Badge */}
                                                 {task.priority && (
                                                     <div className={`w-1.5 h-1.5 rounded-full ${task.priority === TaskPriority.HIGH ? 'bg-red-500' : task.priority === TaskPriority.MEDIUM ? 'bg-orange-400' : 'bg-blue-400'}`} title={`Priority: ${task.priority}`} />
                                                 )}
                                             </div>
                                             
                                             <div className="flex items-center gap-3">
                                                 {/* Dependencies Trigger */}
                                                 <button onClick={() => setDependencyModalTask(task)} className={`text-gray-300 hover:text-black dark:hover:text-white transition-colors ${task.dependencies?.length ? 'text-gray-900 dark:text-gray-100' : ''}`} title="Dependencies">
                                                     <LinkIcon className="w-3.5 h-3.5" />
                                                 </button>

                                                 {/* Due Date */}
                                                 {task.dueDate && (
                                                     <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium cursor-default">
                                                         <Calendar className="w-3 h-3" />
                                                         <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                     </div>
                                                 )}
                                             </div>
                                        </div>
                                    </div>
                                );
                            })}
                             {/* Quick Add Button */}
                             <button 
                                onClick={() => handleQuickAdd(col.id as TaskStatus)}
                                className="w-full py-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs font-medium transition-all flex items-center justify-center gap-1"
                             >
                                 <Plus className="w-3.5 h-3.5" /> New
                             </button>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Dependency Modal */}
      {dependencyModalTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-900 p-0 rounded-lg shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm animate-in zoom-in-95 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Dependencies for "{dependencyModalTask.title}"</h3>
                      <button onClick={() => setDependencyModalTask(null)} className="text-gray-400 hover:text-black dark:hover:text-white p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="p-2 max-h-80 overflow-y-auto">
                      {tasks.filter(t => t.id !== dependencyModalTask.id).map(t => {
                          const isDep = dependencyModalTask.dependencies?.includes(t.id);
                          return (
                              <div key={t.id} onClick={() => toggleDependency(t.id)} className={`px-4 py-3 text-sm flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors group`}>
                                  {isDep ? (
                                      <div className="w-5 h-5 bg-black dark:bg-white rounded-full flex items-center justify-center shrink-0">
                                          <CheckCircle className="w-3.5 h-3.5 text-white dark:text-black" />
                                      </div>
                                  ) : (
                                      <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full shrink-0 group-hover:border-gray-400 dark:group-hover:border-gray-500"></div>
                                  )}
                                  <span className={`truncate ${isDep ? 'text-black dark:text-white font-medium' : 'text-gray-600 dark:text-gray-300'}`}>{t.title}</span>
                              </div>
                          );
                      })}
                      {tasks.length <= 1 && (
                          <div className="p-4 text-center text-gray-400 text-xs">No other tasks available.</div>
                      )}
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-400 text-center">
                      Select tasks that must be completed before this one.
                  </div>
              </div>
          </div>
      )}

      {/* Suggestions Modal */}
      {isReviewingSuggestions && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl border border-gray-100 dark:border-gray-800 w-full max-w-md animate-in zoom-in-95">
                   <h3 className="font-medium text-sm mb-4 text-gray-900 dark:text-white">Suggested Tasks</h3>
                   <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                       {suggestedTasks.map((t, i) => (
                           <div key={i} onClick={() => {
                               const newSet = new Set(selectedSuggestionIndices);
                               if (newSet.has(i)) newSet.delete(i); else newSet.add(i);
                               setSelectedSuggestionIndices(newSet);
                           }} className={`p-3 border rounded-lg cursor-pointer transition-all flex items-start gap-3 ${selectedSuggestionIndices.has(i) ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                               <div className={`mt-0.5 w-4 h-4 border rounded flex items-center justify-center shrink-0 ${selectedSuggestionIndices.has(i) ? 'bg-black dark:bg-white border-black dark:border-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                   {selectedSuggestionIndices.has(i) && <CheckSquare className="w-3 h-3 text-white dark:text-black" />}
                               </div>
                               <div>
                                   <div className="text-sm font-medium text-gray-900 dark:text-white">{t.title}</div>
                                   <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.description}</div>
                               </div>
                           </div>
                       ))}
                   </div>
                   <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                       <button onClick={() => setIsReviewingSuggestions(false)} className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">Cancel</button>
                       <button onClick={confirmSuggestions} className="px-4 py-2 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">Add Selected</button>
                   </div>
              </div>
           </div>
      )}
    </div>
  );
};
