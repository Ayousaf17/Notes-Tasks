
import React, { useMemo } from 'react';
import { Project, Task, Document, TaskStatus, TaskPriority, ViewMode } from '../types';
import { PieChart, Clock, Calendar, FileText, CheckSquare, ArrowRight, AlertCircle, BarChart3, Activity } from 'lucide-react';

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
    
    const highPriority = tasks.filter(t => t.priority === TaskPriority.HIGH && t.status !== TaskStatus.DONE).length;
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.DONE).length;

    return { total, done, inProgress, todo, percent, highPriority, overdue };
  }, [tasks]);

  const recentDocs = useMemo(() => {
    return [...documents].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);
  }, [documents]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== TaskStatus.DONE)
      .sort((a, b) => {
         const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
         const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
         return dateA - dateB;
      })
      .slice(0, 3);
  }, [tasks]);

  return (
    <div className="flex-1 h-full bg-white dark:bg-black overflow-y-auto font-sans p-8 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto space-y-10 pb-12">
        
        {/* Header */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                <span>Project Overview</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">{project.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-lg leading-relaxed">
                {project.description || `Created on ${new Date(project.createdAt).toLocaleDateString()}`}
            </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Progress Card */}
            <div className="col-span-1 md:col-span-2 p-6 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Progress
                    </div>
                    <div className="text-5xl font-bold text-gray-900 dark:text-white tracking-tighter mt-4">{stats.percent}%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        {stats.done} / {stats.total} Tasks Completed
                    </div>
                </div>
                {/* Visual Circle */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 w-24 h-24">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path className="text-gray-200 dark:text-gray-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        <path className="text-black dark:text-white transition-all duration-1000 ease-out" strokeDasharray={`${stats.percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    </svg>
                </div>
            </div>

            {/* High Priority */}
            <div className="p-6 rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-800 hover:border-red-200 dark:hover:border-red-900/50 transition-colors">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    <AlertCircle className="w-4 h-4 text-red-500" /> High Priority
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.highPriority}</div>
                <div className="text-xs text-gray-500 mt-1">Tasks needing attention</div>
            </div>

            {/* Overdue / Due Soon */}
            <div className="p-6 rounded-2xl bg-white dark:bg-black border border-gray-200 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-900/50 transition-colors">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    <Clock className="w-4 h-4 text-orange-500" /> Overdue
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.overdue}</div>
                <div className="text-xs text-gray-500 mt-1">Missed deadlines</div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Recent Activity */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Recent Updates</h2>
                    <button onClick={() => onChangeView(ViewMode.DOCUMENTS)} className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors">View All Docs</button>
                </div>
                <div className="space-y-3">
                    {recentDocs.length > 0 ? recentDocs.map(doc => (
                        <div key={doc.id} onClick={() => onNavigate('document', doc.id)} className="group flex items-center gap-4 p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</h3>
                                <p className="text-xs text-gray-500">Edited {new Date(doc.updatedAt).toLocaleDateString()}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                    )) : (
                        <div className="text-sm text-gray-400 italic py-4">No documents yet.</div>
                    )}
                </div>
            </div>

            {/* Upcoming Tasks */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Up Next</h2>
                    <button onClick={() => onChangeView(ViewMode.BOARD)} className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors">View Board</button>
                </div>
                <div className="space-y-3">
                    {upcomingTasks.length > 0 ? upcomingTasks.map(task => (
                        <div key={task.id} onClick={() => onNavigate('task', task.id)} className="group flex items-start gap-4 p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer">
                            <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${task.priority === TaskPriority.HIGH ? 'bg-red-500' : 'bg-blue-500'}`} />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate leading-snug">{task.title}</h3>
                                <div className="flex items-center gap-3 mt-1.5">
                                    {task.dueDate && (
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(task.dueDate).toLocaleDateString()}
                                        </div>
                                    )}
                                    <div className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase">{task.status}</div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-sm text-gray-400 italic py-4">No pending tasks.</div>
                    )}
                </div>
            </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <button onClick={() => onChangeView(ViewMode.BOARD)} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group">
                     <BarChart3 className="w-6 h-6 text-gray-400 group-hover:text-purple-500 mb-3 transition-colors" />
                     <div className="text-sm font-bold text-gray-900 dark:text-white">Task Board</div>
                     <div className="text-xs text-gray-500 mt-1">Manage workflow</div>
                 </button>
                 <button onClick={() => onChangeView(ViewMode.CALENDAR)} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group">
                     <Calendar className="w-6 h-6 text-gray-400 group-hover:text-blue-500 mb-3 transition-colors" />
                     <div className="text-sm font-bold text-gray-900 dark:text-white">Calendar</div>
                     <div className="text-xs text-gray-500 mt-1">Timeline view</div>
                 </button>
                 <button onClick={() => onChangeView(ViewMode.DOCUMENTS)} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group">
                     <FileText className="w-6 h-6 text-gray-400 group-hover:text-green-500 mb-3 transition-colors" />
                     <div className="text-sm font-bold text-gray-900 dark:text-white">Documents</div>
                     <div className="text-xs text-gray-500 mt-1">Wiki & Notes</div>
                 </button>
             </div>
        </div>

      </div>
    </div>
  );
};
