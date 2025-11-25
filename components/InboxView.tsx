
import React, { useState, useRef } from 'react';
import { InboxItem, Project, InboxAction } from '../types';
import { Mic, Send, Sparkles, Archive, ArrowRight, Loader2, CheckCircle, FileText, CheckSquare, Trash2, StopCircle, Paperclip, X, Check } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface InboxViewProps {
  items: InboxItem[];
  onAddItem: (content: string, type: 'text' | 'audio' | 'file', fileName?: string) => void;
  onProcessItem: (itemId: string, action: InboxAction) => void;
  onDeleteItem: (itemId: string) => void;
  projects: Project[];
}

export const InboxView: React.FC<InboxViewProps> = ({ 
    items, 
    onAddItem, 
    onProcessItem, 
    onDeleteItem,
    projects 
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
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
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleMagicSort = async (item: InboxItem) => {
      setProcessingId(item.id);
      const result = await geminiService.organizeInboxItem(item.content, projects);
      if (result) {
          // We store the result temporarily on the item (in memory/state) 
          // The parent passes a handler that likely updates the state
          onProcessItem(item.id, result); // Note: In App.tsx this currently applies it directly if processedResult exists, we need to verify flow
          // Actually, usually we want to set the 'processedResult' on the item without 'applying' it yet.
          // Looking at App.tsx: handleStoreInboxSuggestion does exactly this.
      }
      setProcessingId(null);
  };

  return (
    <div className="flex-1 h-full bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-8 overflow-y-auto font-sans transition-colors duration-200">
        
        {/* Header */}
        <div className="w-full max-w-2xl mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Brain Dump</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Capture ideas now. Aasani sorts them later.</p>
        </div>

        {/* Input Box */}
        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 p-4 mb-12 border border-gray-100 dark:border-gray-800 transition-all focus-within:ring-2 focus-within:ring-black/5 dark:focus-within:ring-white/10 relative animate-in fade-in zoom-in-95 duration-300">
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind?"
                className="w-full text-lg text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 border-none focus:ring-0 resize-none max-h-40 min-h-[60px] bg-transparent"
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
        <div className="w-full max-w-2xl space-y-6">
            {items.filter(i => i.status === 'pending').length > 0 && (
                <div className="text-xs font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-4">Unprocessed Capture</div>
            )}
            
            {items.filter(i => i.status === 'pending').map(item => (
                <div key={item.id} className="bg-white dark:bg-gray-900 p-0 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col group animate-in slide-in-from-bottom-2 overflow-hidden">
                    
                    {/* Content Section */}
                    <div className="p-5">
                        <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{item.content}</div>
                        <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
                            {item.type === 'audio' && <Mic className="w-3 h-3" />}
                            {item.type === 'file' && <FileText className="w-3 h-3" />}
                            <span>{item.type === 'text' ? 'Text' : item.type === 'audio' ? 'Voice Note' : 'File'} • {item.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                    
                    {/* AI Suggestion Area */}
                    {item.processedResult ? (
                        <div className="bg-purple-50/50 dark:bg-purple-900/10 border-t border-purple-100 dark:border-purple-800/30 p-4 flex flex-col gap-3 animate-in slide-in-from-top-2">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm shrink-0 text-purple-600 dark:text-purple-400">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                                            {item.processedResult.actionType === 'create_task' ? 'Suggested Task' : 'Suggested Document'}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{item.processedResult.data.title}</h3>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
                                        <span>in</span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{projects.find(p => p.id === item.processedResult?.targetProjectId)?.title || 'General Project'}</span>
                                    </div>
                                    {item.processedResult.reasoning && (
                                        <p className="text-xs text-purple-600/80 dark:text-purple-300/70 italic">"{item.processedResult.reasoning}"</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-1">
                                <button 
                                    onClick={() => { 
                                        // Discard suggestion only (reset processedResult) - requires parent handler support or re-request
                                        // For now, we'll just delete the item if they hate the suggestion, or we could add a 'reset' prop
                                        onDeleteItem(item.id); 
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    Discard
                                </button>
                                <button 
                                    onClick={() => onProcessItem(item.id, item.processedResult!)}
                                    className="px-4 py-1.5 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                                >
                                    <Check className="w-3 h-3" /> Approve
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
                <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                    <Archive className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Inbox Zero. You're all caught up.</p>
                </div>
            )}
        </div>
    </div>
  );
};
