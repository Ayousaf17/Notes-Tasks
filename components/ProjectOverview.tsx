import React, { useMemo } from 'react';
import { Project, Task, Document, TaskStatus, TaskPriority, ViewMode } from '../types';
import { Activity, Users, Target, Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ProjectOverviewProps {
  project: Project;
  tasks: Task[];
  documents: Document[];
  onNavigate: (type: 'document' | 'task', id: string) => void;
  onChangeView: (view: ViewMode) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({ project, tasks, onNavigate, onChangeView }) => {
  
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === TaskStatus.DONE).length;
    const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const todo = tasks.filter(t => t.status === TaskStatus.TODO).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    
    const highPriority = tasks.filter(t => t.priority === TaskPriority.HIGH && t.status !== TaskStatus.DONE);
    
    return { total, done, inProgress, todo, percent, highPriority };
  }, [tasks]);

  const team = useMemo(() => {
      const members = new Set(tasks.map(t => t.assignee).filter(Boolean));
      return Array.from(members);
  }, [tasks]);

  return (
    <div className="flex-1 h-full bg-white dark:bg-black overflow-y-auto font-sans p-6 md:p-10 animate-in fade-in duration-300">
      <div className="max-w-full mx-auto space-y-12 pb-24">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    <Target className="w-4 h-4" /> Project Dashboard
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">{project.title}</h1>
            </div>
            <button onClick={() => onChangeView(ViewMode.BOARD)} className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition-opacity">
                Open Board
            </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Velocity Card */}
            <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
                 <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4 relative z-10">
                     <Activity className="w-4 h-4" /> Completion Velocity
                 </div>
                 <div className="text-6xl font-bold text-gray-900 dark:text-white relative z-10">{stats.percent}% <span className="text-lg text-gray-400 font-medium">DONE</span></div>
                 <div className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-wider relative z-10">
                     {stats.todo} TO DO <span className="mx-2 text-gray-300">|</span> <span className="text-orange-500">{stats.inProgress} IN PROGRESS</span>
                 </div>
                 {/* Circular BG decoration */}
                 <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full border-8 border-gray-200 dark:border-gray-800 opacity-20 group-hover:scale-110 transition-transform" />
            </div>

            {/* Team Card */}
            <div className="bg-white dark:bg-black rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
                 <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                     <Users className="w-4 h-4 text-blue-500" /> Active Team
                 </div>
                 <div className="flex flex-wrap gap-2">
                     {team.length > 0 ? team.map(member => (
                         <div key={member} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300">
                             {member}
                         </div>
                     )) : (
                         <div className="text-sm text-gray-400 italic">No assignees yet</div>
                     )}
                 </div>
            </div>

            {/* Critical Items Card */}
            <div className="bg-white dark:bg-black rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
                 <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                     <AlertCircle className="w-4 h-4 text-red-500" /> Critical Items
                 </div>
                 <div className="text-5xl font-bold text-gray-900 dark:text-white">{stats.highPriority.length}</div>
                 <div className="text-xs text-gray-500 mt-2 font-medium">High Priority</div>
                 {stats.highPriority.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length > 0 && (
                     <div className="mt-2 text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded inline-block">
                         {stats.highPriority.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length} tasks overdue
                     </div>
                 )}
            </div>
        </div>

        {/* Active Priorities List */}
        <div>
            <div className="flex items-center gap-2 mb-6">
                <Zap className="w-4 h-4 text-orange-500" />
                <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest">Active Priorities</h2>
            </div>
            
            {stats.highPriority.length > 0 || stats.inProgress > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...stats.highPriority, ...tasks.filter(t => t.status === TaskStatus.IN_PROGRESS && t.priority !== TaskPriority.HIGH)].slice(0, 6).map(task => (
                        <div 
                            key={task.id} 
                            onClick={() => onNavigate('task', task.id)}
                            className="group p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 rounded-xl cursor-pointer transition-all shadow-sm"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${task.priority === TaskPriority.HIGH ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                    {task.priority}
                                </div>
                                {task.status === TaskStatus.IN_PROGRESS && (
                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                )}
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-2 group-hover:underline decoration-gray-400 underline-offset-2">{task.title}</h3>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                {task.assignee && <span>{task.assignee}</span>}
                                {task.dueDate && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="w-full py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center text-center">
                    <CheckCircle className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-2" />
                    <p className="text-sm text-gray-500">No active tasks. Start by adding one to the board.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};