
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, AgentRole } from '../types';
import { Plus, Filter, X, ArrowUpDown, User, Flag, Link as LinkIcon, AlertCircle, CheckCircle, Sparkles, Loader2, Bot, ChevronDown, ChevronUp } from 'lucide-react';
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
    onNavigate
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
  const [expandedResultTaskId, setExpandedResultTaskId] = useState<string | null>(null);

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

  return (
    <div className="flex-1 flex flex-col h-full bg-white font-sans">
      {/* Header Controls */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Filter className="w-4 h-4" />
                <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="bg-transparent border-none text-sm focus:ring-0 p-0 cursor-pointer hover:text-black">
                    <option value="ALL">All Assignees</option>
                    <option value="Unassigned">Unassigned</option>
                    <option value="AI_AGENTS">AI Agents</option>
                    {availableAssignees.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>
            {(assigneeFilter !== 'ALL' || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
                <button onClick={() => { setAssigneeFilter('ALL'); setStatusFilter('ALL'); setPriorityFilter('ALL'); }} className="text-xs text-gray-400 hover:text-black"><X className="w-3 h-3" /></button>
            )}
        </div>

        <div className="flex items-center gap-4">
             <button onClick={handleSuggestTasks} disabled={isSuggesting} className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 disabled:opacity-50">
                {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Suggest Tasks</span>
            </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-8 h-full">
            {columns.map(col => {
                const colTasks = filteredAndSortedTasks.filter(t => t.status === col.id);
                return (
                    <div key={col.id} className="w-80 flex-shrink-0 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <span className="text-sm font-medium text-gray-900">{col.label}</span>
                            <span className="text-xs text-gray-400">{colTasks.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pb-10">
                            {colTasks.map(task => {
                                const blocked = isTaskBlocked(task);
                                const isAgentWorking = task.agentStatus === 'working';
                                return (
                                    <div key={task.id} className={`group bg-white border border-gray-200 p-4 rounded-md hover:border-gray-400 transition-colors flex flex-col gap-2 ${blocked ? 'opacity-70' : ''}`}>
                                        <div className="flex justify-between items-start">
                                            <span className="text-sm text-gray-900 leading-snug font-medium">{task.title}</span>
                                            {task.priority === TaskPriority.HIGH && <div className="w-1.5 h-1.5 bg-black rounded-full flex-shrink-0 mt-1.5" />}
                                        </div>
                                        
                                        {task.description && <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>}

                                        {isAgentWorking && (
                                            <div className="flex items-center gap-2 text-[10px] text-purple-600">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                <span>AI Working...</span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 mt-1">
                                             <div className="flex items-center gap-2">
                                                 {/* Assignee */}
                                                 <div className="relative">
                                                     <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600 border border-gray-200">
                                                         {task.assignee ? task.assignee.charAt(0) : <User className="w-3 h-3" />}
                                                     </div>
                                                     <select value={task.assignee || ''} onChange={(e) => onUpdateTaskAssignee(task.id, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                                                         <option value="">Unassigned</option>
                                                         <optgroup label="Team">{MOCK_USERS.map(u => <option key={u} value={u}>{u}</option>)}</optgroup>
                                                         <optgroup label="AI">{AI_AGENTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
                                                     </select>
                                                 </div>
                                                 {/* Dependencies */}
                                                 <button onClick={() => setDependencyModalTask(task)} className={`w-5 h-5 flex items-center justify-center rounded-sm text-gray-400 hover:text-black ${task.dependencies?.length ? 'text-black' : ''}`}>
                                                     <LinkIcon className="w-3 h-3" />
                                                 </button>
                                             </div>
                                             
                                             <div className="relative">
                                                 <span className="text-[10px] text-gray-400 hover:text-black cursor-pointer uppercase tracking-wider">{task.status}</span>
                                                 <select value={task.status} onChange={(e) => onUpdateTaskStatus(task.id, e.target.value as TaskStatus)} className="absolute inset-0 opacity-0 cursor-pointer">
                                                     {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                                 </select>
                                             </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Dependency Modal */}
      {dependencyModalTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-100 w-full max-w-sm">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-sm">Dependencies for "{dependencyModalTask.title}"</h3>
                      <button onClick={() => setDependencyModalTask(null)}><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                      {tasks.filter(t => t.id !== dependencyModalTask.id).map(t => {
                          const isDep = dependencyModalTask.dependencies?.includes(t.id);
                          return (
                              <div key={t.id} onClick={() => toggleDependency(t.id)} className={`p-2 text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded ${isDep ? 'text-black font-medium' : 'text-gray-500'}`}>
                                  <div className={`w-3 h-3 border ${isDep ? 'bg-black border-black' : 'border-gray-300'}`} />
                                  <span>{t.title}</span>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* Suggestions Modal */}
      {isReviewingSuggestions && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-100 w-full max-w-md">
                   <h3 className="font-medium text-sm mb-4">Suggested Tasks</h3>
                   <div className="space-y-2 mb-6">
                       {suggestedTasks.map((t, i) => (
                           <div key={i} onClick={() => {
                               const newSet = new Set(selectedSuggestionIndices);
                               if (newSet.has(i)) newSet.delete(i); else newSet.add(i);
                               setSelectedSuggestionIndices(newSet);
                           }} className={`p-3 border rounded cursor-pointer ${selectedSuggestionIndices.has(i) ? 'border-black bg-gray-50' : 'border-gray-200'}`}>
                               <div className="text-sm font-medium">{t.title}</div>
                               <div className="text-xs text-gray-500">{t.description}</div>
                           </div>
                       ))}
                   </div>
                   <div className="flex justify-end gap-2">
                       <button onClick={() => setIsReviewingSuggestions(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-black">Cancel</button>
                       <button onClick={confirmSuggestions} className="px-3 py-1.5 text-xs bg-black text-white rounded">Add Selected</button>
                   </div>
              </div>
           </div>
      )}
    </div>
  );
};
