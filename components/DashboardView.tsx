import React, { useEffect, useState, useMemo } from 'react';
import { Task, Document, Project, TaskPriority, TaskStatus } from '../types';
import { geminiService } from '../services/geminiService';
import { Calendar, ArrowRight, Volume2, StopCircle, FileText, Sparkles, Plus, Users, BarChart2, PieChart, Activity, CheckCircle2 } from 'lucide-react';

interface DashboardViewProps {
  tasks: Task[];
  documents: Document[];
  projects: Project[];
  userName: string;
  onNavigate: (type: 'document' | 'task', id: string) => void;
  onStartReview: () => void;
  onCreateProject: () => void;
  teamMembers?: string[]; // New Prop
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
    tasks, 
    documents, 
    projects, 
    userName, 
    onNavigate,
    onStartReview,
    onCreateProject,
    teamMembers = ['Me']
}) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- Metrics Calculations ---

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

  const workloadStats = useMemo(() => {
    const stats: Record<string, number> = {};
    // Initialize with known members
    teamMembers.forEach(m => stats[m] = 0);
    stats['Unassigned'] = 0;
    
    tasks.forEach(t => {
        if (t.status !== TaskStatus.DONE) {
            const assignee = t.assignee || 'Unassigned';
            stats[assignee] = (stats[assignee] || 0) + 1;
        }
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]); 
  }, [tasks, teamMembers]);

  const projectStats = useMemo(() => {
      return projects.map(p => {
          const pTasks = tasks.filter(t => t.projectId === p.id);
          const total = pTasks.length;
          const done = pTasks.filter(t => t.status === TaskStatus.DONE).length;
          const percent = total === 0 ? 0 : Math.round((done / total) * 100);
          return { ...p, total, done, percent };
      }).sort((a, b) => b.percent - a.percent); // Sort by most complete
  }, [projects, tasks]);

  const globalStats = useMemo(() => {
      const total = tasks.length;
      const done = tasks.filter(t => t.status === TaskStatus.DONE).length;
      const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
      const percent = total === 0 ? 0 : Math.round((done / total) * 100);
      return { total, done, inProgress, percent };
  }, [tasks]);

  // --- Effects ---

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

  // Handle Speech
  useEffect(() => {
      const handleEnd = () => setIsSpeaking(false);
      window.speechSynthesis.addEventListener('end', handleEnd); 
      return () => {
          window.speechSynthesis.cancel();
          window.speechSynthesis.removeEventListener('end', handleEnd);
      };
  }, []);

  const toggleSpeech = () => {
      if (isSpeaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
      } else if (briefing) {
          const utterance = new SpeechSynthesisUtterance(briefing);
          utterance.rate = 1;
          utterance.pitch = 1;
          utterance.onend = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
          setIsSpeaking(true);
      }
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.title || 'Unknown Project';

  // Circular Progress Component
  const CircularProgress = ({ percent, size = 40, strokeWidth = 3, color = "text-black dark:text-white" }) => {
      const radius = (size - strokeWidth) / 2;
      const circumference = radius * 2 * Math.PI;
      const offset = circumference - (percent / 100) * circumference;

      return (
          <svg width={size} height={size} className="transform -rotate-90">
              <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  className="text-gray-100 dark:text-gray-800"
              />
              <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className={`${color} transition-all duration-1000 ease-out`}
              />
          </svg>
      );
  };

  return (
    <div className="flex-1 h-full bg-white dark:bg-black overflow-y-auto p-4 md:p-8 font-sans transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-12 pb-12">
        
        {/* Daily Pulse */}
        <div className="pt-4 md:pt-8 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Daily Pulse</p>
                {briefing && (
                    <button 
                        onClick={toggleSpeech}
                        className={`p-2 rounded-full transition-colors ${isSpeaking ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        title={isSpeaking ? "Stop" : "Listen to Briefing"}
                    >
                        {isSpeaking ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                )}
            </div>
            
            {loadingBriefing ? (
                <div className="animate-pulse space-y-4 max-w-2xl">
                    <div className="h-6 md:h-8 bg-gray-50 dark:bg-gray-800 rounded w-full"></div>
                    <div className="h-6 md:h-8 bg-gray-50 dark:bg-gray-800 rounded w-3/4"></div>
                </div>
            ) : (
                <h1 className="text-2xl md:text-4xl font-serif font-normal text-gray-900 dark:text-gray-100 leading-snug tracking-tight max-w-4xl">
                    {briefing}
                </h1>
            )}
        </div>

        {/* Project Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-slide-up delay-100">
            <div className="col-span-1 md:col-span-2 lg:col-span-1 p-5 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Global Completion</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total task velocity</p>
                </div>
                <div className="flex items-end gap-2 mt-6">
                    <span className="text-4xl font-bold text-black dark:text-white tracking-tighter">{globalStats.percent}%</span>
                    <span className="text-xs text-gray-400 mb-1.5 font-medium">DONE</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className="bg-black dark:bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${globalStats.percent}%` }}></div>
                </div>
            </div>

            {projectStats.slice(0, 3).map((p, idx) => (
                <div key={p.id} className={`p-5 rounded-2xl bg-white dark:bg-black border border-gray-100 dark:border-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition-all group cursor-pointer animate-slide-up`} style={{ animationDelay: `${(idx + 1) * 100 + 100}ms` }} onClick={() => onNavigate('document', '')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-lg shadow-sm border border-gray-100 dark:border-gray-700">
                            {p.icon || '📁'}
                        </div>
                        <CircularProgress percent={p.percent} size={32} />
                    </div>
                    <div>
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate group-hover:underline decoration-1 underline-offset-4">{p.title}</h4>
                        <div className="flex gap-3 mt-2 text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                            <span>{p.total} Tasks</span>
                            <span className="text-green-600 dark:text-green-500">{p.done} Done</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
            
            {/* Focus List */}
            <div className="lg:col-span-2 space-y-8 animate-slide-up delay-200">
                <div className="flex items-baseline justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                    <h2 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-[0.2em]">Urgent Focus</h2>
                    <span className="text-[10px] font-medium text-gray-400">items: {focusList.length}</span>
                </div>

                <div className="space-y-1">
                    {focusList.length > 0 ? focusList.map((task, idx) => (
                        <div 
                            key={task.id}
                            onClick={() => onNavigate('task', task.id)}
                            className="group py-5 md:py-6 border-b border-gray-50 dark:border-gray-800 flex items-start gap-4 md:gap-5 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors -mx-2 md:-mx-4 px-2 md:px-4 rounded-xl animate-slide-up"
                            style={{ animationDelay: `${(idx * 50) + 200}ms` }}
                        >
                            <div className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${
                                task.priority === TaskPriority.HIGH ? 'bg-red-500' : 'bg-orange-400'
                            }`}>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg md:text-xl text-gray-900 dark:text-gray-100 group-hover:text-black dark:group-hover:text-white transition-colors truncate font-light font-serif">
                                    {task.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500 font-medium tracking-wide">
                                    <span className="uppercase">{getProjectName(task.projectId)}</span>
                                    {task.dueDate && (
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                        </div>
                    )) : (
                        <div className="py-12 text-gray-400 dark:text-gray-600 font-light italic text-center">No urgent tasks assigned for today.</div>
                    )}
                </div>
            </div>

            {/* Sidebar: Actions & Insights */}
            <div className="space-y-12 animate-slide-up delay-300">
                
                {/* Team Workload */}
                <div className="space-y-6">
                    <h2 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800 pb-4 flex items-center justify-between">
                        <span>Team Workload</span>
                        <BarChart2 className="w-3.5 h-3.5 text-gray-400" />
                    </h2>
                    <div className="space-y-4">
                        {workloadStats.map(([member, count]) => (
                            <div key={member} className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                    {member.startsWith('AI_') ? 'AI' : member.charAt(0)}
                                </div>
                                <div className="flex-1 h-2 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${count > 5 ? 'bg-red-400' : count > 2 ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'}`} 
                                        style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-4 text-right">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800 pb-4">Jump Back In</h2>
                    <div className="space-y-1">
                        {recentDocs.length > 0 ? recentDocs.map((doc) => (
                            <div 
                                key={doc.id}
                                onClick={() => onNavigate('document', doc.id)}
                                className="group py-3 flex items-start gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-3 -mx-3 transition-colors"
                            >
                                <div className="mt-0.5 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-gray-400 group-hover:text-black dark:group-hover:text-white group-hover:bg-white dark:group-hover:bg-gray-700 border border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-600 transition-all">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 py-0.5">
                                    <h4 className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors truncate font-medium">{doc.title}</h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        Edited {new Date(doc.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        )) : (
                             <div className="text-xs text-gray-400 py-2">No recent documents.</div>
                        )}
                    </div>
                </div>

                <div className="space-y-3 pt-4">
                     <button 
                        onClick={onCreateProject}
                        className="w-full text-left px-5 py-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-black dark:hover:border-white transition-colors text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white bg-white dark:bg-gray-800 flex items-center gap-2 group"
                     >
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-black dark:group-hover:text-white" />
                        Create New Project
                     </button>
                     <button onClick={onStartReview} className="w-full text-left px-5 py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-between shadow-xl shadow-gray-200 dark:shadow-black/50">
                        <span>Review Inbox</span>
                        <Sparkles className="w-4 h-4" />
                     </button>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};