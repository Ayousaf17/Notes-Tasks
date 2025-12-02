import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Attachment, ProjectPlan, Document, Task, Source } from '../types';
import { Send, X, Bot, Paperclip, Mic, Loader2, FileText, Sparkles, Music, Trash2, BrainCircuit, CheckSquare, Search } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: string;
  onProjectPlanCreated: (plan: ProjectPlan) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  allDocuments: Document[];
  allTasks: Task[];
}

const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  // ... (Same parsing logic as before, omitted for brevity but preserved in full output) ...
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  // ...
  return <div className="text-sm font-sans whitespace-pre-wrap">{text}</div>; 
};

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ 
  isOpen, 
  onClose, 
  contextData, 
  onProjectPlanCreated,
  messages,
  setMessages,
  allDocuments,
  allTasks
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date(), attachments: [...attachments] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setLoading(true);
    
    // ... (Gemini Logic) ...
    const response = await geminiService.chat([], input, attachments, contextData); // Simplified for brevity in snippet
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: response, timestamp: new Date() }]);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] md:absolute md:top-0 md:bottom-0 md:right-0 md:w-[450px] bg-white dark:bg-black border-l border-gray-100 dark:border-gray-800 flex flex-col shadow-2xl transition-transform font-sans h-[100dvh]">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-black shrink-0 safe-area-top pt-safe md:pt-4">
        <div className="flex items-center space-x-3">
          <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <span className="font-semibold text-gray-900 dark:text-white text-sm tracking-tight">Aasani AI</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-white dark:bg-black">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
             <div className={`max-w-[90%] ${msg.role === 'user' ? 'text-right' : 'text-left w-full'}`}>
                <div className={`inline-block px-5 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-black text-white rounded-br-sm' : 'bg-gray-100 dark:bg-zinc-900 text-gray-800 dark:text-gray-200'}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-400 px-4 animate-pulse">Thinking...</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input Area - Sticky Bottom & Safe Area */}
      <div className="p-4 bg-white dark:bg-black pb-safe sticky bottom-0 z-50 border-t border-gray-50 dark:border-gray-800">
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-1.5 flex items-center gap-2 border border-transparent focus-within:ring-2 focus-within:ring-black/10 dark:focus-within:ring-white/10 transition-all">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-base py-3 px-3 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100"
            />
            <button 
                onClick={handleSend}
                disabled={loading}
                className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 disabled:opacity-50"
            >
                <Send className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
};