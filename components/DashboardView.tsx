import React, { useEffect, useState, useMemo } from 'react';
import { Task, Document, Project, TaskPriority, TaskStatus, Client, ViewMode } from '../types';
import { geminiService, DashboardInsight } from '../services/geminiService';
import { Calendar, Volume2, StopCircle, FileText, Plus, BarChart2, PieChart, Folder, Sparkles, BookOpen, Quote, AlertTriangle, TrendingUp, Lightbulb, ArrowRight, Users, CheckCircle, Clock, Circle } from 'lucide-react';
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
  const [insights, setInsights] = useState<DashboardInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [verseData, setVerseData] = useState<{ verse: string, reference: string, explanation: string } | null>(null);
  
  // Mascot Interactions
  const { say } = useMascot();

  useEffect(() => {
      // Welcome Message
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Good morning!" : hour < 18 ? "Good afternoon!" : "Good evening!";
      const taskCount = tasks.filter(t => t.status === TaskStatus.TODO).length;
      say(`${greeting} You have ${taskCount} tasks pending today.`, 5000, 'happy');
  }, []); // Run once on mount

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
      // Get all unique assignees from tasks + declared team members
      const allAssignees = new Set([...teamMembers, ...tasks.map(t => t.assignee).filter(Boolean) as string[]]);
      
      return Array.from(allAssignees).map(member => {
          const mTasks = tasks.filter(t => t.assignee === member);
          const total = mTasks.length;
          const done = mTasks.filter(t => t.status === TaskStatus.DONE).length;
          const inProgress = mTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
          const todo = mTasks.filter(t => t.status === TaskStatus.TODO).length;
          
          // Calculate cumulative percentages for the conic gradient
          const donePct = total > 0 ? (done / total) * 100 : 0;
          const progressPct = total > 0 ? (inProgress / total) * 100 : 0;
          
          return { 
              member, 
              total, 
              done, 
              inProgress, 
              todo,
              // Gradient stops
              stop1: donePct,
              stop2: donePct + progressPct
          };
      }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);
  }, [tasks, teamMembers]);

  // --- Effects ---

  useEffect(() => {
      if (tasks.length > 0 && insights.length === 0) {
          setLoadingInsights(true);
          geminiService.generateDashboardInsights(tasks, clients).then(res => {
              setInsights(res);
              setLoadingInsights(false);
          });

          // Generate Verse
          const context = tasks.slice(0, 5).map(t => t.title).join(', ');
          geminiService.generateVerseOfTheDay(context).then(res => {
              if (res) setVerseData(res);
          });
      }
  }, [tasks, clients]);

  // --- Action Handler ---
  const handleInsightClick = (link?: string) => {
      if (!link) return;

      if (link.startsWith('view:')) {
          const view = link.split(':')[1];
          switch (view) {
              case 'crm': onChangeView(ViewMode.CLIENTS); break;
              case 'inbox': onChangeView(ViewMode.INBOX); break;
              case 'board': onChangeView(ViewMode.GLOBAL_BOARD); break;
              case 'calendar': onChangeView(ViewMode.GLOBAL_CALENDAR); break;
              case 'settings': onChangeView(ViewMode.SETTINGS); break;
              case 'review': onStartReview(); break;
              default: onChangeView(ViewMode.HOME);
          }
          return;
      }

      if (link.startsWith('task:')) {
          const id = link.split(':')[1];
          onNavigate('task', id);
          return;
      }

      if (link.startsWith('doc:')) {
          const id = link.split(':')[1];
          onNavigate('document', id);
          return;
      }
  };

  return (
    <div className="flex-1 h-full bg-background overflow-y-auto p-4 md:p-8 font-sans animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        
        {/* Header */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">
                        Daily Pulse
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>
            
            {/* Proactive Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {loadingInsights ? (
                    <div className="col-span-3 p-8 bg-muted rounded-xl border border-border flex items-center justify-center text-muted-foreground">
                        <Sparkles className="w-5 h-5 animate-spin mr-2" /> Connecting dots...
                    </div>
                ) : insights.length > 0 ? (
                    insights.map(insight => (
                        <div key={insight.id} className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-all group flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                                {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                                {insight.type === 'opportunity' && <TrendingUp className="w-4 h-4 text-primary" />}
                                {insight.type === 'tip' && <Lightbulb className="w-4 h-4 text-accent-foreground" />}
                                <span className={`text-xs font-bold uppercase tracking-wider ${
                                    insight.type === 'warning' ? 'text-destructive' : 
                                    insight.type === 'opportunity' ? 'text-primary' : 'text-accent-foreground'
                                }`}>{insight.type}</span>
                            </div>
                            <h3 className="text-sm font-bold text-card-foreground mb-1 leading-snug">{insight.title}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{insight.message}</p>
                            {insight.actionLabel && (
                                <button 
                                    onClick={() => handleInsightClick(insight.actionLink)}
                                    className="w-full py-2 bg-muted rounded-lg text-xs font-bold text-muted-foreground hover:bg-foreground hover:text-background transition-colors flex items-center justify-center gap-2"
                                >
                                    {insight.actionLabel} <ArrowRight className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="col-span-3 p-6 bg-secondary border border-border rounded-xl text-center text-sm text-secondary-foreground">
                        All systems nominal. No urgent actions detected.
                    </div>
                )}
            </div>
        </div>

        {/* Global Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-card rounded-2xl border border-border animate-slide-up delay-100">
             <div className="space-y-1">
                 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Tasks</div>
                 <div className="text-2xl font-bold text-foreground">{globalStats.total}</div>
             </div>
             <div className="space-y-1">
                 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Done</div>
                 <div className="text-2xl font-bold text-chart-2">{globalStats.done}</div>
             </div>
             <div className="space-y-1">
                 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">In Progress</div>
                 <div className="text-2xl font-bold text-chart-4">{globalStats.inProgress}</div>
             </div>
             <div className="space-y-1">
                 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Completion</div>
                 <div className="text-2xl font-bold text-foreground">{globalStats.percent}%</div>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Project Health & Workload */}
            <div className="lg:col-span-2 space-y-8 animate-slide-up delay-200">
                
                {/* Active Projects */}
                <div>
                    <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Active Projects</h2>
                        <PieChart className="w-4 h-4 text-muted-foreground" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {projectStats.map(stat => (
                            <div key={stat.id} onClick={() => onNavigate('task', stat.id)} className="flex flex-col p-5 bg-card border border-border hover:border-foreground/20 rounded-xl cursor-pointer transition-all shadow-sm group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 bg-muted rounded-lg">
                                        <Folder className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="text-xl font-bold text-foreground">{stat.percent}%</div>
                                </div>
                                <h3 className="font-bold text-card-foreground mb-1 truncate">{stat.title}</h3>
                                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
                                    <div className="bg-primary h-full" style={{ width: `${stat.percent}%` }} />
                                </div>
                                <div className="flex justify-between mt-3 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    <span>{stat.done} Done</span>
                                    <span className="text-chart-4">{stat.inProgress} Active</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team Workload (The Summary Wheel) */}
                {memberStats.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Team Capacity</h2>
                            <Users className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {memberStats.map(stat => (
                                <div key={stat.member} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl shadow-sm">
                                    {/* The Workload Wheel */}
                                    <div 
                                        className="relative w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center shadow-inner"
                                        style={{
                                            background: `conic-gradient(
                                                var(--chart-2) 0% ${stat.stop1}%, 
                                                var(--chart-4) ${stat.stop1}% ${stat.stop2}%, 
                                                var(--muted) ${stat.stop2}% 100%
                                            )`
                                        }}
                                    >
                                        <div className="w-10 h-10 bg-card rounded-full flex items-center justify-center text-xs font-bold text-card-foreground shadow-sm border border-border">
                                            {stat.total}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-foreground mb-2">{stat.member}</div>
                                        <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full bg-chart-2" />
                                                {stat.done}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full bg-chart-4" />
                                                {stat.inProgress}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full bg-muted" />
                                                {stat.todo}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Verse & Quick Actions */}
            <div className="space-y-10 animate-slide-up delay-300">
                
                {verseData && (
                    <div className="bg-primary text-primary-foreground rounded-xl border border-border p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <BookOpen className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="bg-white/10 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded text-primary-foreground/80">Verse of the Day</span>
                            </div>
                            <blockquote className="font-serif text-lg md:text-xl italic leading-relaxed mb-4">
                                "{verseData.verse}"
                            </blockquote>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm">
                                <cite className="font-bold not-italic">— {verseData.reference} (ESV)</cite>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-1 gap-4">
                     <button 
                        onClick={onCreateProject}
                        className="p-4 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm font-bold shadow-lg"
                     >
                         <Plus className="w-4 h-4" /> Create New Project
                     </button>
                     <button 
                        onClick={onStartReview}
                        className="p-4 bg-card border border-border rounded-xl hover:border-foreground transition-colors flex items-center justify-center gap-2 text-sm font-bold text-foreground shadow-sm"
                     >
                         <Sparkles className="w-4 h-4" /> Review Inbox
                     </button>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};