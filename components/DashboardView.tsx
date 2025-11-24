
import React, { useEffect, useState, useMemo } from 'react';
import { Task, Document, Project, TaskPriority, TaskStatus } from '../types';
import { geminiService } from '../services/geminiService';
import { Sparkles, Calendar, ArrowRight, Volume2, StopCircle, FileText } from 'lucide-react';

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
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  return (
    <div className="flex-1 h-full bg-white overflow-y-auto p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* Minimal Daily Pulse */}
        <div className="pt-8 pb-4">
            <div className="flex justify-between items-center mb-8">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Daily Pulse</p>
                {briefing && (
                    <button 
                        onClick={toggleSpeech}
                        className={`p-2 rounded-full transition-colors ${isSpeaking ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100'}`}
                        title={isSpeaking ? "Stop" : "Listen to Briefing"}
                    >
                        {isSpeaking ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                )}
            </div>
            
            {loadingBriefing ? (
                <div className="animate-pulse space-y-4 max-w-2xl">
                    <div className="h-8 bg-gray-50 rounded w-full"></div>
                    <div className="h-8 bg-gray-50 rounded w-3/4"></div>
                </div>
            ) : (
                <h1 className="text-3xl md:text-4xl font-serif font-normal text-gray-900 leading-snug tracking-tight max-w-4xl">
                    {briefing}
                </h1>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            
            {/* Focus List */}
            <div className="lg:col-span-2 space-y-8">
                <div className="flex items-baseline justify-between border-b border-gray-100 pb-4">
                    <h2 className="text-[10px] font-bold text-gray-900 uppercase tracking-[0.2em]">Focus</h2>
                    <span className="text-[10px] font-medium text-gray-400">{focusList.length} ITEMS</span>
                </div>

                <div className="space-y-1">
                    {focusList.length > 0 ? focusList.map(task => (
                        <div 
                            key={task.id}
                            onClick={() => onNavigate('task', task.id)}
                            className="group py-6 border-b border-gray-50 flex items-start gap-5 cursor-pointer hover:bg-gray-50/50 transition-colors -mx-4 px-4 rounded-xl"
                        >
                            <div className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${
                                task.priority === TaskPriority.HIGH ? 'bg-black' : 'bg-gray-300'
                            }`}>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl text-gray-900 group-hover:text-black transition-colors truncate font-light font-serif">
                                    {task.title}
                                </h3>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 font-medium tracking-wide">
                                    <span className="uppercase">{getProjectName(task.projectId)}</span>
                                    {task.dueDate && (
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-300 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                        </div>
                    )) : (
                        <div className="py-12 text-gray-400 font-light italic text-center">No urgent tasks assigned for today.</div>
                    )}
                </div>
            </div>

            {/* Recent & Actions */}
            <div className="space-y-12">
                <div className="space-y-6">
                    <h2 className="text-[10px] font-bold text-gray-900 uppercase tracking-[0.2em] border-b border-gray-100 pb-4">Jump Back In</h2>
                    <div className="space-y-1">
                        {recentDocs.length > 0 ? recentDocs.map((doc) => (
                            <div 
                                key={doc.id}
                                onClick={() => onNavigate('document', doc.id)}
                                className="group py-3 flex items-start gap-4 cursor-pointer hover:bg-gray-50 rounded-lg px-3 -mx-3 transition-colors"
                            >
                                <div className="mt-0.5 p-1.5 bg-gray-50 rounded text-gray-400 group-hover:text-black group-hover:bg-white border border-transparent group-hover:border-gray-200 transition-all">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 py-0.5">
                                    <h4 className="text-sm text-gray-700 group-hover:text-black transition-colors truncate font-medium">{doc.title}</h4>
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
                     <button onClick={() => {}} className="w-full text-left px-5 py-4 border border-gray-200 rounded-xl hover:border-black transition-colors text-sm font-medium text-gray-600 hover:text-black bg-white">
                        + New Project
                     </button>
                     <button onClick={onStartReview} className="w-full text-left px-5 py-4 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors text-sm font-medium flex items-center justify-between shadow-xl shadow-gray-200">
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
