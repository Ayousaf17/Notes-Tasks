
import React, { useState, useRef, useEffect } from 'react';
import { InboxItem, Project, InboxAction } from '../types';
import { Mic, Sparkles, Archive, Loader2, CheckCircle, FileText, Trash2, StopCircle, Paperclip, X, Check, ArrowRight, ChevronDown, Layers, CheckCircle2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface InboxViewProps {
  items: InboxItem[];
  onAddItem: (content: string, type: 'text' | 'audio' | 'file', fileName?: string) => void;
  onProcessItem: (itemId: string, action: InboxAction) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem?: (itemId: string, updates: Partial<InboxItem>) => void; 
  projects: Project[];
}

export const InboxView: React.FC<InboxViewProps> = ({ 
    items, 
    onAddItem, 
    onProcessItem, 
    onDeleteItem,
    onUpdateItem,
    projects 
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // State for new project creation flow inside the card
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProjectId, setCreatingProjectId] = useState<string | null>(null);

  // Ref for audio & file
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleSubmit = () => {
      if (!inputText.trim()) return;
      onAddItem(inputText, 'text');
      setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
      }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        onAddItem("🎤 Voice Note (Transcription would appear here in production...)", 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
      alert("Microphone access needed.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          onAddItem(`Attached: ${file.name}`, 'file', file.name);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleMagicSort = async (item: InboxItem) => {
      setProcessingId(item.id);
      const result = await geminiService.organizeInboxItem(item.content, projects);
      if (result && onUpdateItem) {
          onUpdateItem(item.id, { processedResult: result });
      } else if (result) {
          onProcessItem(item.id, result);
      }
      setProcessingId(null);
  };

  const handleUpdateProject = (item: InboxItem, projectId: string) => {
      if (projectId === 'NEW_PROJECT') {
          setCreatingProjectId(item.id);
          return;
      }
      if (item.processedResult && onUpdateItem) {
          onUpdateItem(item.id, {
              processedResult: {
                  ...item.processedResult,
                  targetProjectId: projectId
              }
          });
          setCreatingProjectId(null);
      }
  };

  const confirmNewProject = (item: InboxItem) => {
      if (!newProjectName.trim() || !onUpdateItem || !item.processedResult) return;
      
      onUpdateItem(item.id, {
          processedResult: {
              ...item.processedResult,
              targetProjectId: `NEW:${newProjectName}`
          }
      });
      setCreatingProjectId(null);
      setNewProjectName('');
  };

  return (
    <div className="flex-1 h-full bg-gray-50 dark:bg-black flex flex-col items-center p-4 md:p-8 overflow-y-auto font-sans transition-colors duration-200">
        
        {/* Header */}
        <div className="w-full max-w-2xl mb-8 mt-4 md:mt-0 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Brain Dump</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Capture ideas now. Aasani sorts them later.</p>
        </div>

        {/* Input Box */}
        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/50 p-4 mb-12 border border-gray-100 dark:border-gray-800 transition-all focus-within:ring-2 focus-within:ring-black/5 dark:focus-within:ring-white/10 relative animate-in fade-in zoom-in-95 duration-300">
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind? (Paste project summaries here for instant import)"
                className="w-full text-base md:text-lg text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 border-none focus:ring-0 resize-none max-h-40 min-h-[80px] bg-transparent"
                rows={2}
            />
            <div className="flex justify-between items-center mt-2 border-t border-gray-50 dark:border-gray-800 pt-3">
                <div className="flex items-center gap-1">
                    <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-50 text-red-500 animate-pulse' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        title="Record Voice Note"
                    >
                        {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Attach File"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                </div>

                <button 
                    onClick={handleSubmit}
                    disabled={!inputText.trim()}
                    className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    Capture
                </button>
            </div>
        </div>

        {/* Unprocessed Items */}
        <div className="w-full max-w-2xl space-y-6 pb-20">
            {items.filter(i => i.status === 'pending').length > 0 && (
                <div className="text-xs font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-4">Unprocessed Capture</div>
            )}
            
            {items.filter(i => i.status === 'pending').map(item => (
                <div key={item.id} className="bg-white dark:bg-gray-900 p-0 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col group animate-in slide-in-from-bottom-2 overflow-hidden transition-all duration-300">
                    
                    {/* Content Section */}
                    <div className="p-5">
                        <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-medium">{item.content}</div>
                        <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
                            {item.type === 'audio' && <Mic className="w-3 h-3" />}
                            {item.type === 'file' && <FileText className="w-3 h-3" />}
                            <span>{item.type === 'text' ? 'Text' : item.type === 'audio' ? 'Voice Note' : 'File'} • {item.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                    
                    {/* AI Suggestion Area (Draft Preview Card) */}
                    {item.processedResult ? (
                        <div className="bg-slate-900 text-white border-t border-slate-800 p-5 flex flex-col gap-4 animate-in slide-in-from-top-2 rounded-b-xl">
                            
                            {/* Special Layout for Project Creation */}
                            {item.processedResult.actionType === 'create_project' && item.processedResult.projectPlan ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-widest">
                                        <Layers className="w-4 h-4" /> New Project Detected
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{item.processedResult.projectPlan.projectTitle}</h3>
                                    
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <div className="bg-slate-800 p-2 rounded text-center">
                                            <div className="text-xs text-slate-400">Done</div>
                                            <div className="text-lg font-bold text-green-400">
                                                {item.processedResult.projectPlan.tasks.filter(t => t.status === 'Done').length}
                                            </div>
                                        </div>
                                        <div className="bg-slate-800 p-2 rounded text-center">
                                            <div className="text-xs text-slate-400">To Do</div>
                                            <div className="text-lg font-bold text-white">
                                                {item.processedResult.projectPlan.tasks.filter(t => t.status !== 'Done').length}
                                            </div>
                                        </div>
                                        <div className="bg-slate-800 p-2 rounded text-center">
                                            <div className="text-xs text-slate-400">Docs</div>
                                            <div className="text-lg font-bold text-blue-400">1</div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-xs text-slate-400 italic border-l-2 border-purple-500/50 pl-3 py-1 mt-1">
                                        "{item.processedResult.reasoning}"
                                    </div>
                                </div>
                            ) : (
                                // Standard Layout for Tasks/Docs
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-slate-800 rounded-lg shadow-sm shrink-0 text-purple-400 border border-slate-700">
                                        {item.processedResult.actionType === 'create_task' ? <CheckCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                DRAFT PREVIEW
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                                                {item.processedResult.actionType === 'create_task' ? 'New Task' : 'New Document'}
                                            </span>
                                        </div>
                                        
                                        <h3 className="text-lg font-semibold text-white mb-3 leading-tight">{item.processedResult.data.title}</h3>
                                        
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-3">
                                            <span>Will be filed in:</span>
                                            {creatingProjectId === item.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        autoFocus
                                                        type="text"
                                                        value={newProjectName}
                                                        onChange={(e) => setNewProjectName(e.target.value)}
                                                        placeholder="New Project Name"
                                                        className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                                                    />
                                                    <button onClick={() => confirmNewProject(item)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => setCreatingProjectId(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <div className="relative group/project">
                                                    <select 
                                                        value={item.processedResult.targetProjectId.startsWith('NEW:') ? 'NEW_PROJECT' : item.processedResult.targetProjectId}
                                                        onChange={(e) => handleUpdateProject(item, e.target.value)}
                                                        className="appearance-none bg-slate-800 text-white px-3 py-1 pr-7 rounded border border-slate-700 hover:border-slate-600 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 cursor-pointer font-medium transition-colors"
                                                    >
                                                        {projects.map(p => (
                                                            <option key={p.id} value={p.id}>{p.title}</option>
                                                        ))}
                                                        <option value="NEW_PROJECT">+ Create New Project</option>
                                                    </select>
                                                    <ChevronDown className="w-3 h-3 absolute right-2 top-1.5 text-slate-400 pointer-events-none" />
                                                </div>
                                            )}
                                            {item.processedResult.targetProjectId.startsWith('NEW:') && (
                                                <span className="text-purple-400 font-bold">{item.processedResult.targetProjectId.substring(4)}</span>
                                            )}
                                        </div>

                                        {item.processedResult.reasoning && (
                                            <div className="text-xs text-slate-400 italic border-l-2 border-purple-500/50 pl-3 py-1 mt-2">
                                                "{item.processedResult.reasoning}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/50">
                                <button 
                                    onClick={() => onDeleteItem(item.id)}
                                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                >
                                    Discard
                                </button>
                                <button 
                                    onClick={() => onProcessItem(item.id, item.processedResult!)}
                                    className="px-6 py-2 text-xs font-bold bg-white text-black rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-lg shadow-white/10"
                                >
                                    {item.processedResult.actionType === 'create_project' ? 'Build Project' : 'Approve'} <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex justify-end">
                             <div className="flex gap-2">
                                <button onClick={() => onDeleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleMagicSort(item)}
                                    disabled={processingId === item.id}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 text-xs font-medium transition-all shadow-sm"
                                >
                                    {processingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    <span>Organize</span>
                                </button>
                             </div>
                        </div>
                    )}
                </div>
            ))}

            {items.filter(i => i.status === 'pending').length === 0 && (
                <div className="text-center py-12 text-gray-400 dark:text-gray-600 flex flex-col items-center">
                    <CheckCircle2 className="w-16 h-16 text-gray-200 dark:text-gray-800 mb-4" />
                    <p className="text-sm font-medium">Inbox Zero. You're all caught up.</p>
                </div>
            )}
        </div>
    </div>
  );
};
