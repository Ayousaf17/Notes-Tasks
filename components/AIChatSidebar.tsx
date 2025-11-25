
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Attachment, ProjectPlan } from '../types';
import { Send, X, Bot, Paperclip, Mic, Loader2, FileText, Sparkles, Music } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: string;
  onProjectPlanCreated: (plan: ProjectPlan) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

// Helper for rendering cleaner markdown-like text
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let currentListType: 'ul' | 'ol' | null = null;
  let currentListItems: React.ReactNode[] = [];

  const flushList = () => {
    if (currentListType && currentListItems.length > 0) {
      if (currentListType === 'ul') {
        elements.push(<ul key={`list-${elements.length}`} className="list-disc list-outside ml-5 mb-4 space-y-2 text-gray-700 dark:text-gray-300">{currentListItems}</ul>);
      } else {
        elements.push(<ol key={`list-${elements.length}`} className="list-decimal list-outside ml-5 mb-4 space-y-2 text-gray-700 dark:text-gray-300">{currentListItems}</ol>);
      }
      currentListItems = [];
      currentListType = null;
    }
  };

  const parseInline = (str: string, keyPrefix: string) => {
    // Handle bold (**text**)
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${keyPrefix}-${i}`} className="font-semibold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Empty line -> spacer
    if (!trimmed) {
        flushList();
        return;
    }

    // Check for Ordered List (e.g. "1. ")
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
        if (currentListType !== 'ol') flushList();
        currentListType = 'ol';
        currentListItems.push(
            <li key={`li-${i}`} className="pl-1">
                {parseInline(olMatch[2], `li-${i}`)}
            </li>
        );
        return;
    }

    // Check for Unordered List (e.g. "- " or "* ")
    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
        if (currentListType !== 'ul') flushList();
        currentListType = 'ul';
        currentListItems.push(
            <li key={`li-${i}`} className="pl-1">
                {parseInline(ulMatch[1], `li-${i}`)}
            </li>
        );
        return;
    }

    // Regular paragraph
    flushList();
    
    // Check for headers (simple check)
    if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={`h3-${i}`} className="text-sm font-bold text-gray-900 dark:text-white mb-2 mt-6">{parseInline(trimmed.replace('### ', ''), `h3-${i}`)}</h3>);
    } else if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={`h2-${i}`} className="text-base font-bold text-gray-900 dark:text-white mb-3 mt-8 border-b border-gray-100 dark:border-gray-800 pb-1">{parseInline(trimmed.replace('## ', ''), `h2-${i}`)}</h2>);
    } else {
        elements.push(<p key={`p-${i}`} className="mb-4 text-gray-700 dark:text-gray-300 leading-7">{parseInline(line, `p-${i}`)}</p>);
    }
  });

  flushList();
  return <div className="text-sm font-sans">{elements}</div>;
};

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ 
  isOpen, 
  onClose, 
  contextData, 
  onProjectPlanCreated,
  messages,
  setMessages
}) => {
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
           const newAttachment: Attachment = {
              mimeType: 'audio/webm',
              data: base64String,
              name: 'Voice Note'
           };
           setAttachments(prev => [...prev, newAttachment]);
        };
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

    const lowerInput = currentInput.toLowerCase();
    const isStructuredRequest = 
        lowerInput.includes('plan') || 
        lowerInput.includes('project') || 
        lowerInput.includes('meeting') || 
        lowerInput.includes('summary') ||
        lowerInput.includes('tasks');

    if (isStructuredRequest && (currentAttachments.length > 0 || currentInput.length > 15)) {
        setIsAnalysingPlan(true);
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
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));
        
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
    <div className="w-full md:w-[420px] bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 flex flex-col shadow-2xl shadow-gray-200/50 dark:shadow-black/50 absolute right-0 top-0 bottom-0 z-50 transition-transform font-sans">
      {/* Header */}
      <div className="p-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-black dark:bg-white rounded-full" />
          <span className="font-semibold text-gray-900 dark:text-white text-sm tracking-tight">Aasani</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8 bg-white dark:bg-gray-900">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
             <div className={`max-w-[95%] ${msg.role === 'user' ? 'text-right' : 'text-left w-full'}`}>
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2 justify-end">
                        {msg.attachments.map((att, i) => (
                            <div key={i} className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300">
                                {att.mimeType.startsWith('audio/') ? <Music className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                <span className="truncate max-w-[100px]">{att.name || 'File'}</span>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Text Bubble */}
                {msg.role === 'user' ? (
                    <div className="inline-block px-5 py-3 rounded-2xl text-sm leading-relaxed bg-black text-white rounded-br-sm text-left shadow-sm">
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                ) : (
                    <div className="block w-full px-6 py-6 rounded-xl text-sm leading-relaxed text-gray-800 dark:text-gray-200 bg-zinc-50 dark:bg-zinc-900 border-none shadow-none">
                        <FormattedMessage text={msg.text} />
                    </div>
                )}
                <div className={`text-[10px] text-gray-300 dark:text-gray-600 mt-2 px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.role === 'user' ? 'You' : 'Aasani'}
                </div>
            </div>
          </div>
        ))}
        
        {loading && (
            <div className="flex items-center space-x-2 text-xs text-gray-400 px-4">
                {isAnalysingPlan ? (
                   <>
                     <Sparkles className="w-3 h-3 animate-spin text-purple-500" />
                     <span className="text-purple-500 font-medium">Analyzing...</span>
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

      {/* Input Area (Pill Design) */}
      <div className="p-4 bg-white dark:bg-gray-900 pb-6 relative">
        {/* Active Attachments Preview */}
        {attachments.length > 0 && (
            <div className="flex space-x-2 mb-3 overflow-x-auto px-1">
                {attachments.map((att, idx) => (
                    <div key={idx} className="relative group flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                        {att.mimeType.startsWith('audio/') ? <Music className="w-3 h-3 text-gray-500 dark:text-gray-400" /> : <FileText className="w-3 h-3 text-gray-500 dark:text-gray-400" />}
                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[120px]">{att.name || 'Attachment'}</span>
                        <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="ml-2 text-gray-400 hover:text-red-500">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        )}

        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-1.5 flex items-center gap-2 border border-transparent focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:ring-2 focus-within:ring-black/5 dark:focus-within:ring-white/10 focus-within:border-zinc-200 dark:focus-within:border-gray-700 transition-all shadow-sm">
            
            {/* Left Actions */}
            <div className="flex items-center gap-0.5 pl-1">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Attach file"
                >
                    <Paperclip className="w-4 h-4" />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf,text/plain,audio/*" />

                <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-50 text-white animate-pulse' : 'text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    title={isRecording ? "Stop recording" : "Record voice note"}
                >
                    <Mic className="w-4 h-4" />
                </button>
            </div>

            {/* Input */}
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Ask Aasani..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-1 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100"
            />
            
            {/* Send Button */}
            <button 
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || loading}
                className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-black dark:disabled:hover:bg-white transition-colors shadow-sm"
            >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 ml-0.5" />}
            </button>
        </div>
      </div>
    </div>
  );
};
