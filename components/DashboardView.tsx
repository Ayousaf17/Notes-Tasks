
import React, { useEffect, useState, useMemo } from 'react';
import { Task, Document, Project, TaskPriority, TaskStatus } from '../types';
import { geminiService } from '../services/geminiService';
import { Sparkles, Calendar, ArrowRight, Clock, FileText, CheckCircle } from 'lucide-react';

interface DashboardViewProps {
  tasks: Task[];
  documents: Document[];
  projects: Project[];
  userName: string;
  onNavigate: (type: 'document' | 'task', id: string) => void;
  onStartReview: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
    tasks, 
    documents, 
    projects, 
    userName, 
    onNavigate,
    onStartReview
}) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  const todaysTasks = useMemo(() => {
      const today = new Date();
      return tasks.filter(t => {
          if (t.status === TaskStatus.DONE) return false;
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          return d.getDate() === today.getDate() && 
                 d.getMonth() === today.getMonth() && 
                 d.getFullYear() === today.getFullYear();
      });
  }, [tasks]);

  const highPriorityTasks = useMemo(() => {
      return tasks.filter(t => t.priority === TaskPriority.HIGH && t.status !== TaskStatus.DONE);
  }, [tasks]);

  const focusList = useMemo(() => {
      const combined = [...todaysTasks];
      highPriorityTasks.forEach(t => {
          if (!combined.find(c => c.id === t.id)) combined.push(t);
      });
      return combined.sort((a, b) => {
           const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
           const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
           return dateA - dateB;
      });
  }, [todaysTasks, highPriorityTasks]);

  const recentDocs = useMemo(() => {
      return [...documents].sort((a, b) => {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }).slice(0, 4);
  }, [documents]);

  useEffect(() => {
      if (focusList.length > 0 && !briefing) {
          setLoadingBriefing(true);
          const context = focusList.map(t => `- Task: ${t.title} (Due: ${t.dueDate ? new Date(t.dueDate).toDateString() : 'No Date'}, Priority: ${t.priority})`).join('\n');
          geminiService.generateDailyBriefing(userName, context).then(res => {
              setBriefing(res);
              setLoadingBriefing(false);
          });
      } else if (focusList.length === 0 && !briefing) {
           setBriefing(`Good morning. You have a clear schedule today.`);
      }
  }, [focusList, userName]);

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.title || 'Unknown Project';

  return (
    <div className="flex-1 h-full bg-white overflow-y-auto p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Minimal Daily Pulse */}
        <div className="py-8">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">Daily Pulse</p>
            {loadingBriefing ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-100 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-100 rounded w-3/4"></div>
                </div>
            ) : (
                <h1 className="text-4xl md:text-5xl font-light text-gray-900 leading-tight tracking-tight">
                    {briefing}
                </h1>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Focus List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-baseline justify-between border-b border-gray-100 pb-2">
                    <h2 className="text-lg font-medium text-gray-900">Focus</h2>
                    <span className="text-xs text-gray-400">{focusList.length} items</span>
                </div>

                <div className="space-y-0">
                    {focusList.length > 0 ? focusList.map(task => (
                        <div 
                            key={task.id}
                            onClick={() => onNavigate('task', task.id)}
                            className="group py-4 border-b border-gray-50 flex items-start gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                        >
                            <div className={`mt-1 w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                                task.priority === TaskPriority.HIGH ? 'border-gray-900' : 'border-gray-300'
                            }`}>
                                {task.priority === TaskPriority.HIGH && <div className="w-2 h-2 bg-black rounded-[1px]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base text-gray-900 group-hover:text-black transition-colors truncate font-light">
                                    {task.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                    <span>{getProjectName(task.projectId)}</span>
                                    {task.dueDate && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )) : (
                        <div className="py-8 text-gray-400 font-light">No urgent tasks.</div>
                    )}
                </div>
            </div>

            {/* Recent & Actions */}
            <div className="space-y-10">
                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">Jump Back In</h2>
                    <div className="space-y-0">
                        {recentDocs.length > 0 ? recentDocs.map((doc) => (
                            <div 
                                key={doc.id}
                                onClick={() => onNavigate('document', doc.id)}
                                className="group py-3 flex items-start gap-3 cursor-pointer"
                            >
                                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div className="min-w-0">
                                    <h4 className="text-sm text-gray-600 group-hover:text-black transition-colors truncate">{doc.title}</h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {new Date(doc.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        )) : (
                             <div className="text-xs text-gray-400 py-2">No recent documents.</div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                     <button onClick={() => {}} className="w-full text-left px-4 py-3 border border-gray-200 rounded hover:border-black transition-colors text-sm font-medium text-gray-600 hover:text-black">
                        New Project
                     </button>
                     <button onClick={onStartReview} className="w-full text-left px-4 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm font-medium flex items-center justify-between">
                        <span>Review Inbox</span>
                        <Sparkles className="w-3.5 h-3.5" />
                     </button>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
