
import React, { useState, useRef, useEffect } from 'react';
import { InboxItem, Project, InboxAction, Integration, TaskPriority, TaskStatus, Attachment } from '../types';
import { Mic, Sparkles, Loader2, FileText, Trash2, Paperclip, MessageSquare, Package, Calendar, CheckSquare, X, ArrowRight, Folder, Flag, ChevronDown, Edit3, AtSign, Cpu, Wand2, Rocket, Send, User, ChevronUp, Check, Briefcase, Clock } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { analyticsService } from '../services/analyticsService';
import { useMascot } from '../contexts/MascotContext';
import { dataService } from '../services/dataService';
import { ParticleButton } from './ui/particle-button';
import { cn } from '../lib/utils';

interface InboxViewProps {
  items: InboxItem[];
  onAddItem: (content: string, type: 'text' | 'audio' | 'file', fileName?: string, attachments?: Attachment[]) => void;
  onProcessItem: (itemId: string, action: InboxAction) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem?: (itemId: string, updates: Partial<InboxItem>) => void; 
  onDiscussItem?: (item: InboxItem) => void; 
  onAnalyzeItem?: (id: string, content: string, attachments: Attachment[]) => void;
  projects: Project[];
  integrations?: Integration[];
  activeProjectId?: string;
}

