import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { MoreHorizontal, Plus, Calendar as CalendarIcon, User, Filter, X, ArrowUpDown, Flag } from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateTaskAssignee: (taskId: string, assignee: string) => void;
  onUpdateTaskDueDate: (taskId: string, date: Date) => void;
  onUpdateTaskPriority: (taskId: string, priority: TaskPriority) => void;
}

type SortOption = 'NONE' | 'PRIORITY_DESC' | 'DUE_DATE_ASC';

export const TaskBoard: React.FC<TaskBoardProps> = ({ 
    tasks, 
    onUpdateTaskStatus, 
    onUpdateTaskAssignee, 
    onUpdateTaskDueDate,
    onUpdateTaskPriority 
}) => {
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('NONE');
  
  const columns = [
    { id: TaskStatus.TODO, label: 'To Do', color: 'bg-red-50 text-red-700' },
    { id: TaskStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-yellow-50 text-yellow-700' },
    { id: TaskStatus.DONE, label: 'Done', color: 'bg-green-50 text-green-700' },
  ];

  const MOCK_USERS = ['Me', 'Alice', 'Bob', 'Charlie', 'Dave'];

  // Compute unique assignees for the filter dropdown
  const availableAssignees = useMemo(() => {
    const users = new Set(MOCK_USERS);
    tasks.forEach(t => {
        if (t.assignee) users.add(t.assignee);
    });
    return Array.from(users).sort();
  }, [tasks]);

  const getPriorityScore = (p?: TaskPriority) => {
      switch (p) {
          case TaskPriority.HIGH: return 3;
          case TaskPriority.MEDIUM: return 2;
          case TaskPriority.LOW: return 1;
          default: return 0;
      }
  };

  const filteredAndSortedTasks = useMemo(() => {
      let result = tasks.filter(task => {
        const matchAssignee = assigneeFilter === 'ALL' 
            ? true 
            : assigneeFilter === 'Unassigned' 
                ? !task.assignee 
                : task.assignee === assigneeFilter;
                
        const matchStatus = statusFilter === 'ALL' 
            ? true 
            : task.status === statusFilter;

        const matchPriority = priorityFilter === 'ALL'
            ? true
            : task.priority === priorityFilter;
            
        return matchAssignee && matchStatus && matchPriority;
      });

      if (sortBy === 'PRIORITY_DESC') {
          result.sort((a, b) => getPriorityScore(b.priority) - getPriorityScore(a.priority));
      } else if (sortBy === 'DUE_DATE_ASC') {
          result.sort((a, b) => {
              const dateA = a.dueDate ? a.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
              const dateB = b.dueDate ? b.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
              return dateA - dateB;
          });
      }

      return result;
  }, [tasks, assigneeFilter, statusFilter, priorityFilter, sortBy]);

  const getPriorityColor = (p?: TaskPriority) => {
      switch(p) {
          case TaskPriority.HIGH: return 'text-red-600 bg-red-50 border-red-100';
          case TaskPriority.MEDIUM: return 'text-orange-600 bg-orange-50 border-orange-100';
          case TaskPriority.LOW: return 'text-blue-600 bg-blue-50 border-blue-100';
          default: return 'text-slate-300 bg-slate-50 border-slate-100';
      }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      {/* Filter Header */}
      <div className="px-6 py-3 border-b border-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-medium uppercase tracking-wider">Filters</span>
            </div>
            
            <div className="flex items-center space-x-2">
                {/* Assignee Filter */}
                <div className="relative group">
                    <select 
                        value={assigneeFilter}
                        onChange={(e) => setAssigneeFilter(e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 text-xs rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-200 transition-all cursor-pointer"
                    >
                        <option value="ALL">All Assignees</option>
                        <option value="Unassigned">Unassigned</option>
                        {availableAssignees.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <User className="w-3 h-3" />
                    </div>
                </div>

                {/* Status Filter */}
                <div className="relative group">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 text-xs rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-200 transition-all cursor-pointer"
                    >
                        <option value="ALL">All Statuses</option>
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                       <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    </div>
                </div>

                 {/* Priority Filter */}
                 <div className="relative group">
                    <select 
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 text-xs rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-200 transition-all cursor-pointer"
                    >
                        <option value="ALL">All Priorities</option>
                        {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                       <Flag className="w-3 h-3" />
                    </div>
                </div>

                {/* Clear Filters */}
                {(assigneeFilter !== 'ALL' || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
                    <button 
                        onClick={() => { setAssigneeFilter('ALL'); setStatusFilter('ALL'); setPriorityFilter('ALL'); }}
                        className="flex items-center space-x-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-600 transition-colors animate-in fade-in"
                    >
                        <X className="w-3 h-3" />
                        <span>Clear</span>
                    </button>
                )}
            </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="font-medium uppercase tracking-wider hidden sm:inline">Sort</span>
            </div>
            <div className="relative group">
                <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 text-xs rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-200 transition-all cursor-pointer"
                >
                    <option value="NONE">Default</option>
                    <option value="PRIORITY_DESC">Priority (High to Low)</option>
                    <option value="DUE_DATE_ASC">Due Date (Earliest)</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                </div>
            </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex space-x-6 h-full">
            {columns.map((col) => {
            const colTasks = filteredAndSortedTasks.filter(t => t.status === col.id);
            
            return (
            <div key={col.id} className="flex-shrink-0 w-80 flex flex-col h-full rounded-xl bg-slate-50/50 border border-slate-200">
                
                {/* Column Header */}
                <div className="p-3 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${col.color}`}>
                    {col.label}
                    </span>
                    <span className="text-slate-400 text-xs font-medium">
                    {colTasks.length}
                    </span>
                </div>
                <div className="flex space-x-1">
                    <button className="p-1 hover:bg-slate-200 rounded text-slate-400">
                    <Plus className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-slate-200 rounded text-slate-400">
                    <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
                </div>

                {/* Tasks List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                {colTasks.map((task) => (
                    <div
                        key={task.id}
                        className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 group flex flex-col gap-2"
                    >
                        {/* Content */}
                        <div>
                            <div className="flex justify-between items-start">
                                <h4 className="text-sm font-medium text-slate-800 mb-0.5 leading-tight flex-1">{task.title}</h4>
                            </div>
                            {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{task.description}</p>
                            )}
                        </div>
                        
                        {/* Footer Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-1">
                        
                        <div className="flex items-center space-x-2">
                            {/* Assignee Selector */}
                            <div className="relative flex items-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-medium transition-colors cursor-pointer ${
                                    task.assignee 
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                                    : 'bg-slate-50 text-slate-300 border-slate-100 border-dashed hover:border-slate-300'
                                }`}>
                                    {task.assignee ? task.assignee.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                                </div>
                                
                                <select
                                    value={task.assignee || ''}
                                    onChange={(e) => onUpdateTaskAssignee(task.id, e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    title="Assignee"
                                >
                                    <option value="">Unassigned</option>
                                    {MOCK_USERS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>

                            {/* Priority Selector */}
                            <div className="relative flex items-center group/priority">
                                <div className={`w-5 h-5 rounded flex items-center justify-center border text-[9px] font-medium transition-colors cursor-pointer ${getPriorityColor(task.priority)}`}>
                                    <Flag className="w-3 h-3" fill={task.priority === TaskPriority.HIGH ? 'currentColor' : 'none'} />
                                </div>
                                <select
                                    value={task.priority || ''}
                                    onChange={(e) => onUpdateTaskPriority(task.id, e.target.value as TaskPriority)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    title="Priority"
                                >
                                    {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            {/* Due Date Picker */}
                            <div className="relative group/date">
                                <div className={`flex items-center text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                                    task.dueDate ? 'text-slate-500 bg-slate-50' : 'text-slate-300 hover:bg-slate-50'
                                }`}>
                                    <CalendarIcon className="w-3 h-3 mr-1 opacity-70" />
                                    <span>
                                        {task.dueDate
                                            ? task.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                            : 'Date'}
                                    </span>
                                </div>
                                <input
                                    type="date"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                    value={task.dueDate ? task.dueDate.toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        // Construct date manually to avoid timezone shifts
                                        const parts = e.target.value.split('-');
                                        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
                                        onUpdateTaskDueDate(task.id, date);
                                    }}
                                />
                            </div>
                            
                            {/* Status Mover */}
                            <div className="relative">
                                <span className="text-[9px] font-medium text-slate-400 hover:text-slate-600 cursor-pointer bg-slate-50 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 transition-all">
                                    Move
                                </span>
                                <select 
                                    value={task.status}
                                    onChange={(e) => onUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                >
                                    {Object.values(TaskStatus).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        </div>
                    </div>
                    ))}
                    
                    {colTasks.length === 0 && (
                        <div className="h-20 border-2 border-dashed border-slate-100 rounded-lg flex items-center justify-center text-slate-300 text-xs">
                        No tasks
                        </div>
                    )}
                </div>
            </div>
            );
        })}
        </div>
      </div>
    </div>
  );
};