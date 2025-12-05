
import React, { useEffect, useState, useMemo } from 'react';
import { Task, Document, Project, TaskPriority, TaskStatus } from '../types';
import { geminiService } from '../services/geminiService';
import { Calendar, Volume2, StopCircle, FileText, Plus, BarChart2, PieChart, Folder, Sparkles, BookOpen, Quote } from 'lucide-react';

interface DashboardViewProps {
  tasks: Task[];
  documents: Document[];
  projects: Project[];
  userName: string;
  onNavigate: (type: 'document' | 'task', id: string) => void;
  onStartReview: () => void;
  onCreateProject: () => void;
  teamMembers?: string[];
}

// Simple Markdown Renderer for Dashboard Cards
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                const cleanLine = line.trim();
                if (!cleanLine) return null;
                // Bullets
                if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
                    return (
                        <div key={i} className="flex items-start gap-2 pl-1">
                            <div className="w-1.5 h-1.5 mt-2 rounded-full bg-gray-400 dark:bg-gray-600 shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {cleanLine.substring(2).replace(/\*\*(.*?)\*\*/g, (_, bold) => `<strong>${bold}</strong>`).split(/<strong>(.*?)<\/strong>/g).map((part, j) => 
                                    j % 2 === 1 ? <strong key={j} className="font-semibold text-gray-900 dark:text-white">{part}</strong> : part
                                )}
                            </span>
                        </div>
                    );
                }
                // Headers
                if (cleanLine.startsWith('#')) {
                    return <div key={i} className="font-bold text-gray-900 dark:text-white mt-3 mb-1">{cleanLine.replace(/#/g, '').trim()}</div>
                }
                // Normal Text
                return <div key={i} className="text-sm text-gray-600 dark:text-gray-400">{cleanLine}</div>
            })}
        </div>
    );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ 
    tasks = [], 
    documents = [], 
    projects = [], 
    userName, 
    onNavigate,
    onStartReview,
    onCreateProject,
    teamMembers = ['Me']
}) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [verseData, setVerseData] = useState<{ verse: string, reference: string, explanation: string } | null>(null);
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
      }).slice(0, 5);
  }, [todaysTasks, highPriorityTasks]);

  const recentDocs = useMemo(() => {
      return [...documents].sort((a, b) => {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }).slice(0, 4);
  }, [documents]);

  const workloadStats = useMemo(() => {
    const stats: Record<string, number> = {};
    if (teamMembers) {
        teamMembers.forEach(m => stats[m] = 0);
    }
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
          const inProgress = pTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
          const todo = pTasks.filter(t => t.status === TaskStatus.TODO).length;
          const percent = total === 0 ? 0 : Math.round((done / total) * 100);
          return { ...p, total, done, inProgress, todo, percent };
      }).sort((a, b) => b.percent - a.percent); 
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
          
          // Generate Briefing
          geminiService.generateDailyBriefing(userName, context).then(res => {
              setBriefing(res);
              setLoadingBriefing(false);
          });

          // Generate Verse
          geminiService.generateVerseOfTheDay(context).then(res => {
              if (res) setVerseData(res);
          });

      } else if (focusList.length === 0 && !briefing) {
           setBriefing(`Good morning. You have a clear schedule today.`);
           // Generic fallback for empty state
           setVerseData({
               verse: "Commit your work to the Lord, and your plans will be established.",
               reference: "Proverbs 16:3",
               explanation: "A foundational reminder as you prepare for new work."
           });
      }
  }, [focusList, userName, briefing]);

  useEffect(() => {
      return () => {
          if (typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel();
          }
      };
  }, []);

  const toggleSpeech = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

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

  return (
    <div className="flex-1 h-full bg-white dark:bg-black overflow-y-auto p-4 md:p-8 font-sans animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        
        {/* Header & Briefing */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
                        Daily Pulse
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <button onClick={toggleSpeech} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 bg-gray-50 dark:bg-gray-800 rounded-full">
                    {isSpeaking ? <StopCircle className="w-5 h-5 animate-pulse text-red-500" /> : <Volume2 className="w-5 h-5" />}
                </button>
            </div>
            
            {/* Executive Summary Card */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-black dark:bg-white" />
                {loadingBriefing ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse">
                        <Sparkles className="w-4 h-4" /> Generating executive summary...
                    </div>
                ) : (
                    <SimpleMarkdown text={briefing || "Welcome back to your workspace."} />
                )}
            </div>
        </div>

        {/* Global Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 animate-slide-up delay-100">
             <div className="space-y-1">
                 <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Tasks</div>
                 <div className="text-2xl font-bold text-gray-900 dark:text-white">{globalStats.total}</div>
             </div>
             <div className="space-y-1">
                 <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Done</div>
                 <div className="text-2xl font-bold text-green-600 dark:text-green-400">{globalStats.done}</div>
             </div>
             <div className="space-y-1">
                 <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">In Progress</div>
                 <div className="text-2xl font-bold text-orange-500">{globalStats.inProgress}</div>
             </div>
             <div className="space-y-1">
                 <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Completion</div>
                 <div className="text-2xl font-bold text-gray-900 dark:text-white">{globalStats.percent}%</div>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Focus List & Verse */}
            <div className="lg:col-span-2 space-y-8 animate-slide-up delay-200">
                {/* Focus List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Focus Items</h2>
                        <span className="text-xs text-gray-400">top {focusList.length}</span>
                    </div>
                    
                    <div className="space-y-2">
                        {focusList.length > 0 ? focusList.map(task => (
                            <div 
                                key={task.id} 
                                onClick={() => onNavigate('task', task.id)}
                                className="group flex items-center p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md"
                            >
                                <div className={`w-3 h-3 rounded-full mr-4 shrink-0 ${task.priority === TaskPriority.HIGH ? 'bg-red-500' : 'bg-blue-500'}`} />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</h3>
                                    {task.dueDate && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(task.dueDate).toLocaleDateString()}</p>}
                                </div>
                                <div className="text-xs font-medium text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors uppercase tracking-wider">
                                    {task.status}
                                </div>
                            </div>
                        )) : (
                            <div className="py-8 text-center text-gray-400 text-sm italic border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                                No urgent tasks assigned for today.
                            </div>
                        )}
                    </div>
                </div>

                {/* Verse of the Day (Context Aware) */}
                {verseData && (
                    <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <BookOpen className="w-24 h-24 text-gray-900 dark:text-white" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="bg-gray-100 dark:bg-gray-800 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded text-gray-500">Verse of the Day</span>
                            </div>
                            <blockquote className="font-serif text-xl md:text-2xl text-gray-800 dark:text-gray-100 italic leading-relaxed mb-4">
                                "{verseData.verse}"
                            </blockquote>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
                                <cite className="font-bold text-gray-900 dark:text-white not-italic">— {verseData.reference} (ESV)</cite>
                                <span className="hidden md:inline text-gray-300 dark:text-gray-700">|</span>
                                <span className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">{verseData.explanation}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column */}
            <div className="space-y-10 animate-slide-up delay-300">
                
                {/* Team Workload */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Team Workload</h2>
                        <BarChart2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="space-y-4">
                        {workloadStats.map(([member, count]) => (
                            <div key={member} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                    {member.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-black dark:bg-white rounded-full transition-all duration-1000" 
                                            style={{ width: `${(count / (tasks.length || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-gray-900 dark:text-white w-4 text-right">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Project Health Cards */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Project Health</h2>
                        <PieChart className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="space-y-3">
                        {projectStats.map(stat => (
                            <div key={stat.id} onClick={() => onNavigate('task', stat.id)} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <Folder className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{stat.title}</div>
                                        <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                                            {stat.total} TASKS • <span className="text-green-600 dark:text-green-400">{stat.done} DONE</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Circular Progress */}
                                <div className="relative w-10 h-10 flex items-center justify-center">
                                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                        <path className="text-gray-200 dark:text-gray-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                        <path className="text-black dark:text-white transition-all duration-1000 ease-out" strokeDasharray={`${stat.percent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Jump Back In */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Jump Back In</h2>
                    </div>
                    <div className="space-y-2">
                        {recentDocs.length > 0 ? recentDocs.map(doc => (
                            <button 
                                key={doc.id}
                                onClick={() => onNavigate('document', doc.id)}
                                className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors group text-left"
                            >
                                <div className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded group-hover:text-black dark:group-hover:text-white transition-colors">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{doc.title || 'Untitled'}</div>
                                    <div className="text-[10px] text-gray-400">Edited {new Date(doc.updatedAt).toLocaleDateString()}</div>
                                </div>
                            </button>
                        )) : (
                            <div className="text-sm text-gray-400 italic">No recent documents.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
             <button 
                onClick={onCreateProject}
                className="p-4 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm font-bold shadow-lg"
             >
                 <Plus className="w-4 h-4" /> Create New Project
             </button>
             <button 
                onClick={onStartReview}
                className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-black dark:hover:border-white transition-colors flex items-center justify-center gap-2 text-sm font-bold text-gray-900 dark:text-white shadow-sm"
             >
                 <Sparkles className="w-4 h-4" /> Review Inbox
             </button>
        </div>

      </div>
    </div>
  );
};