export const InboxView: React.FC<InboxViewProps> = ({ 
    items, 
    onAddItem, 
    onProcessItem, 
    onDeleteItem,
    onUpdateItem,
    onDiscussItem,
    onAnalyzeItem,
    projects,
    activeProjectId
}) => {
  const [inputText, setInputText] = useState('');
  const [inputAttachments, setInputAttachments] = useState<Attachment[]>([]);
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);
  const [contextRef, setContextRef] = useState<string | null>(null);
  const [activeContextItemId, setActiveContextItemId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const [showPending, setShowPending] = useState(true);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptBuilderRef = useRef<HTMLDivElement>(null);

  const { say } = useMascot();

  // Auto-scroll chat
  useEffect(() => {
      if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
  }, [chatHistory, isChatProcessing]);

  // Click outside listener for Prompt Builder
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (promptBuilderRef.current && !promptBuilderRef.current.contains(event.target as Node)) {
              setShowPromptBuilder(false);
          }
      };
      if (showPromptBuilder) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPromptBuilder]);

  // Initial Greeting if empty
  useEffect(() => {
      if (chatHistory.length === 0) {
          setChatHistory([{ role: 'model', text: "What's on your mind? I can help capture tasks or brainstorm." }]);
      }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              const base64Data = base64String.split(',')[1]; 
              setInputAttachments(prev => [...prev, { mimeType: file.type, data: base64Data, name: file.name }]);
          };
          reader.readAsDataURL(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => setInputAttachments(prev => prev.filter((_, i) => i !== index));

  const handlePromptSelect = (prompt: string) => {
      setInputText(prev => prev ? `${prev}\n${prompt}` : prompt);
      setShowPromptBuilder(false);
      textareaRef.current?.focus();
  };

  const handleEnrichItem = (item: InboxItem) => {
      setActiveContextItemId(item.id);
      setInputText(prev => prev ? prev : `Refining: ${item.content}`);
      textareaRef.current?.focus();
  };

  // --- HYBRID CHAT HANDLER ---
  const handleSubmit = async () => {
      if (!inputText.trim() && inputAttachments.length === 0) return;
      
      let userInput = inputText;
      let finalContent = userInput;
      if (contextRef) finalContent = `[Context: ${contextRef}] ${finalContent}`;
      
      if (activeContextItemId) {
          const item = items.find(i => i.id === activeContextItemId);
          if (item) {
              finalContent = `[Refining Pending Item ID: "${item.id}" Title: "${item.content}"] ${finalContent}`;
          }
          setActiveContextItemId(null); 
      }

      setChatHistory(prev => [...prev, { role: 'user', text: userInput }]);
      setInputText('');
      setContextRef(null);
      setIsChatProcessing(true);

      const pendingItems = items.filter(i => i.status === 'pending');
      const result = await geminiService.processInboxChat(finalContent, chatHistory, projects, pendingItems);
      
      setChatHistory(prev => [...prev, { role: 'model', text: result.response }]);
      setIsChatProcessing(false);

      if (result.updatedItems && result.updatedItems.length > 0 && onUpdateItem) {
          result.updatedItems.forEach(update => {
              const item = pendingItems.find(p => p.id === update.id);
              if (item) {
                  const currentDraft = item.processedResult || {
                      actionType: 'create_task',
                      targetProjectId: 'default',
                      data: { title: item.content, priority: TaskPriority.MEDIUM },
                      reasoning: 'Auto-draft'
                  };
                  const updatedDraft = {
                      ...currentDraft,
                      targetProjectId: update.updates.project || currentDraft.targetProjectId,
                      actionType: (update.updates.type === 'document' ? 'create_document' : 
                                   update.updates.type === 'project' ? 'create_project' : 'create_task') as any,
                      data: {
                          ...currentDraft.data,
                          title: update.updates.title || currentDraft.data.title,
                          priority: (update.updates.priority as TaskPriority) || currentDraft.data.priority
                      }
                  };
                  // Add a timestamp for diff checking
                  (updatedDraft as any).lastUpdated = Date.now();
                  onUpdateItem(update.id, { processedResult: updatedDraft });
              }
          });
          say("Updated pending items.", 2000, 'writing');
      }

      if (result.capturedItems && result.capturedItems.length > 0) {
          result.capturedItems.forEach(item => {
              onAddItem(item.content, item.type, item.fileName, inputAttachments);
          });
          setInputAttachments([]);
          say("Captured to Inbox.", 2000, 'writing');
      } else if (inputAttachments.length > 0) {
          onAddItem(finalContent || `Attached File: ${inputAttachments[0].name}`, 'file', inputAttachments[0].name, inputAttachments);
          setInputAttachments([]);
      }
  };

  const pendingItems = items.filter(i => i.status === 'pending');
  const activeContextItem = activeContextItemId ? items.find(i => i.id === activeContextItemId) : null;

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden">
        
        {/* Centered Main Container */}
        <div className="z-10 flex flex-col h-full w-full max-w-5xl mx-auto bg-card/80 backdrop-blur-lg border-x border-border shadow-2xl relative">
            
            {/* HEADER */}
            <div className="p-4 md:p-6 border-b border-border shrink-0 bg-background/50 backdrop-blur z-20 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Brain Dump</h1>
                    <p className="text-sm text-muted-foreground">Chat to capture ideas or organize your tasks.</p>
                </div>
            </div>

            {/* MAIN CHAT AREA (Scrolls independently) */}
            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth"
            >
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        )}
                        <div className={`p-3.5 rounded-2xl max-w-[85%] md:max-w-[70%] text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                            : 'bg-card border border-border text-foreground rounded-tl-sm'
                        }`}>
                            {msg.text}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                ))}
                
                {isChatProcessing && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="p-3 rounded-2xl bg-card border border-border rounded-tl-none">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                    </div>
                )}
                
                <div className="h-4" />
            </div>

            {/* INPUT AREA */}
            <div className="shrink-0 p-4 border-t border-border bg-card z-20">
                <div className="max-w-3xl mx-auto w-full">
                    {/* Active Context Pill */}
                    {(contextRef || activeContextItem) && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {contextRef && (
                                <div className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-medium">
                                    {contextRef} <button onClick={() => setContextRef(null)}><X className="w-3 h-3"/></button>
                                </div>
                            )}
                            {activeContextItem && (
                                <div className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-medium animate-in slide-in-from-bottom-1">
                                    <Edit3 className="w-3 h-3" /> Refining: "{activeContextItem.content.substring(0, 20)}..." 
                                    <button onClick={() => setActiveContextItemId(null)}><X className="w-3 h-3"/></button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Input Container */}
                    <div className="relative flex items-end gap-2 bg-muted/30 border border-border rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <div className="flex items-center gap-1 pb-1">
                            <div className="relative" ref={promptBuilderRef}>
                                <button 
                                    onClick={() => setShowPromptBuilder(!showPromptBuilder)}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                    title="Prompt Builder"
                                >
                                    <Wand2 className="w-4 h-4" />
                                </button>
                                {showPromptBuilder && (
                                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-popover border border-border rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95">
                                        <div className="p-1">
                                            {['Summarize this doc', 'Create a project plan', 'Draft an email', 'Extract action items'].map(p => (
                                                <button 
                                                    key={p} 
                                                    onClick={() => handlePromptSelect(p)}
                                                    className="w-full text-left px-3 py-2 text-xs text-popover-foreground hover:bg-muted rounded-lg transition-colors"
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                title="Attach File"
                            >
                                <Paperclip className="w-4 h-4" />
                            </button>
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={activeContextItem ? `Refining "${activeContextItem.content}"...` : "Type a message, @project, or paste content..."}
                            className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 resize-none py-2 px-2 text-sm text-foreground placeholder-muted-foreground/70"
                            rows={1}
                            style={{ minHeight: '40px' }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                        
                        <div className="pb-1">
                            <ParticleButton 
                                onClick={handleSubmit}
                                disabled={!inputText.trim() && inputAttachments.length === 0}
                                className="p-2 h-9 w-9 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center"
                                successDuration={800}
                            >
                                <ArrowRight className="w-4 h-4" />
                            </ParticleButton>
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    
                    {inputAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {inputAttachments.map((att, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-muted text-xs px-2 py-1 rounded border border-border">
                                    <span className="truncate max-w-[150px]">{att.name}</span>
                                    <button onClick={() => removeAttachment(idx)}><X className="w-3 h-3"/></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* PENDING ITEMS DRAWER */}
            <div className={`shrink-0 border-t border-border bg-card transition-all duration-300 flex flex-col ${showPending ? 'h-[40vh]' : 'h-10'}`}>
                <div 
                    className="flex items-center justify-between px-4 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setShowPending(!showPending)}
                >
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        <Package className="w-4 h-4" /> Pending Items ({pendingItems.length})
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showPending ? '' : 'rotate-180'}`} />
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                    {pendingItems.length === 0 ? (
                        <div className="text-center text-muted-foreground text-sm italic py-4">No pending items.</div>
                    ) : (
                        pendingItems.map(item => (
                            <InboxItemCard 
                                key={item.id}
                                item={item}
                                projects={projects}
                                onDelete={() => onDeleteItem(item.id)}
                                onProcess={onProcessItem}
                                onDiscuss={() => handleEnrichItem(item)}
                                onUpdate={onUpdateItem}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

const InboxItemCard: React.FC<{
    item: InboxItem;
    projects: Project[];
    onDelete: () => void;
    onProcess: (id: string, action: InboxAction) => void;
    onDiscuss: () => void;
    onUpdate?: (id: string, updates: Partial<InboxItem>) => void;
}> = ({ item, projects, onDelete, onProcess, onDiscuss, onUpdate }) => {
    
    const result = item.processedResult;
    const [draftTitle, setDraftTitle] = useState(item.content); 
    const [draftProjectId, setDraftProjectId] = useState('default');
    const [draftPriority, setDraftPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
    const [draftType, setDraftType] = useState<'task' | 'document' | 'project'>('task');
    const [justUpdated, setJustUpdated] = useState(false);

    useEffect(() => {
        if (result) {
            setDraftTitle(result.data.title);
            if (result.actionType === 'create_project') {
                setDraftProjectId('new');
                setDraftType('project');
            } else {
                setDraftProjectId(result.targetProjectId === 'default' ? (projects[0]?.id || 'default') : result.targetProjectId);
                setDraftType(result.actionType === 'create_document' ? 'document' : 'task');
            }
            setDraftPriority(result.data.priority || TaskPriority.MEDIUM);
            
            if ((result as any).lastUpdated && Date.now() - (result as any).lastUpdated < 2000) {
                setJustUpdated(true);
                setTimeout(() => setJustUpdated(false), 1500);
            }
        } else {
            setDraftTitle(item.content);
        }
    }, [result, projects, item.content]);

    const handleConfirm = () => {
        let finalAction: InboxAction = result ? { ...result } : {
            actionType: 'create_task',
            targetProjectId: 'default',
            data: { title: draftTitle },
            reasoning: 'User confirmed draft'
        };
        
        if (draftType === 'project') {
            finalAction.actionType = 'create_project';
            finalAction.targetProjectId = `NEW:${draftTitle}`; 
        } else {
            finalAction.actionType = draftType === 'document' ? 'create_document' : 'create_task';
            finalAction.targetProjectId = draftProjectId;
        }
        finalAction.data.title = draftTitle;
        finalAction.data.priority = draftPriority;

        onProcess(item.id, finalAction);
    };

    return (
        <div className="w-full relative bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_1px_6px_0_rgba(0,0,0,0.02)] rounded-xl p-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 group">
            <div className="flex items-start gap-4">
                {/* Left Icon */}
                <div className="relative h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-500">
                     {item.type === 'audio' ? <Mic className="w-5 h-5"/> :
                      item.type === 'file' ? <Paperclip className="w-5 h-5"/> :
                      <MessageSquare className="w-5 h-5"/>}
                </div>

                {/* Middle Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                     {/* Title Row */}
                     <input
                         type="text"
                         value={draftTitle}
                         onChange={(e) => setDraftTitle(e.target.value)}
                         className={`w-full bg-transparent border-none p-0 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:ring-0 placeholder-zinc-400 ${justUpdated ? 'text-green-600 dark:text-green-400' : ''}`}
                         placeholder="Task Title..."
                     />
                     
                     {/* Metadata Tablets Row */}
                     <div className="flex flex-wrap gap-2 mt-2 items-center">
                         {/* Type Tablet */}
                         <div className="relative group/tablet inline-flex items-center">
                            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer">
                                {draftType === 'task' ? <CheckSquare className="w-3 h-3"/> : draftType === 'project' ? <Rocket className="w-3 h-3"/> : <FileText className="w-3 h-3"/>}
                                <span className="capitalize">{draftType}</span>
                                <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                            </div>
                            <select
                                value={draftType}
                                onChange={(e) => setDraftType(e.target.value as any)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            >
                                <option value="task">Task</option>
                                <option value="document">Doc</option>
                                <option value="project">Project</option>
                            </select>
                         </div>

                         {/* Project Tablet */}
                         <div className="relative group/tablet inline-flex items-center">
                            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer max-w-[120px]">
                                <Folder className="w-3 h-3"/>
                                <span className="truncate">{projects.find(p => p.id === draftProjectId)?.title || 'Default'}</span>
                                <ChevronDown className="w-2.5 h-2.5 opacity-50 flex-shrink-0" />
                            </div>
                            <select
                                value={draftProjectId}
                                onChange={(e) => setDraftProjectId(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            >
                                <option value="default">Default</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                         </div>

                         {/* Priority Tablet */}
                         <div className="relative group/tablet inline-flex items-center">
                            <div className={`border rounded-md px-2 py-1 text-[10px] font-medium flex items-center gap-1 shadow-sm transition-colors cursor-pointer
                                ${draftPriority === TaskPriority.HIGH ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800' :
                                  draftPriority === TaskPriority.MEDIUM ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-200 dark:border-orange-800' :
                                  'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'}
                            `}>
                                <Flag className="w-3 h-3"/>
                                <span className="capitalize">{draftPriority}</span>
                            </div>
                            <select
                                value={draftPriority}
                                onChange={(e) => setDraftPriority(e.target.value as TaskPriority)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            >
                                <option value={TaskPriority.HIGH}>High</option>
                                <option value={TaskPriority.MEDIUM}>Medium</option>
                                <option value={TaskPriority.LOW}>Low</option>
                            </select>
                         </div>

                         <span className="text-[10px] text-zinc-400 ml-auto flex items-center gap-1">
                             <Clock className="w-3 h-3" />
                             {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </span>
                     </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button onClick={onDelete} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={onDiscuss} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Refine with AI">
                        <MessageSquare className="w-4 h-4" />
                    </button>
                    <button onClick={handleConfirm} className="h-8 w-8 flex items-center justify-center rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 shadow-sm transition-all transform active:scale-95">
                        <Check className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
