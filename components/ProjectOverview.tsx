import React, { useMemo } from 'react';
import { Project, Task, Document, TaskStatus, TaskPriority, ViewMode } from '../types';
import { Activity, Users, Target, Zap, AlertCircle } from 'lucide-react';

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
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, percent };
  }, [tasks]);

  return (
    <div className="flex-1 h-full bg-white dark:bg-black overflow-y-auto font-sans p-6 md:p-10 animate-in fade-in duration-300">
      <div className="max-w-full mx-auto px-4 md:px-8 space-y-12 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    <Target className="w-4 h-4" /> Project Dashboard
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">{project.title}</h1>
            </div>
            <button onClick={() => onChangeView(ViewMode.BOARD)} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold">
                Open Board
            </button>
        </div>

        {/* Metrics - No Calendar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-2xl p-8 border border-gray-100 dark:border-gray-800">
                 <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                     <Activity className="w-4 h-4" /> Velocity
                 </div>
                 <div className="text-5xl font-bold text-gray-900 dark:text-white">{stats.percent}%</div>
            </div>
            {/* ... other dashboard cards ... */}
        </div>
      </div>
    </div>
  );
};