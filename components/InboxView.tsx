
import React, { useState, useRef, useEffect } from 'react';
import { InboxItem, Project, InboxAction, Integration, TaskPriority, TaskStatus, Attachment } from '../types';
import { Mic, Sparkles, Loader2, FileText, Trash2, Paperclip, MessageSquare, Package, Calendar, CheckSquare, X, ArrowRight, Folder, Flag, ChevronDown, Edit3, AtSign, Cpu, Wand2, Rocket, Send, User } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { analyticsService } from '../services/analyticsService';
import { useMascot } from '../contexts/MascotContext';
import { dataService } from '../services/dataService';

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
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [inputAttachments, setInputAttachments] = useState<Attachment[]>([]);
  const [staleBundleProposal, setStaleBundleProposal] = useState<{ title: string, itemIds: string[] } | null>(null);
  const [isBundling, setIsBundling] = useState(false);
  
  // Smart Input State
  const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash');
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);
  const [contextRef, setContextRef] = useState<string | null>(null); // e.g. "@Project A"

  // Chat Interface State
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { say } = useMascot();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputText]);

  // Scroll to bottom of chat
  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatProcessing]);

  // Stale check logic
  useEffect(() => {
      const checkStale = async () => {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const staleItems = items.filter(i => i.status === 'pending' && new Date(i.createdAt) < threeDaysAgo);
          if (staleItems.length >= 3 && !staleBundleProposal && !isBundling) {
              const proposal = await geminiService.suggestBundle(staleItems.map(i => ({ id: i.id, content: i.content })));
              if (proposal) {
                  setStaleBundleProposal({ title: proposal.title, itemIds: staleItems.map(i => i.id) });
              }
          }
      };
      checkStale();
  }, [items]);

  useEffect(() => {
      const pendingCount = items.filter(i => i.status === 'pending').length;
      if (pendingCount === 0 && items.length > 0) {
          say("Inbox Zero achieved! Great work.", 4000, 'surprised');
      }
  }, [items]);

  const executeBundle = () => {
      if (!staleBundleProposal) return;
      analyticsService.logEvent('stale_bundle_executed', { count: staleBundleProposal.itemIds.length });
      const action: InboxAction = {
          actionType: 'create_task',
          targetProjectId: activeProjectId || 'default',
          reasoning: 'Bundled stale inbox items.',
          data: {
              title: staleBundleProposal.title,
              description: "Bundled Items:\n" + items.filter(i => staleBundleProposal.itemIds.includes(i.id)).map(i => `- ${i.content}`).join('\n'),
              priority: TaskPriority.LOW
          }
      };
      onProcessItem(staleBundleProposal.itemIds[0], action);
      staleBundleProposal.itemIds.slice(1).forEach(id => onDeleteItem(id));
      setStaleBundleProposal(null);
      say("Items bundled successfully!", 3000, 'happy');
  };

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

  const handleProjectRefSelect = (projectTitle: string) => {
      setContextRef(`@${projectTitle}`);
  };

  // --- HYBRID CHAT HANDLER ---
  const handleSubmit = async () => {
      if (!inputText.trim() && inputAttachments.length === 0) return;
      
      const userInput = inputText;
      let finalContent = userInput;
      if (contextRef) finalContent = `[Context: ${contextRef}] ${finalContent}`;

      // Update UI immediately (Chat Interface)
      setChatHistory(prev => [...prev, { role: 'user', text: userInput }]);
      setInputText('');
      setContextRef(null);
      setIsChatProcessing(true);

      // Get pending items to allow AI to see context for updates
      const pendingItems = items.filter(i => i.status === 'pending');

      // Call AI for Hybrid Processing
      const result = await geminiService.processInboxChat(finalContent, chatHistory, projects, pendingItems);
      
      // Update Chat with AI Response
      setChatHistory(prev => [...prev, { role: 'model', text: result.response }]);
      setIsChatProcessing(false);

      // 1. Handle Updates to Existing Items
      if (result.updatedItems && result.updatedItems.length > 0 && onUpdateItem) {
          result.updatedItems.forEach(update => {
              const item = pendingItems.find(p => p.id === update.id);
              if (item) {
                  // Merge updates into the processedResult (which holds the draft state)
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

                  onUpdateItem(update.id, { processedResult: updatedDraft });
                  say(`Updated "${updatedDraft.data.title}"`, 2000, 'writing');
              }
          });
      }

      // 2. Handle Newly Captured Items
      if (result.capturedItems && result.capturedItems.length > 0) {
          result.capturedItems.forEach(item => {
              // Immediately create item with a basic draft so controls appear
              // Note: onAddItem usually generates an ID. We can rely on it to just add it to list.
              // But for immediate "Draft Mode", we might want to inject the draft state in onAddItem if we could.
              // Since we can't easily change onAddItem signature everywhere, we add it, and then potentially update it?
              // Better: onAddItem adds it as pending. The default render for pending items should SHOW the draft controls if it came from chat.
              onAddItem(
                  item.content, 
                  item.type, 
                  item.fileName, 
                  inputAttachments
              );
          });
          setInputAttachments([]);
          analyticsService.logEvent('inbox_item_captured_via_chat', { count: result.capturedItems.length });
          say("Captured to Inbox.", 2000, 'writing');
      } else if (inputAttachments.length > 0) {
          // If files attached but AI didn't explicitly capture, force capture as generic note
          onAddItem(
              finalContent || `Attached File: ${inputAttachments[0].name}`,
              'file',
              inputAttachments[0].name,
              inputAttachments
          );
          setInputAttachments([]);
      }
  };

  const handleSmartAnalyze = async (id: string, content: string, userReply?: string) => {
      // This legacy method is kept for direct "Analyze" button clicks on cards
      setProcessingId(id);
      const item = items.find(i => i.id === id);
      if (!item) return;

      let currentHistory = item.conversationHistory || [];
      if (userReply) {
          currentHistory = [...currentHistory, { role: 'user', text: userReply }];
          if (onUpdateItem) onUpdateItem(id, { conversationHistory: currentHistory });
      }

      if (currentHistory.length === 0) {
          const kickoffResult = await geminiService.analyzeKickoffDoc(content);
          if (kickoffResult) {
              onProcessItem(id, kickoffResult);
              setProcessingId(null);
              return;
          }
      }

      const result = await geminiService.reasonAboutInboxItem(
          userReply || content, 
          currentHistory,
          projects,
          "" 
      );

      if (result.type === 'clarification') {
          const newHistory = [...currentHistory, { role: 'model' as const, text: result.question }];
          if (onUpdateItem) {
              onUpdateItem(id, { 
                  conversationHistory: newHistory,
                  isClarifying: true
              });
          }
      } else {
          if (onProcessItem) {
              // Instead of processing immediately, we set the Result so the UI shows the "Confirm" card
              // This aligns with the HITL requirement
              if (onUpdateItem) {
                  onUpdateItem(id, { processedResult: result.action, isClarifying: false });
              }
          }
      }
      setProcessingId(null);
  };

  return (
    <div className="flex-1 h-full bg-background flex flex-col items-center p-4 md:p-8 overflow-y-auto font-sans transition-colors duration-200">
        
        {/* Stale Bundle Suggestion */}
        {staleBundleProposal && (
            <div className="w-full max-w-3xl mb-6 bg-accent border border-accent-foreground/10 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-full text-accent-foreground">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-accent-foreground">Clean Up Suggestion</div>
                        <div className="text-xs text-muted-foreground">
                            You have {staleBundleProposal.itemIds.length} old items. Bundle them into <strong>"{staleBundleProposal.title}"</strong>?
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setStaleBundleProposal(null)} className="text-xs font-bold text-muted-foreground hover:text-foreground px-3 py-1.5">Ignore</button>
                    <button onClick={executeBundle} className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded hover:opacity-90">Bundle It</button>
                </div>
            </div>
        )}

        <div className="w-full max-w-3xl mb-6 mt-4 md:mt-0 relative">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-1 tracking-tight">Brain Dump</h1>
            <p className="text-muted-foreground text-sm">Chat with Aasani to capture ideas, or just think out loud.</p>
        </div>

        {/* --- CHAT STREAM --- */}
        {chatHistory.length > 0 && (
            <div className="w-full max-w-3xl mb-6 space-y-4 px-2">
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        )}
                        <div className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground rounded-tr-none' 
                            : 'bg-card border border-border text-foreground rounded-tl-none'
                        }`}>
                            {msg.text}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-gray-500" />
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
                <div ref={chatEndRef} />
            </div>
        )}

        {/* --- SMART INPUT INTERFACE --- */}
        <div className="w-full max-w-3xl bg-card rounded-2xl shadow-xl border border-border transition-shadow hover:shadow-2xl mb-12 relative group animate-in fade-in slide-in-from-bottom-2 z-10">
            
            {/* Main Input Area */}
            <div className="p-4">
                {contextRef && (
                    <div className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-medium mb-2">
                        {contextRef} <button onClick={() => setContextRef(null)}><X className="w-3 h-3"/></button>
                    </div>
                )}
                
                <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={contextRef ? "What about this project?" : "Reference @project, ask a question, or dump thoughts..."}
                    className="w-full text-base bg-transparent border-none focus:ring-0 resize-none min-h-[60px] max-h-[300px] text-foreground placeholder-muted-foreground/60 p-0 leading-relaxed"
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                />

                {/* Attachments Preview */}
                {inputAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {inputAttachments.map((att, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-muted/50 text-xs px-3 py-1.5 rounded-lg text-foreground border border-border">
                                <Paperclip className="w-3 h-3 text-primary" />
                                <span className="max-w-[150px] truncate font-medium">{att.name || 'Attachment'}</span>
                                <button onClick={() => removeAttachment(idx)} className="hover:text-destructive transition-colors"><X className="w-3 h-3"/></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/20 rounded-b-2xl">
                
                {/* Left Tools */}
                <div className="flex items-center gap-2">
                    
                    {/* Prompt Builder */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowPromptBuilder(!showPromptBuilder)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-background hover:bg-muted border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-all shadow-sm"
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                            Prompt Builder
                        </button>
                        {showPromptBuilder && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95">
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

                    {/* Model Selector */}
                    <div className="relative group/model">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-background hover:bg-muted border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-all shadow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                            {selectedModel === 'flash' ? 'Gemini Flash' : 'Gemini Pro'}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                        <div className="absolute top-full left-0 mt-2 w-40 bg-popover border border-border rounded-xl shadow-xl z-20 overflow-hidden hidden group-hover/model:block animate-in fade-in zoom-in-95">
                            <div className="p-1">
                                <button onClick={() => setSelectedModel('flash')} className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${selectedModel === 'flash' ? 'bg-muted font-bold' : 'hover:bg-muted'}`}>Gemini Flash (Fast)</button>
                                <button onClick={() => setSelectedModel('pro')} className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${selectedModel === 'pro' ? 'bg-muted font-bold' : 'hover:bg-muted'}`}>Gemini Pro (Smart)</button>
                            </div>
                        </div>
                    </div>

                    {/* Context @ */}
                    <div className="relative group/ctx">
                        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                            <AtSign className="w-4 h-4" />
                        </button>
                        <div className="absolute top-full left-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl z-20 overflow-hidden hidden group-hover/ctx:block animate-in fade-in zoom-in-95">
                            <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 border-b border-border">Link to Project</div>
                            <div className="max-h-40 overflow-y-auto p-1">
                                {projects.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => handleProjectRefSelect(p.title)}
                                        className="w-full text-left px-3 py-2 text-xs text-popover-foreground hover:bg-muted rounded-lg truncate transition-colors"
                                    >
                                        {p.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Attachments */}
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                        <Paperclip className="w-4 h-4" />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

                </div>

                {/* Submit Button */}
                <button 
                    onClick={handleSubmit} 
                    disabled={!inputText.trim() && inputAttachments.length === 0} 
                    className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95"
                >
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Inbox Items Stream - Title */}
        {items.length > 0 && (
            <div className="w-full max-w-3xl mb-4 text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">
                Pending Items
            </div>
        )}

        {/* Inbox Items Stream */}
        <div className="w-full max-w-3xl space-y-4 pb-20">
            {items.filter(i => i.status === 'pending').map(item => (
                <InboxItemCard 
                    key={item.id}
                    item={item}
                    projects={projects}
                    onDelete={() => onDeleteItem(item.id)}
                    onAnalyze={handleSmartAnalyze} 
                    onProcess={onProcessItem}
                    onDiscuss={() => onDiscussItem && onDiscussItem(item)}
                    onUpdate={onUpdateItem}
                    isProcessing={processingId === item.id}
                />
            ))}
            {items.filter(i => i.status === 'pending').length === 0 && (
                <div className="text-center text-muted-foreground mt-12 italic">
                    Inbox is clear.
                </div>
            )}
        </div>
    </div>
  );
};

// Sub-component for individual item logic/rendering
const InboxItemCard: React.FC<{
    item: InboxItem;
    projects: Project[];
    onDelete: () => void;
    onAnalyze: (id: string, content: string, reply?: string) => void; 
    onProcess: (id: string, action: InboxAction) => void;
    onDiscuss: () => void;
    onUpdate?: (id: string, updates: Partial<InboxItem>) => void;
    isProcessing: boolean;
}> = ({ item, projects, onDelete, onAnalyze, onProcess, onDiscuss, onUpdate, isProcessing }) => {
    
    // We treat any pending item as "Draftable" if we have chat history or a processed result
    const isDraftMode = !!item.processedResult || (item.conversationHistory && item.conversationHistory.length > 0);
    const result = item.processedResult;
    
    const [draftTitle, setDraftTitle] = useState(item.content); // Default to content
    const [draftProjectId, setDraftProjectId] = useState('default');
    const [draftPriority, setDraftPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
    const [draftType, setDraftType] = useState<'task' | 'document' | 'event' | 'project'>('task');
    const [replyText, setReplyText] = useState('');

    // Sync draft state from processed result if available, otherwise defaults
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
        } else {
            // No AI result yet, but we are in draft mode -> use defaults or existing content
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

    const handleReply = () => {
        if (!replyText.trim()) return;
        onAnalyze(item.id, item.content, replyText);
        setReplyText('');
    };

    // If item is being clarified, show chat history + Draft Controls (HITL)
    // If just pending without chat, show simple card with "Analyze"
    const showControls = isDraftMode || item.isClarifying;

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all hover:border-foreground/20 group">
            
            {/* Header / Content Display */}
            {!showControls && (
                <div className="p-5 border-b border-border bg-card/50">
                    <div className="flex justify-between items-start gap-4">
                        <div className="text-sm text-card-foreground whitespace-pre-wrap leading-relaxed font-medium">{item.content}</div>
                        <div className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                    {item.attachments && item.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {item.attachments.map((att, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 bg-muted text-xs px-2 py-1.5 rounded-lg text-muted-foreground border border-border">
                                    <Paperclip className="w-3 h-3" />
                                    <span className="truncate max-w-[200px]">{att.name || 'File'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Conversation Mode (Clarification Needed) */}
            {item.isClarifying && (
                <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 space-y-4 border-b border-purple-100 dark:border-purple-800">
                    <div className="space-y-3">
                        {item.conversationHistory?.filter(m => m.role === 'model').slice(-2).map((msg, idx) => (
                            <div key={idx} className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-3 h-3 text-white" />
                                </div>
                                <div className="text-sm text-foreground bg-background border border-border p-3 rounded-lg rounded-tl-none shadow-sm">
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Reply Input inside card */}
                    {/* <div className="flex items-center gap-2 mt-2"> ... (Removed to encourage main chat usage for updates) ... </div> */}
                </div>
            )}

            {/* Draft Workbench (HITL Controls) - ALWAYS VISIBLE if in Draft Mode */}
            {showControls ? (
                <div className="bg-muted/30 p-5 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                    {result?.warning && (
                        <div className="text-xs bg-destructive/10 text-destructive px-3 py-2 rounded-lg border border-destructive/20 flex items-center gap-2">
                            <span className="text-lg">⚠️</span> {result.warning}
                        </div>
                    )}
                    {draftType === 'project' && (
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg flex items-center gap-2 mb-2 border border-purple-200 dark:border-purple-800">
                            <Rocket className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase">New Project Kickoff Detected</span>
                        </div>
                    )}
                    
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                                <Sparkles className="w-3 h-3" /> Draft Workbench
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>

                        {/* Title Edit */}
                        <input 
                            type="text" 
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            className="w-full bg-transparent border-b border-border pb-1 text-sm font-semibold text-foreground focus:outline-none focus:border-primary transition-colors placeholder-muted-foreground"
                            placeholder="Title..."
                        />

                        {/* Controls Grid - Tablet Dropdowns */}
                        <div className="flex flex-wrap gap-2">
                            {/* Type Selector */}
                            <div className="relative group inline-block">
                                <select 
                                    value={draftType}
                                    onChange={(e) => setDraftType(e.target.value as any)}
                                    className="appearance-none pl-8 pr-8 py-1.5 bg-card border border-border rounded-full text-xs font-medium text-card-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:border-foreground/20 shadow-sm"
                                >
                                    <option value="task">Task</option>
                                    <option value="document">Doc</option>
                                    <option value="project">Project</option>
                                </select>
                                <div className="absolute left-2.5 top-2 pointer-events-none text-muted-foreground">
                                    {draftType === 'task' ? <CheckSquare className="w-3 h-3"/> : draftType === 'project' ? <Rocket className="w-3 h-3"/> : <FileText className="w-3 h-3"/>}
                                </div>
                                <ChevronDown className="absolute right-2.5 top-2 w-3 h-3 text-muted-foreground pointer-events-none" />
                            </div>

                            {/* Project Selector */}
                            <div className="relative group inline-block">
                                <select 
                                    value={draftProjectId}
                                    onChange={(e) => setDraftProjectId(e.target.value)}
                                    className="appearance-none pl-8 pr-8 py-1.5 bg-card border border-border rounded-full text-xs font-medium text-card-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:border-foreground/20 shadow-sm max-w-[150px] truncate"
                                    disabled={draftType === 'project'}
                                >
                                    <option value="default">Default Project</option>
                                    <option value="new">New Project...</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                                <Folder className="absolute left-2.5 top-2 w-3 h-3 text-muted-foreground pointer-events-none" />
                                <ChevronDown className="absolute right-2.5 top-2 w-3 h-3 text-muted-foreground pointer-events-none" />
                            </div>

                            {/* Priority Selector */}
                            <div className="relative group inline-block">
                                <select 
                                    value={draftPriority}
                                    onChange={(e) => setDraftPriority(e.target.value as TaskPriority)}
                                    className={`appearance-none pl-8 pr-8 py-1.5 border border-border rounded-full text-xs font-medium focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:border-foreground/20 shadow-sm
                                        ${draftPriority === TaskPriority.HIGH ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20' : 
                                          draftPriority === TaskPriority.MEDIUM ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20' : 
                                          'bg-card text-card-foreground'}
                                    `}
                                >
                                    <option value={TaskPriority.HIGH}>High</option>
                                    <option value={TaskPriority.MEDIUM}>Medium</option>
                                    <option value={TaskPriority.LOW}>Low</option>
                                </select>
                                <Flag className={`absolute left-2.5 top-2 w-3 h-3 pointer-events-none ${draftPriority === TaskPriority.HIGH ? 'text-red-500' : draftPriority === TaskPriority.MEDIUM ? 'text-orange-500' : 'text-muted-foreground'}`} />
                                <ChevronDown className="absolute right-2.5 top-2 w-3 h-3 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2">
                        <div className="flex gap-2">
                            <button onClick={onDelete} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        </div>
                        <button onClick={handleConfirm} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-lg flex items-center gap-2">
                            Check & Save <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            ) : (
                // Simple View (Not yet processed/drafted)
                <div className="bg-muted/10 px-4 py-3 border-t border-border flex justify-between items-center">
                    <span className="text-xs text-muted-foreground italic">Pending analysis...</span>
                    <div className="flex gap-2">
                        <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4"/>
                        </button>
                        <button 
                            onClick={() => onAnalyze(item.id, item.content)} 
                            disabled={isProcessing}
                            className="text-xs bg-card border border-border px-3 py-1.5 rounded-lg shadow-sm hover:bg-muted flex items-center gap-2 text-card-foreground transition-all font-medium"
                        >
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3 text-purple-500"/>} 
                            Analyze
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
