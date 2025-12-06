
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InboxItem, Project, InboxAction, Integration, TaskPriority, TaskStatus, Task, Attachment, AgentRole, Client } from '../types';
import { Mic, Sparkles, Archive, Loader2, CheckCircle2, FileText, Trash2, StopCircle, Paperclip, ChevronDown, Bot, Search, Briefcase, Folder, ArrowRight, User, Layers, MessageSquare, UserPlus, Rocket, Bug, Package, Calendar, CheckSquare } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { analyticsService } from '../services/analyticsService';

interface InboxViewProps {
  items: InboxItem[];
  onAddItem: (content: string, type: 'text' | 'audio' | 'file', fileName?: string, attachments?: Attachment[]) => void;
  onProcessItem: (itemId: string, action: InboxAction) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem?: (itemId: string, updates: Partial<InboxItem>) => void; 
  onDiscussItem?: (item: InboxItem) => void; 
  projects: Project[];
  integrations?: Integration[];
  activeProjectId?: string;
}

const TypeBadge = ({ active, icon: Icon, label }: { active: boolean, icon: any, label: string }) => (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
        active 
        ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-sm' 
        : 'bg-transparent text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-800'
    }`}>
        <Icon className="w-3 h-3" />
        {label}
    </div>
);

export const InboxView: React.FC<InboxViewProps> = ({ 
    items, 
    onAddItem, 
    onProcessItem, 
    onDeleteItem,
    onUpdateItem,
    onDiscussItem,
    projects,
    integrations,
    activeProjectId
}) => {
  const [inputText, setInputText] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Stale Bundling State
  const [staleBundleProposal, setStaleBundleProposal] = useState<{ title: string, itemIds: string[] } | null>(null);
  const [isBundling, setIsBundling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check for stale items (Pending > 3 days)
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
              priority: TaskPriority.LOW,
              extractedTasks: items.filter(i => staleBundleProposal.itemIds.includes(i.id)).map(i => ({
                  title: i.content,
                  priority: TaskPriority.LOW,
                  assignee: 'Me'
              }))
          }
      };

      onProcessItem(staleBundleProposal.itemIds[0], action);
      staleBundleProposal.itemIds.slice(1).forEach(id => onDeleteItem(id));
      setStaleBundleProposal(null);
  };

  const handleSubmit = () => {
      if (!inputText.trim()) return;
      onAddItem(inputText, 'text', undefined, undefined);
      setInputText('');
      analyticsService.logEvent('inbox_add_item', { type: 'text' });
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
            <p className="text-gray-500 dark:text-gray-400 text-sm">Capture ideas now. Aasani sorts them later.</p>
        </div>

        {/* Input Box */}
        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4 mb-12 border border-gray-100 dark:border-gray-800">
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full text-base bg-transparent border-none focus:ring-0 resize-none max-h-40 min-h-[80px]"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
            />
            <div className="flex justify-between items-center mt-2 border-t border-gray-50 dark:border-gray-800 pt-3">
                <div className="flex items-center gap-1">
                    <button className="p-2 rounded-full text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"><Mic className="w-5 h-5"/></button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"><Paperclip className="w-5 h-5"/></button>
                    <input type="file" ref={fileInputRef} className="hidden" />
                </div>
                <button onClick={handleSubmit} disabled={!inputText.trim()} className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">Capture</button>
            </div>
        </div>

        {/* List Items */}
        <div className="w-full max-w-2xl space-y-6 pb-20">
            {items.filter(i => i.status === 'pending').map(item => {
                const result = item.processedResult;
                // Determine active tablets
                const isTask = result?.actionType === 'create_task' || result?.actionType === 'mixed';
                const isDoc = result?.actionType === 'create_document' || result?.actionType === 'mixed';
                const isEvent = !!result?.data.dueDate; // Rough heuristic

                return (
                    <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-5">
                            <div className="text-sm font-medium dark:text-white whitespace-pre-wrap">{item.content}</div>
                            
                            {/* Tablets Row */}
                            {result && (
                                <div className="flex gap-2 mt-4">
                                    <TypeBadge active={isTask} icon={CheckSquare} label="Task" />
                                    <TypeBadge active={isDoc} icon={FileText} label="Doc" />
                                    <TypeBadge active={isEvent} icon={Calendar} label="Event" />
                                </div>
                            )}

                            <div className="text-[10px] text-gray-400 mt-2 flex justify-between items-center">
                                <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                                {result && <span className="text-purple-500 font-bold flex items-center gap-1"><Sparkles className="w-3 h-3"/> Analyzed</span>}
                            </div>
                        </div>
                        
                        {/* Warning Banner */}
                        {item.processedResult?.warning && (
                            <div className="bg-orange-50 dark:bg-orange-900/20 px-5 py-2 text-xs font-bold text-orange-600 dark:text-orange-400 border-t border-orange-100 dark:border-orange-900/50 flex items-center gap-2">
                                <span className="text-lg">⚠️</span> {item.processedResult.warning}
                            </div>
                        )}

                        {/* Action Bar */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex justify-between items-center">
                            <button onClick={() => onDiscussItem && onDiscussItem(item)} className="text-xs font-bold text-gray-500 hover:text-purple-500 flex items-center gap-1 transition-colors"><MessageSquare className="w-3 h-3"/> Discuss</button>
                            <div className="flex gap-2">
                                <button onClick={() => onDeleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                                {!item.processedResult && (
                                    <button onClick={() => { 
                                        setProcessingId(item.id);
                                        // Trigger AI Analysis via parent or service (Simplified for UI view)
                                        // In real usage, this button triggers the `organizeInboxItem` flow
                                    }} disabled={processingId === item.id} className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-1 text-gray-700 dark:text-white transition-colors">
                                        {processingId === item.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} Analyze
                                    </button>
                                )}
                                {item.processedResult && (
                                    <button onClick={() => onProcessItem(item.id, item.processedResult!)} className="text-xs bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 rounded font-bold hover:opacity-90 transition-opacity">Confirm</button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};
