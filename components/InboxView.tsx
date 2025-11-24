
import React, { useState, useRef } from 'react';
import { InboxItem, Project, InboxAction } from '../types';
import { Mic, Send, Sparkles, Archive, ArrowRight, Loader2, CheckCircle, FileText, CheckSquare, Trash2, StopCircle } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface InboxViewProps {
  items: InboxItem[];
  onAddItem: (content: string, type: 'text' | 'audio') => void;
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
  
  // Ref for audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
        // Simple mock transcription simulation for now, as real transcription requires backend
        // In a real app, send blob to Gemini API with audio capability
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

  const handleMagicSort = async (item: InboxItem) => {
      setProcessingId(item.id);
      const result = await geminiService.organizeInboxItem(item.content, projects);
      if (result) {
          onProcessItem(item.id, result);
      }
      setProcessingId(null);
  };

  return (
    <div className="flex-1 h-full bg-gray-50 flex flex-col items-center p-8 overflow-y-auto">
        
        {/* Header */}
        <div className="w-full max-w-2xl mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Brain Dump</h1>
            <p className="text-gray-500 text-sm">Capture ideas now. Aasani sorts them later.</p>
        </div>

        {/* Input Box */}
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-4 mb-12 border border-gray-100 transition-all focus-within:ring-2 focus-within:ring-black/5 relative animate-in fade-in zoom-in-95 duration-300">
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind?"
                className="w-full text-lg text-gray-800 placeholder-gray-300 border-none focus:ring-0 resize-none max-h-40 min-h-[60px] bg-transparent"
                rows={2}
            />
            <div className="flex justify-between items-center mt-2 border-t border-gray-50 pt-3">
                <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-50 text-red-500 animate-pulse' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                >
                    {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={!inputText.trim()}
                    className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    Capture
                </button>
            </div>
        </div>

        {/* Unprocessed Items */}
        <div className="w-full max-w-2xl space-y-4">
            {items.filter(i => i.status === 'pending').length > 0 && (
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Unprocessed Capture</div>
            )}
            
            {items.filter(i => i.status === 'pending').map(item => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 group animate-in slide-in-from-bottom-2">
                    <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{item.content}</div>
                    
                    {/* Action Area */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <div className="text-[10px] text-gray-400">
                            {item.type === 'audio' ? 'Voice Note' : 'Text'} • {item.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={() => onDeleteItem(item.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {item.processedResult ? (
                                // Confirmation State
                                <div className="flex items-center gap-2 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">
                                    <Sparkles className="w-3 h-3 text-purple-600" />
                                    <span className="text-xs text-purple-700 font-medium">
                                        {item.processedResult.actionType === 'create_task' ? 'Create Task' : 'Create Doc'} in "{projects.find(p => p.id === item.processedResult?.targetProjectId)?.title}"?
                                    </span>
                                    <button 
                                        onClick={() => onProcessItem(item.id, item.processedResult!)} // Apply it
                                        className="ml-1 p-1 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                                    >
                                        <CheckCircle className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                // Initial State
                                <button 
                                    onClick={() => handleMagicSort(item)}
                                    disabled={processingId === item.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-black hover:text-white text-gray-600 text-xs font-medium transition-all"
                                >
                                    {processingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    <span>Organize</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {items.filter(i => i.status === 'pending').length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Archive className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Inbox Zero. You're all caught up.</p>
                </div>
            )}
        </div>
    </div>
  );
};
