
import React, { useEffect, useState, useMemo } from 'react';
import { Task, Document, Project, TaskPriority, TaskStatus, Client, ViewMode } from '../types';
import { geminiService, DailyBriefing } from '../services/geminiService';
import { Calendar, Volume2, StopCircle, FileText, Plus, BarChart2, PieChart, Folder, Sparkles, BookOpen, Quote, AlertTriangle, TrendingUp, Lightbulb, ArrowRight, Users, CheckCircle, Clock, Circle, Target, Zap, Coffee } from 'lucide-react';
import { useMascot } from '../contexts/MascotContext';

interface DashboardViewProps {
  tasks: Task[];
  documents: Document[];
  projects: Project[];
  userName: string;
  onNavigate: (type: 'document' | 'task', id: string) => void;
  onChangeView: (view: ViewMode) => void;
  onStartReview: () => void;
  onCreateProject: () => void;
  teamMembers?: string[];
  clients?: Client[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
    tasks = [], 
    documents = [], 
    projects = [], 
    userName, 
    onNavigate,
    onChangeView,
    onStartReview,
    onCreateProject,
    teamMembers = ['Me'],
    clients = []
}) => {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [verseData, setVerseData] = useState<{ verse: string, reference: string, explanation: string } | null>(null);
  
  // Mascot Interactions
  const { say } = useMascot();

  // --- Metrics Calculations ---

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

  const memberStats = useMemo(() => {
      const allAssignees = new Set([...teamMembers, ...tasks.map(t => t.assignee).filter(Boolean) as string[]]);
      
      return Array.from(allAssignees).map(member => {
          const mTasks = tasks.filter(t => t.assignee === member);
          const total = mTasks.length;
          const done = mTasks.filter(t => t.status === TaskStatus.DONE).length;
          const inProgress = mTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
          const todo = mTasks.filter(t => t.status === TaskStatus.TODO).length;
          
          const donePct = total > 0 ? (done / total) * 100 : 0;
          const progressPct = total > 0 ? (inProgress / total) * 100 : 0;
          
          return { 
              member, 
              total, 
              done, 
              inProgress, 
              todo,
              stop1: donePct,
              stop2: donePct + progressPct
          };
      }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);
  }, [tasks, teamMembers]);

  // --- Effects ---

  useEffect(() => {
      if (tasks.length > 0 && !briefing) {
          setLoadingBriefing(true);
          geminiService.generateDailyBriefing(tasks, projects).then(res => {
              setBriefing(res);
              setLoadingBriefing(false);
              
              // Mascot speaks the narrative summary
              if (res?.narrative) {
                  say(res.narrative, 6000, 'writing');
              }
          });

          // Generate Verse
          const context = tasks.slice(0, 5).map(t => t.title).join(', ');
          geminiService.generateVerseOfTheDay(context).then(res => {
              if (res) setVerseData(res);
          });
      }
  }, [tasks, projects]);

  return (
    <div className="flex-1 h-full bg-transparent overflow-y-auto p-4 md:p-8 font-sans animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        
        {/* RE-ENVISIONED: Morning Briefing Header */}
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground tracking-tight">
                        Morning Briefing
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                {briefing?.vibe && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
                        {briefing.vibe === 'Deep Work' && <Zap className="w-4 h-4 text-purple-500" />}
                        {briefing.vibe === 'Meeting Heavy' && <Users className="w-4 h-4 text-orange-500" />}
                        {briefing.vibe === 'Admin & Cleanup' && <Coffee className="w-4 h-4 text-gray-500" />}
                        {briefing.vibe === 'Light' && <Sparkles className="w-4 h-4 text-green-500" />}
                        <span className="text-xs font-bold text-foreground uppercase tracking-wide">{briefing.vibe} Mode</span>
                    </div>
                )}
            </div>
            
            {/* The "Narrative" Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Narrative Text */}
                <div className="lg:col-span-2 bg-gradient-to-br from-card to-secondary rounded-2xl p-6 md:p-8 border border-border shadow-sm flex flex-col justify-center">
                    {loadingBriefing ? (
                        <div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="w-4 h-4 animate-spin"/> Preparing your briefing...</div>
                    ) : (
                        <>
                            <div className="font-serif text-xl md:text-2xl text-foreground leading-relaxed italic mb-4">
                                "{briefing?.narrative || "Ready to tackle the day."}"
                            </div>
                            <div className="flex gap-4 mt-auto pt-4">
                                <button onClick={onStartReview} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                                    <Sparkles className="w-3 h-3" /> Start Inbox Review
                                </button>
                                <button onClick={() => onChangeView(ViewMode.GLOBAL_BOARD)} className="text-xs font-bold text-muted-foreground flex items-center gap-1 hover:text-foreground hover:underline">
                                    <ArrowRight className="w-3 h-3" /> View All Tasks
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Keystone Task Focus */}
                <div className="bg-primary text-primary-foreground rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                        <Target className="w-24 h-24" />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">Keystone Focus</div>
                        {loadingBriefing ? (
                            <div className="h-6 w-24 bg-white/20 animate-pulse rounded" />
                        ) : briefing?.focusTask ? (
                            <>
                                <div className="text-lg font-bold leading-snug mb-2 line-clamp-3">
                                    {briefing.focusTask.title}
                                </div>
                                <div className="text-xs opacity-80 line-clamp-2">
                                    {briefing.focusTask.reason}
                                </div>
                            </>
                        ) : (
                            <div className="text-lg font-bold">Clear schedule.</div>
                        )}
                    </div>

                    <div className="relative z-10 mt-4">
                        {briefing?.focusTask ? (
                            <button 
                                onClick={() => onNavigate('task', briefing.focusTask!.id)}
                                className="w-full py-2 bg-background text-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
                            >
                                Execute Now
                            </button>
                        ) : (
                            <button onClick={onCreateProject} className="w-full py-2 bg-white/20 rounded-lg text-xs font-bold hover:bg-white/30">Plan Project</button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Global Stats Bar (Simplified) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="p-4 bg-card rounded-xl border border-border">
                 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tasks</div>
                 <div className="text-xl font-bold text-foreground">{globalStats.total}</div>
             </div>
             <div className="p-4 bg-card rounded-xl border border-border">
                 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Completed</div>
                 <div className="text-xl font-bold text-green-600 dark:text-green-400">{globalStats.done}</div>
             </div>
             <div className="p-4 bg-card rounded-xl border border-border">
                 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">In Progress</div>
                 <div className="text-xl font-bold text-orange-500">{globalStats.inProgress}</div>
             </div>
             <div className="p-4 bg-card rounded-xl border border-border">
                 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Completion</div>
                 <div className="text-xl font-bold text-foreground">{globalStats.percent}%</div>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Active Projects List */}
            <div className="lg:col-span-2 space-y-6 animate-slide-up delay-200">
                <div className="flex items-center justify-between border-b border-border pb-2">
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Active Projects</h2>
                    <Folder className="w-4 h-4 text-muted-foreground" />
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                    {projectStats.map(stat => (
                        <div key={stat.id} onClick={() => onNavigate('task', stat.id)} className="flex items-center justify-between p-4 bg-card border border-border hover:border-foreground/30 rounded-xl cursor-pointer transition-all shadow-sm group">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-muted rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <PieChart className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-card-foreground text-sm">{stat.title}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div className="bg-primary h-full" style={{ width: `${stat.percent}%` }} />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-medium">{stat.percent}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-foreground">{stat.todo}</div>
                                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Left</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Verse & Inspiration */}
            <div className="space-y-6 animate-slide-up delay-300">
                
                {verseData && (
                    <div className="bg-card rounded-xl border border-border p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <BookOpen className="w-24 h-24 text-foreground" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="bg-secondary text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded text-muted-foreground">Verse of the Day</span>
                            </div>
                            <blockquote className="font-serif text-lg text-foreground italic leading-relaxed mb-4">
                                "{verseData.verse}"
                            </blockquote>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
                                <cite className="font-bold text-muted-foreground not-italic">— {verseData.reference} (ESV)</cite>
                            </div>
                        </div>
                    </div>
                )}

                {/* Team Workload Mini */}
                {memberStats.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">Team Load</h3>
                            <Users className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <div className="space-y-3">
                            {memberStats.slice(0, 3).map(stat => (
                                <div key={stat.member} className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-foreground">{stat.member}</span>
                                    <span className="text-muted-foreground">{stat.todo} Tasks</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};
