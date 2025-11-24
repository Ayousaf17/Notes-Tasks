
import React, { useEffect, useState, useMemo } from 'react';
import { Task, Document, Project, TaskPriority, TaskStatus } from '../types';
import { geminiService } from '../services/geminiService';
import { Sparkles, Calendar, CheckCircle, Clock, FileText, ArrowRight, Sun, Layout, AlertCircle } from 'lucide-react';

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

  // --- Aggregate Data ---

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

  // Combine for focus list (unique)
  const focusList = useMemo(() => {
      const combined = [...todaysTasks];
      highPriorityTasks.forEach(t => {
          if (!combined.find(c => c.id === t.id)) combined.push(t);
      });
      return combined.sort((a, b) => {
           // Sort by Due Date (Asc), then Priority
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

  // --- Effects ---

  useEffect(() => {
      // Generate briefing on mount if we have data
      if (focusList.length > 0 && !briefing) {
          setLoadingBriefing(true);
          const context = focusList.map(t => `- Task: ${t.title} (Due: ${t.dueDate ? new Date(t.dueDate).toDateString() : 'No Date'}, Priority: ${t.priority})`).join('\n');
          
          geminiService.generateDailyBriefing(userName, context).then(res => {
              setBriefing(res);
              setLoadingBriefing(false);
          });
      } else if (focusList.length === 0 && !briefing) {
           setBriefing(`Good morning, ${userName}. Your schedule is clear today. It's a great time to focus on deep work or planning.`);
      }
  }, [focusList, userName]); // Run once mostly

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.title || 'Unknown Project';

  return (
    <div className="flex-1 h-full bg-slate-50 overflow-y-auto p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-black text-white shadow-xl p-6 md:p-8">
            <div className="relative z-10">
                <div className="flex items-center gap-2 text-gray-400 mb-4 text-xs font-bold uppercase tracking-wider">
                    <Sun className="w-4 h-4" />
                    <span>Daily Pulse</span>
                </div>
                {loadingBriefing ? (
                    <div className="animate-pulse space-y-3 max-w-2xl">
                        <div className="h-4 bg-white/20 rounded w-1/3"></div>
                        <div className="h-6 bg-white/20 rounded w-3/4"></div>
                    </div>
                ) : (
                    <div className="max-w-3xl">
                        <h1 className="text-xl md:text-2xl font-light leading-relaxed font-serif text-white">
                            "{briefing}"
                        </h1>
                    </div>
                )}
            </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Focus List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-gray-400" />
                        My Focus
                    </h2>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border shadow-sm">
                        {focusList.length} Items Pending
                    </span>
                </div>

                <div className="space-y-3">
                    {focusList.length > 0 ? focusList.map(task => (
                        <div 
                            key={task.id}
                            onClick={() => onNavigate('task', task.id)}
                            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-start gap-4"
                        >
                            <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                task.priority === TaskPriority.HIGH ? 'border-red-100 bg-red-50 text-red-600' : 'border-gray-200 bg-gray-50 text-gray-400'
                            }`}>
                                {task.priority === TaskPriority.HIGH && <AlertCircle className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                                    {task.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                        {getProjectName(task.projectId)}
                                    </span>
                                    {task.dueDate && (
                                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                <ArrowRight className="w-4 h-4 text-gray-300" />
                            </div>
                        </div>
                    )) : (
                        <div className="bg-white p-8 rounded-xl border border-gray-100 border-dashed text-center text-gray-400">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-400 opacity-50" />
                            <p>No urgent tasks. You're all caught up!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Col: Jump Back In */}
            <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    Jump Back In
                </h2>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {recentDocs.length > 0 ? recentDocs.map((doc, i) => (
                        <div 
                            key={doc.id}
                            onClick={() => onNavigate('document', doc.id)}
                            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors group ${i !== recentDocs.length - 1 ? 'border-b border-gray-50' : ''}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600">{doc.title}</h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        Edited {new Date(doc.updatedAt).toLocaleDateString()} • {getProjectName(doc.projectId)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )) : (
                         <div className="p-6 text-center text-xs text-gray-400">No recent documents.</div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                    <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wide mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                         <button onClick={() => {}} className="w-full text-left px-3 py-2 bg-white rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors shadow-sm">
                            + New Project
                         </button>
                         <button onClick={onStartReview} className="w-full text-left px-3 py-2 bg-white rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors shadow-sm flex items-center justify-between group">
                            <span>+ Review Inbox</span>
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-200" />
                         </button>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
