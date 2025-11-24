import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Attachment, ProjectPlan } from '../types';
import { Send, X, Bot, Paperclip, Mic, Loader2, FileText, Sparkles, Music } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: string;
  onProjectPlanCreated: (plan: ProjectPlan) => void;
}

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ isOpen, onClose, contextData, onProjectPlanCreated }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'I can help you create project plans from files, summarize meetings, or organize your tasks.', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalysingPlan, setIsAnalysingPlan] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, attachments]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        const newAttachment: Attachment = {
          mimeType: file.type,
          data: base64String,
          name: file.name
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Webm is standard for MediaRecorder
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
           const newAttachment: Attachment = {
              mimeType: 'audio/webm', // Gemini supports audio/webm
              data: base64String,
              name: 'Voice Note'
           };
           setAttachments(prev => [...prev, newAttachment]);
        };
        // Stop tracks to release mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone access required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    const currentAttachments = [...attachments];
    const currentInput = input;

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: currentInput,
        timestamp: new Date(),
        attachments: currentAttachments
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setLoading(true);

    // Heuristic: Trigger structured generation for plans, projects, meetings, or task extraction
    const lowerInput = currentInput.toLowerCase();
    const isStructuredRequest = 
        lowerInput.includes('plan') || 
        lowerInput.includes('project') || 
        lowerInput.includes('meeting') || 
        lowerInput.includes('summary') ||
        lowerInput.includes('tasks');

    if (isStructuredRequest && (currentAttachments.length > 0 || currentInput.length > 15)) {
        setIsAnalysingPlan(true);
        // Special Mode: Generate Project Plan / Meeting Summary
        const plan = await geminiService.generateProjectPlan(currentInput || "Analyze this content and extract tasks", currentAttachments);
        
        if (plan) {
            onProjectPlanCreated(plan);
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: `I've processed that into a new page "${plan.projectTitle}" and added ${plan.tasks.length} actionable tasks to your board.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } else {
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "I analyzed the content but couldn't generate a structured plan. I'll continue in standard chat mode.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        }
        setIsAnalysingPlan(false);
    } else {
        // Standard Chat
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));
        
        // Inject context if available
        const prompt = contextData && messages.length < 3
            ? `Context from current view: ${contextData}\n\nUser: ${currentInput}` 
            : currentInput;

        const responseText = await geminiService.chat(history, prompt, currentAttachments);

        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMsg]);
    }
    
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 bg-white border-l border-gray-100 flex flex-col shadow-2xl shadow-gray-200/50 absolute right-0 top-0 bottom-0 z-50 transition-transform">
      {/* Header */}
      <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
          <span className="font-medium text-gray-900 text-sm tracking-tight">Assistant</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-white">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
             <div className={`max-w-[90%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {/* Attachments Bubble */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2 justify-end">
                        {msg.attachments.map((att, i) => (
                            <div key={i} className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                                {att.mimeType.startsWith('audio/') ? <Music className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                <span className="truncate max-w-[100px]">{att.name || 'File'}</span>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Text Bubble */}
                <div className={`inline-block px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-gray-100 text-gray-900 rounded-br-none' 
                    : 'text-gray-600 bg-white border border-gray-100 rounded-bl-none'
                }`}>
                    {msg.text}
                </div>
                <div className="text-[10px] text-gray-300 mt-1 px-1">
                    {msg.role === 'user' ? 'You' : 'Nexus AI'}
                </div>
            </div>
          </div>
        ))}
        
        {loading && (
            <div className="flex items-center space-x-2 text-xs text-gray-400 px-4">
                {isAnalysingPlan ? (
                   <>
                     <Sparkles className="w-3 h-3 animate-spin text-purple-500" />
                     <span className="text-purple-500 font-medium">Analyzing content & extracting tasks...</span>
                   </>
                ) : (
                   <>
                     <Bot className="w-3 h-3" />
                     <span>Thinking...</span>
                   </>
                )}
            </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-50">
        
        {/* Attachment Preview */}
        {attachments.length > 0 && (
            <div className="flex space-x-2 mb-3 overflow-x-auto">
                {attachments.map((att, idx) => (
                    <div key={idx} className="relative group flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                        {att.mimeType.startsWith('audio/') ? <Music className="w-4 h-4 text-gray-500" /> : <FileText className="w-4 h-4 text-gray-500" />}
                        <span className="text-xs text-gray-600 truncate max-w-[120px]">{att.name || 'Attachment'}</span>
                        <button 
                            onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                            className="ml-2 text-gray-400 hover:text-red-500"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        )}

        <div className="relative flex items-end gap-2 bg-gray-50 rounded-xl p-2 border border-transparent focus-within:border-gray-200 focus-within:bg-white transition-all">
            {/* Upload Button */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                title="Upload File"
            >
                <Paperclip className="w-4 h-4" />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect}
                accept="image/*,application/pdf,text/plain,audio/*" 
            />

            {/* Mic Button */}
            <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2 rounded-lg transition-all ${
                    isRecording 
                    ? 'bg-red-100 text-red-600 animate-pulse' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                }`}
                title="Record Voice"
            >
                <Mic className="w-4 h-4" />
            </button>

            {/* Text Input */}
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Type, or upload meeting audio..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none text-sm max-h-32 py-2 px-1 placeholder-gray-400 text-gray-800"
                rows={1}
            />
            
            {/* Send Button */}
            <button 
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || loading}
                className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors mb-0.5"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
        </div>
      </div>
    </div>
  );
};