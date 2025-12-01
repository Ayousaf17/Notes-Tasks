
import React, { useMemo } from 'react';
import { Project, Task, Document, TaskStatus, TaskPriority, ViewMode } from '../types';
import { PieChart, Clock, Calendar, FileText, CheckSquare, ArrowRight, AlertCircle, BarChart3, Activity, Users, Target, Zap } from 'lucide-react';

interface ProjectOverviewProps {
  project: Project;
  tasks: Task[];
  documents: Document[];
  onNavigate: (type: 'document' | 'task', id: string) => void;
  onChangeView: (view: ViewMode) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  tasks,
  documents,
  onNavigate,
  onChangeView
}) => {
  
  // Calculate Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === TaskStatus.DONE).length;
    const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const todo = tasks.filter(t => t.status === TaskStatus.TODO).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    
    const highPriority = tasks.filter(t => t.priority === TaskPriority.HIGH && t.status !== TaskStatus.DONE);
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.DONE).length;

    // Get active team members based on task assignment
    const activeMembers = new Set(tasks.map(t => t.assignee).filter(Boolean));

    return { total, done, inProgress, todo, percent, highPriority, overdue, activeMembers: Array.from(activeMembers) };
  }, [tasks]);

  const recentDocs = useMemo(() => {
    return [...documents].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);
  }, [documents]);

  const activePriorities = useMemo(() => {
      // Prioritize High Priority first, then In Progress
      return [...tasks]
        .filter(t => t.status !== TaskStatus.DONE)
        .sort((a, b) => {
            if (a.priority === TaskPriority.HIGH && b.priority !== TaskPriority.HIGH) return -1;
            if (a.priority !== TaskPriority.HIGH && b.priority === TaskPriority.HIGH) return 1;
            return 0;
        })
        .slice(0, 4);
  }, [tasks]);

  return (
    <div className="flex-1 h-full bg-white dark:bg-black overflow-y-auto font-sans p-6 md:p-10 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto space-y-12 pb-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    <Target className="w-4 h-4" /> Project Dashboard
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">{project.title}</h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-lg">
                    {project.description || `Overview and health status.`}
                </p>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={() => onChangeView(ViewMode.BOARD)} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                     Go to Board
                 </button>
            </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Velocity / Progress */}
            <div className="col-span-1 md:col-span-2 bg-gray-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 flex items-center justify-between relative overflow-hidden">
                 <div className="z-10 relative">
                     <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                         <Activity className="w-4 h-4" /> Completion Velocity
                     </div>
                     <div className="flex items-baseline gap-2">
                         <span className="text-5xl font-bold text-gray-900 dark:text-white tracking-tighter">{stats.percent}%</span>
                         <span className="text-sm text-gray-500 font-medium">DONE</span>
                     </div>
                     <div className="mt-4 flex gap-4 text-xs font-medium uppercase tracking-wide">
                         <span className="text-gray-400">{stats.todo} To Do</span>
                         <span className="text-orange-500">{stats.inProgress} In Progress</span>
                     </div>
                 </div>
                 {/* Visual Ring */}
                 <div className="absolute right-8 top-1/2 -translate-y-1/2 w-32 h-32 opacity-20 dark:opacity-10 pointer-events-none">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path className="text-gray-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        <path className="text-black dark:text-white" strokeDasharray={`${stats.percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    </svg>
                 </div>
            </div>

            {/* Team */}
            <div className="bg-white dark:bg-black rounded-2xl p-6 border border-gray-200 dark:border-gray-800 flex flex-col justify-between hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-500" /> Active Team
                </div>
                <div className="flex -space-x-2 overflow-hidden py-2">
                    {stats.activeMembers.length > 0 ? stats.activeMembers.slice(0, 5).map((m, i) => (
                        <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-black bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                            {m.startsWith('AI') ? 'AI' : m.charAt(0)}
                        </div>
                    )) : <span className="text-sm text-gray-400">No assignees yet</span>}
                    {stats.activeMembers.length > 5 && (
                        <div className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-black bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-xs font-medium text-gray-500">
                            +{stats.activeMembers.length - 5}
                        </div>
                    )}
                </div>
            </div>

            {/* Blockers */}
            <div className="bg-white dark:bg-black rounded-2xl p-6 border border-gray-200 dark:border-gray-800 flex flex-col justify-between hover:border-red-200 dark:hover:border-red-900/50 transition-colors">
                <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500" /> Critical Items
                </div>
                <div>
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{stats.highPriority.length}</span>
                    <span className="text-xs text-gray-500 ml-2">High Priority</span>
                </div>
                <div className="text-xs text-orange-500 mt-2 font-medium">
                    {stats.overdue} tasks overdue
                </div>
            </div>
        </div>

        {/* Main Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Active Priorities (Board Preview) */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" /> Active Priorities
                    </h2>
                </div>
                
                {activePriorities.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activePriorities.map(task => (
                            <div 
                                key={task.id} 
                                onClick={() => onNavigate('task', task.id)}
                                className="group p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer flex flex-col justify-between h-40"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`w-2 h-2 rounded-full ${task.priority === TaskPriority.HIGH ? 'bg-red-500' : 'bg-blue-500'}`} />
                                        <div className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 font-medium uppercase">{task.status}</div>
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        {task.title}
                                    </h3>
                                </div>
                                
                                <div className="flex items-center justify-between mt-4 border-t border-gray-50 dark:border-gray-800 pt-3">
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                        {task.dueDate && <><Calendar className="w-3 h-3" /> {new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</>}
                                    </div>
                                    <div className="text-xs font-medium text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        {task.assignee || 'Unassigned'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 text-sm">
                        No active tasks. Start by adding one to the board.
                    </div>
                )}
            </div>

            {/* Recent Docs List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" /> Recent Docs
                    </h2>
                    <button onClick={() => onChangeView(ViewMode.DOCUMENTS)} className="text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors">All</button>
                </div>
                
                <div className="space-y-3">
                    {recentDocs.length > 0 ? recentDocs.map(doc => (
                        <div 
                            key={doc.id} 
                            onClick={() => onNavigate('document', doc.id)}
                            className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-900 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm transition-all cursor-pointer group"
                        >
                            <div className="mt-1 p-1.5 bg-white dark:bg-gray-800 rounded-md border border-gray-100 dark:border-gray-700 text-gray-400 group-hover:text-purple-500 transition-colors">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-400">Edited {new Date(doc.updatedAt).toLocaleDateString()}</span>
                                    {doc.tags && doc.tags.length > 0 && (
                                        <span className="text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 rounded">{doc.tags[0]}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-sm text-gray-400 italic">No documents yet.</div>
                    )}
                </div>
                
                <button 
                    onClick={() => onNavigate('document', 'new')}
                    className="w-full py-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:text-black dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500 transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                    <FileText className="w-4 h-4" /> New Page
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};
