import React, { useEffect, useState, useMemo } from 'react';
import { Task, Document, Project, TaskPriority, TaskStatus } from '../types';
import { geminiService } from '../services/geminiService';
import { Sparkles, Calendar, ArrowRight, Clock, FileText, CheckCircle, Volume2, StopCircle } from 'lucide-react';

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
      window.speechSynthesis.addEventListener('end', handleEnd); // Some browsers trigger on utterance
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
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Minimal Daily Pulse */}
        <div className="py-12">
            <div className="flex justify-between items-center mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">Daily Pulse</p>
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
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-50 rounded w-1/2"></div>
                    <div className="h-6 bg-gray-50 rounded w-3/4"></div>
                </div>
            ) : (
                <h1 className="text-3xl md:text-4xl font-serif font-normal text-gray-800 leading-snug tracking-wide">
                    {briefing}
                </h1>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Focus List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-baseline justify-between border-b border-gray-100 pb-2">
                    <h2 className="text-sm font-medium text-gray-900 uppercase tracking-widest">Focus</h2>
                    <span className="text-xs text-gray-400">{focusList.length} items</span>
                </div>

                <div className="space-y-0">
                    {focusList.length > 0 ? focusList.map(task => (
                        <div 
                            key={task.id}
                            onClick={() => onNavigate('task', task.id)}
                            className="group py-5 border-b border-gray-50 flex items-start gap-4 cursor-pointer hover:bg-gray-50/30 transition-colors"
                        >
                            <div className={`mt-1.5 w-3 h-3 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                task.priority === TaskPriority.HIGH ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
                            }`}>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg text-gray-800 group-hover:text-black transition-colors truncate font-light">
                                    {task.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                                    <span className="font-medium tracking-wide">{getProjectName(task.projectId)}</span>
                                    {task.dueDate && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )) : (
                        <div className="py-8 text-gray-400 font-light italic">No urgent tasks assigned for today.</div>
                    )}
                </div>
            </div>

            {/* Recent & Actions */}
            <div className="space-y-12">
                <div className="space-y-4">
                    <h2 className="text-sm font-medium text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">Jump Back In</h2>
                    <div className="space-y-2">
                        {recentDocs.length > 0 ? recentDocs.map((doc) => (
                            <div 
                                key={doc.id}
                                onClick={() => onNavigate('document', doc.id)}
                                className="group py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                            >
                                <FileText className="w-4 h-4 text-gray-300 mt-0.5" />
                                <div className="min-w-0">
                                    <h4 className="text-sm text-gray-600 group-hover:text-black transition-colors truncate font-medium">{doc.title}</h4>
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

                <div className="space-y-3">
                     <button onClick={() => {}} className="w-full text-left px-5 py-3 border border-gray-200 rounded-lg hover:border-black transition-colors text-sm font-medium text-gray-600 hover:text-black bg-white">
                        + New Project
                     </button>
                     <button onClick={onStartReview} className="w-full text-left px-5 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium flex items-center justify-between shadow-lg shadow-gray-200">
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