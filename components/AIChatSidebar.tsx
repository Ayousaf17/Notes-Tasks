
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Attachment, ProjectPlan, Document, Task, Source } from '../types';
import { Send, X, Bot, Paperclip, Mic, Loader2, FileText, Sparkles, Music, Trash2, BrainCircuit, CheckSquare, Search, ArrowRight, Layout } from 'lucide-react';
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
    if (!trimmed) {
        flushList();
        return;
    }

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

    flushList();
    
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
  setMessages,
  allDocuments,
  allTasks
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [retrievingContext, setRetrievingContext] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalysingPlan, setIsAnalysingPlan] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    try {
        const stored = localStorage.getItem('chat_history');
        if (stored) {
            const parsed = JSON.parse(stored).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
            }));
            if (parsed.length > 0 && messages.length <= 1) { 
                setMessages(parsed);
            }
        }
    } catch(e) { console.error("Failed to load chat history", e); }
  }, []);

  const clearHistory = () => {
    if (confirm("Clear chat history?")) {
        setMessages([{ id: 'init', role: 'model', text: 'History cleared. How can I help you now?', timestamp: new Date() }]);
        localStorage.removeItem('chat_history');
    }
  };

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, attachments, loading, retrievingContext]);

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

  // --- HITL: Approve Plan ---
  const handleApprovePlan = (proposal: ProjectPlan, messageId: string) => {
      onProjectPlanCreated(proposal);
      // Update message to show approved state
      setMessages(prev => prev.map(m => 
          m.id === messageId 
          ? { ...m, text: `✅ Plan Approved: "${proposal.projectTitle}" created with ${proposal.tasks.length} tasks.`, planProposal: undefined } 
          : m
      ));
  };

  const handleDiscardPlan = (messageId: string) => {
      setMessages(prev => prev.map(m => 
          m.id === messageId 
          ? { ...m, text: `❌ Plan Discarded.`, planProposal: undefined } 
          : m
      ));
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
        lowerInput.includes('outline') || 
        lowerInput.includes('prepare') ||
        lowerInput.includes('create tasks');

    // HITL Logic: If user wants a plan, generate a Proposal, DON'T execute immediately.
    if (isStructuredRequest) {
        setIsAnalysingPlan(true);
        const plan = await geminiService.generateProjectPlan(currentInput || "Create a plan based on context", currentAttachments);
        
        if (plan) {
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: `I've drafted a plan for "${plan.projectTitle}". Please review the tasks and document outline below before I create them.`,
                timestamp: new Date(),
                planProposal: plan // Attach the proposal here
            };
            setMessages(prev => [...prev, aiMsg]);
        } else {
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "I tried to structure a plan but couldn't get enough details. Could you elaborate on the project goals?",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        }
        setIsAnalysingPlan(false);
    } else {
        setRetrievingContext(true);
        
        let retrievedContext = "";
        let sources: Source[] = [];
        
        if (currentInput.split(' ').length > 2) {
             const result = await geminiService.findRelevantContext(currentInput, allDocuments, allTasks);
             retrievedContext = result.text;
             sources = result.sources;
        }
        
        setRetrievingContext(false);

        let fullSystemContext = "";
        if (contextData) fullSystemContext += `ACTIVE DOCUMENT CONTENT:\n${contextData}\n\n`;
        if (retrievedContext) fullSystemContext += `RETRIEVED KNOWLEDGE (From other files):\n${retrievedContext}\n\n`;
        
        const history = messages.slice(-10).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));
        
        const responseText = await geminiService.chat(history, currentInput, currentAttachments, fullSystemContext);

        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date(),
            sources: sources
        };

        setMessages(prev => [...prev, aiMsg]);
    }
    
    setLoading(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden animate-in fade-in duration-300"
            onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 z-[60] w-full md:w-[450px] bg-white dark:bg-black border-l border-gray-100 dark:border-gray-800 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out transform font-sans h-[100dvh] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header */}
        <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-black shrink-0 safe-area-top pt-safe md:pt-4">
          <div className="flex items-center space-x-3">
            <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm tracking-tight">Aasani AI</span>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={clearHistory} className="text-gray-400 hover:text-red-500 transition-colors" title="Clear History">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-6 h-6 md:w-4 md:h-4" />
              </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-white dark:bg-black">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] ${msg.role === 'user' ? 'text-right' : 'text-left w-full'}`}>
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
                  
                  {msg.role === 'user' ? (
                      <div className="inline-block px-5 py-3 rounded-2xl text-sm leading-relaxed bg-black text-white rounded-br-sm text-left shadow-sm">
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                  ) : (
                      <div className="flex flex-col gap-3 w-full">
                          <div className="flex gap-4">
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 shrink-0">
                                  <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="block w-full px-6 py-6 rounded-xl text-sm leading-relaxed text-gray-800 dark:text-gray-200 bg-zinc-50 dark:bg-zinc-900 border-none shadow-none">
                                  <FormattedMessage text={msg.text} />
                                  
                                  {/* HITL Proposal Card */}
                                  {msg.planProposal && (
                                      <div className="mt-4 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
                                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                              <Layout className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Plan Proposal</span>
                                          </div>
                                          <div className="p-4 space-y-3">
                                              <div>
                                                  <div className="text-xs text-gray-400 uppercase font-medium">Project</div>
                                                  <div className="font-bold text-gray-900 dark:text-white">{msg.planProposal.projectTitle}</div>
                                              </div>
                                              <div>
                                                  <div className="text-xs text-gray-400 uppercase font-medium mb-1">Proposed Tasks ({msg.planProposal.tasks.length})</div>
                                                  <div className="max-h-32 overflow-y-auto space-y-1">
                                                      {msg.planProposal.tasks.slice(0, 5).map((t, idx) => (
                                                          <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                              <CheckSquare className="w-3 h-3" />
                                                              <span className="truncate">{t.title}</span>
                                                          </div>
                                                      ))}
                                                      {msg.planProposal.tasks.length > 5 && (
                                                          <div className="text-xs text-gray-400 italic pl-5">...and {msg.planProposal.tasks.length - 5} more</div>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex border-t border-gray-100 dark:border-gray-800">
                                              <button 
                                                  onClick={() => handleDiscardPlan(msg.id)}
                                                  className="flex-1 py-3 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-r border-gray-100 dark:border-gray-800"
                                              >
                                                  Discard
                                              </button>
                                              <button 
                                                  onClick={() => handleApprovePlan(msg.planProposal!, msg.id)}
                                                  className="flex-1 py-3 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors flex items-center justify-center gap-1"
                                              >
                                                  Approve & Execute <ArrowRight className="w-3 h-3" />
                                              </button>
                                          </div>
                                      </div>
                                  )}

                                  {msg.sources && msg.sources.length > 0 && (
                                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                                          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase mb-2 flex items-center gap-1">
                                              <Search className="w-3 h-3" />
                                              Used {msg.sources.length} Reference{msg.sources.length > 1 ? 's' : ''}
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                              {msg.sources.map((src, idx) => (
                                                  <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded text-[10px] text-gray-500 dark:text-gray-400">
                                                      {src.type === 'document' ? <FileText className="w-3 h-3 text-blue-500" /> : <CheckSquare className="w-3 h-3 text-green-500" />}
                                                      <span className="truncate max-w-[150px]">{src.title}</span>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  )}
                  <div className={`text-[10px] text-gray-300 dark:text-gray-600 mt-2 px-1 ${msg.role === 'user' ? 'text-right' : 'text-left ml-12'}`}>
                      {msg.role === 'user' ? 'You' : 'Aasani'}
                  </div>
              </div>
            </div>
          ))}
          
          {loading && (
              <div className="flex items-center space-x-2 text-xs text-gray-400 px-4 ml-12 animate-pulse">
                  {retrievingContext ? (
                      <>
                          <BrainCircuit className="w-3 h-3 text-purple-500" />
                          <span className="text-purple-500 font-medium">Scanning workspace...</span>
                      </>
                  ) : isAnalysingPlan ? (
                    <>
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span className="text-purple-500 font-medium">Drafting Plan Proposal...</span>
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

        {/* Input Area - Sticky Bottom & Safe Area */}
        <div className="p-4 bg-white dark:bg-black pb-safe sticky bottom-0 z-50 border-t border-gray-50 dark:border-gray-800 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
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

          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-1.5 flex items-center gap-2 border border-transparent focus-within:bg-white dark:focus-within:bg-gray-900 focus-within:ring-2 focus-within:ring-black/5 dark:focus-within:ring-white/10 focus-within:border-zinc-200 dark:focus-within:border-gray-700 transition-all shadow-sm">
              <div className="flex items-center gap-0.5 pl-1">
                  <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                      title="Attach file"
                  >
                      <Paperclip className="w-5 h-5" />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf,text/plain,audio/*" />

                  <button 
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-50 text-white animate-pulse' : 'text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                      title={isRecording ? "Stop recording" : "Record voice note"}
                  >
                      <Mic className="w-5 h-5" />
                  </button>
              </div>

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
                  className="flex-1 bg-transparent border-none focus:ring-0 text-base py-3 px-1 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100"
              />
              
              <button 
                  onClick={handleSend}
                  disabled={(!input.trim() && attachments.length === 0) || loading}
                  className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-black dark:disabled:hover:bg-white transition-colors shadow-sm"
              >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </button>
          </div>
        </div>
      </div>
    </>
  );
};
