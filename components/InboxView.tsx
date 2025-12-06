
import React, { useState, useRef, useEffect } from 'react';
import { InboxItem, Project, InboxAction, Integration, TaskPriority, TaskStatus, Attachment } from '../types';
import { Mic, Sparkles, Loader2, FileText, Trash2, Paperclip, MessageSquare, Package, Calendar, CheckSquare, X, ArrowRight, Folder, Flag, ChevronDown, Edit3 } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { analyticsService } from '../services/analyticsService';

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleSubmit = () => {
      if (!inputText.trim() && inputAttachments.length === 0) return;
      onAddItem(
          inputText || (inputAttachments.length > 0 ? `Attached File: ${inputAttachments[0].name}` : 'New Item'), 
          inputAttachments.length > 0 ? 'file' : 'text', 
          inputAttachments.length > 0 ? inputAttachments[0].name : undefined, 
          inputAttachments
      );
      setInputText('');
      setInputAttachments([]);
      analyticsService.logEvent('inbox_add_item', { hasAttachment: inputAttachments.length > 0 });
  };

  return (
    <div className="flex-1 h-full bg-gray-50 dark:bg-black flex flex-col items-center p-4 md:p-8 overflow-y-auto font-sans transition-colors duration-200">
        
        {/* Stale Bundle Suggestion */}
        {staleBundleProposal && (
            <div className="w-full max-w-2xl mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-full text-amber-600 dark:text-amber-200">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-amber-900 dark:text-amber-100">Clean Up Suggestion</div>
                        <div className="text-xs text-amber-700 dark:text-amber-300">
                            You have {staleBundleProposal.itemIds.length} old items. Bundle them into <strong>"{staleBundleProposal.title}"</strong>?
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setStaleBundleProposal(null)} className="text-xs font-bold text-gray-500 hover:text-gray-700 px-3 py-1.5">Ignore</button>
                    <button onClick={executeBundle} className="text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded hover:bg-amber-600">Bundle It</button>
                </div>
            </div>
        )}

        <div className="w-full max-w-2xl mb-8 mt-4 md:mt-0 text-center relative">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Brain Dump</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Capture raw ideas. Aasani will help you structure them.</p>
        </div>

        {/* Input Box */}
        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4 mb-12 border border-gray-100 dark:border-gray-800 transition-shadow hover:shadow-2xl">
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full text-base bg-transparent border-none focus:ring-0 resize-none max-h-40 min-h-[80px] dark:text-white placeholder-gray-400"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
            />
            {/* Attachments */}
            {inputAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 px-1">
                    {inputAttachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-xs px-2 py-1 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                            <Paperclip className="w-3 h-3" />
                            <span className="max-w-[150px] truncate">{att.name || 'Attachment'}</span>
                            <button onClick={() => removeAttachment(idx)} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex justify-between items-center mt-2 border-t border-gray-50 dark:border-gray-800 pt-3">
                <div className="flex items-center gap-1">
                    <button className="p-2 rounded-full text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"><Mic className="w-5 h-5"/></button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"><Paperclip className="w-5 h-5"/></button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                </div>
                <button onClick={handleSubmit} disabled={!inputText.trim() && inputAttachments.length === 0} className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg">Capture</button>
            </div>
        </div>

        {/* Inbox Items Stream */}
        <div className="w-full max-w-2xl space-y-6 pb-20">
            {items.filter(i => i.status === 'pending').map(item => (
                <InboxItemCard 
                    key={item.id}
                    item={item}
                    projects={projects}
                    onDelete={() => onDeleteItem(item.id)}
                    onAnalyze={(id) => { 
                        setProcessingId(id);
                        if (onAnalyzeItem) onAnalyzeItem(id, item.content, item.attachments || []);
                    }}
                    onProcess={onProcessItem}
                    onDiscuss={() => onDiscussItem && onDiscussItem(item)}
                    onUpdate={onUpdateItem}
                    isProcessing={processingId === item.id}
                />
            ))}
            {items.filter(i => i.status === 'pending').length === 0 && (
                <div className="text-center text-gray-400 dark:text-gray-600 mt-12 italic">
                    All caught up. Great job!
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
    onAnalyze: (id: string) => void;
    onProcess: (id: string, action: InboxAction) => void;
    onDiscuss: () => void;
    onUpdate?: (id: string, updates: Partial<InboxItem>) => void;
    isProcessing: boolean;
}> = ({ item, projects, onDelete, onAnalyze, onProcess, onDiscuss, onUpdate, isProcessing }) => {
    const result = item.processedResult;
    
    // Local state for the "Draft Workbench" to allow editing before confirming
    const [draftTitle, setDraftTitle] = useState('');
    const [draftProjectId, setDraftProjectId] = useState('');
    const [draftPriority, setDraftPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
    const [draftType, setDraftType] = useState<'task' | 'document' | 'event'>('task');

    // Sync draft state when result arrives
    useEffect(() => {
        if (result) {
            setDraftTitle(result.data.title);
            setDraftProjectId(result.targetProjectId === 'default' ? projects[0]?.id : result.targetProjectId);
            setDraftPriority(result.data.priority || TaskPriority.MEDIUM);
            setDraftType(result.actionType === 'create_document' ? 'document' : 'task');
        }
    }, [result, projects]);

    const handleConfirm = () => {
        if (!result) return;
        
        // Construct final action from local draft state
        const finalAction: InboxAction = {
            ...result,
            actionType: draftType === 'document' ? 'create_document' : 'create_task',
            targetProjectId: draftProjectId,
            data: {
                ...result.data,
                title: draftTitle,
                priority: draftPriority
            }
        };
        onProcess(item.id, finalAction);
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all hover:border-gray-300 dark:hover:border-zinc-700">
            
            {/* Top Bar: Raw Content */}
            <div className="p-5 border-b border-gray-50 dark:border-zinc-800/50">
                <div className="flex justify-between items-start gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{item.content}</div>
                    <div className="text-[10px] text-gray-400 whitespace-nowrap">{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
                {item.attachments && item.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {item.attachments.map((att, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 text-xs px-2 py-1.5 rounded text-gray-600 dark:text-gray-400">
                                <Paperclip className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">{att.name || 'File'}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Smart Staging Workbench (Only visible if analyzed) */}
            {result ? (
                <div className="bg-gray-50/50 dark:bg-black/20 p-5 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                    
                    {/* AI Reasoning / Warning */}
                    {result.warning && (
                        <div className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-3 py-2 rounded border border-orange-100 dark:border-orange-800/50 flex items-center gap-2">
                            <span className="text-lg">⚠️</span> {result.warning}
                        </div>
                    )}
                    
                    {/* Draft Editor Form */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                            <Sparkles className="w-3 h-3" /> AI Proposal
                        </div>

                        {/* Title Edit */}
                        <input 
                            type="text" 
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            className="w-full bg-transparent border-b border-gray-200 dark:border-zinc-700 pb-1 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-400"
                            placeholder="Task Title..."
                        />

                        {/* Controls Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {/* Project Selector */}
                            <div className="relative group">
                                <div className="absolute left-2.5 top-2 pointer-events-none text-gray-400"><Folder className="w-3.5 h-3.5"/></div>
                                <select 
                                    value={draftProjectId}
                                    onChange={(e) => setDraftProjectId(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg py-1.5 pl-8 pr-2 text-xs font-medium text-gray-700 dark:text-gray-300 appearance-none focus:ring-1 focus:ring-purple-500 outline-none cursor-pointer hover:border-gray-300 dark:hover:border-zinc-600"
                                >
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-gray-400 pointer-events-none" />
                            </div>

                            {/* Priority Selector */}
                            <div className="relative group">
                                <div className="absolute left-2.5 top-2 pointer-events-none text-gray-400"><Flag className="w-3.5 h-3.5"/></div>
                                <select 
                                    value={draftPriority}
                                    onChange={(e) => setDraftPriority(e.target.value as TaskPriority)}
                                    className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg py-1.5 pl-8 pr-2 text-xs font-medium text-gray-700 dark:text-gray-300 appearance-none focus:ring-1 focus:ring-purple-500 outline-none cursor-pointer hover:border-gray-300 dark:hover:border-zinc-600"
                                >
                                    <option value={TaskPriority.HIGH}>High Priority</option>
                                    <option value={TaskPriority.MEDIUM}>Medium Priority</option>
                                    <option value={TaskPriority.LOW}>Low Priority</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-gray-400 pointer-events-none" />
                            </div>

                            {/* Type Selector */}
                            <div className="relative group">
                                <div className="absolute left-2.5 top-2 pointer-events-none text-gray-400">
                                    {draftType === 'task' ? <CheckSquare className="w-3.5 h-3.5"/> : <FileText className="w-3.5 h-3.5"/>}
                                </div>
                                <select 
                                    value={draftType}
                                    onChange={(e) => setDraftType(e.target.value as any)}
                                    className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg py-1.5 pl-8 pr-2 text-xs font-medium text-gray-700 dark:text-gray-300 appearance-none focus:ring-1 focus:ring-purple-500 outline-none cursor-pointer hover:border-gray-300 dark:hover:border-zinc-600"
                                >
                                    <option value="task">Create Task</option>
                                    <option value="document">Create Doc</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2">
                        <div className="flex gap-2">
                            <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4"/>
                            </button>
                            <button onClick={onDiscuss} className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors animate-pulse" title="Discuss with AI">
                                <MessageSquare className="w-4 h-4"/>
                            </button>
                        </div>
                        <button onClick={handleConfirm} className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-lg flex items-center gap-2">
                            Confirm Action <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            ) : (
                /* Unprocessed State */
                <div className="bg-gray-50 dark:bg-zinc-800/30 px-4 py-3 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                    <button onClick={onDiscuss} className="text-xs font-bold text-gray-500 hover:text-purple-500 flex items-center gap-1.5 transition-colors">
                        <MessageSquare className="w-3.5 h-3.5"/> Discuss
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                            <Trash2 className="w-4 h-4"/>
                        </button>
                        <button 
                            onClick={() => onAnalyze(item.id)} 
                            disabled={isProcessing}
                            className="text-xs bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 px-4 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-600 flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-all font-medium"
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
