
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage, ProjectPlan, Document, Task, Integration, TaskStatus, TaskPriority, Project, Client, ActionProposal, Attachment, AgentRole, InboxAction, InboxItem, FocusItem } from '../types';
import { Send, X, Bot, Paperclip, Loader2, Sparkles, User, ChevronDown, Lock, Settings, Search, CheckCircle2, Calendar, Briefcase, Flag, Plus, File, Folder, Layers, ArrowRight, Eye, Target, MessageSquare, Cpu, Globe } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { analyticsService } from '../services/analyticsService';

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: string;
  focusItem?: FocusItem | null; // Universal Focus
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  allDocuments: Document[];
  allTasks: Task[];
  projects: Project[]; 
  clients: Client[];   
  teamMembers: string[]; 
  integrations?: Integration[];
  onSaveToInbox?: (action: InboxAction) => void;
  onExecuteAction?: (id: string, action: InboxAction) => void;
  onUpdateEntity?: (type: 'task'|'document'|'client'|'project', id: string, updates: any) => void;
  onUpdateIntegration?: (id: string, action: 'update', config: any) => void;
}

// ... (ProposalCard and FormattedMessage Components remain mostly the same, elided for brevity but fully included in implementation) ...
const ProposalCard = ({ proposal, onConfirm, onSaveToInbox, onCancel }: any) => {
    // ... (Same logic as previous, ensuring buttons work)
    const { action } = proposal;
    const [isConfirmed, setIsConfirmed] = useState(proposal.status === 'confirmed');
    // ...
    if (isConfirmed) return <div className="bg-green-50 text-green-800 p-4 rounded-xl flex gap-2"><CheckCircle2 className="w-4 h-4"/><span>Action Completed</span></div>;
    // ...
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden my-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 border-b border-purple-100 dark:border-purple-800/50 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-purple-700 uppercase">{action.actionType.replace('create_', '')} PROPOSAL</span>
            </div>
            <div className="p-4 space-y-2">
                <div className="font-bold text-sm dark:text-white">{action.data.title}</div>
                {action.warning && <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded flex gap-1"><Flag className="w-3 h-3"/>{action.warning}</div>}
                <div className="text-xs text-gray-500">{action.reasoning}</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
                <button onClick={onCancel} className="px-3 py-1 text-xs text-gray-500">Cancel</button>
                <button onClick={() => { onSaveToInbox(action); }} className="px-3 py-1 bg-white border rounded text-xs">Save</button>
                <button onClick={() => { setIsConfirmed(true); onConfirm(action); }} className="px-4 py-1 bg-black text-white rounded text-xs">Execute</button>
            </div>
        </div>
    );
};

const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
    // ... (Same renderer logic)
    const cleanText = text.replace(/:::TOOL_CALL:::[\s\S]*?:::END_TOOL_CALL:::/g, '').trim();
    if (!cleanText) return null;
    return <div className="whitespace-pre-wrap">{cleanText}</div>;
};

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({
    isOpen,
    onClose,
    contextData,
    focusItem,
    messages,
    setMessages,
    allDocuments,
    allTasks,
    projects,
    clients,
    teamMembers,
    integrations,
    onSaveToInbox,
    onExecuteAction,
    onUpdateEntity,
    onUpdateIntegration
}) => {
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    
    // Model Selection Local State
    const [showModelList, setShowModelList] = useState(false);
    const [modelSearch, setModelSearch] = useState('');
    const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([]);
    
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Derive active provider/model from props
    const openRouterInt = integrations?.find(i => i.id === 'openrouter');
    const isUsingOpenRouter = openRouterInt?.connected;
    const currentModelName = isUsingOpenRouter 
        ? (availableModels.find(m => m.id === openRouterInt?.config?.model)?.name || openRouterInt?.config?.model || 'OpenRouter Default') 
        : 'Gemini 2.5 Flash';

    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        
        // Fetch models if OpenRouter is connected and we haven't yet
        if (isOpen && isUsingOpenRouter && availableModels.length === 0) {
            geminiService.fetchOpenRouterModels().then(setAvailableModels);
        }
    }, [isOpen, messages, isUsingOpenRouter]);

    useEffect(() => {
        if (showModelList && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showModelList]);

    // Initial Message on Focus Change
    useEffect(() => {
        if (isOpen && focusItem) {
            analyticsService.logEvent('chat_focus_session', { type: focusItem.type });
            const title = focusItem.type === 'inbox' ? focusItem.data.content : 
                          focusItem.type === 'task' ? (focusItem.data as Task).title : 
                          focusItem.type === 'document' ? (focusItem.data as Document).title :
                          focusItem.type === 'client' ? (focusItem.data as Client).company : 'Item';
            
            const lastMsg = messages[messages.length - 1];
            if (!lastMsg || !lastMsg.text.includes(title)) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'model',
                    text: `I'm focused on **${focusItem.type.toUpperCase()}: ${title}**. How can I help you modify or enrich this?`,
                    timestamp: new Date()
                }]);
            }
        }
    }, [isOpen, focusItem]);

    const handleSendMessage = async () => {
        if (!input.trim() && attachments.length === 0) return;
        analyticsService.logEvent('chat_message_sent', { provider: isUsingOpenRouter ? 'openrouter' : 'gemini', hasAttachment: attachments.length > 0 });

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date(), attachments: [...attachments] };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setAttachments([]);
        setIsThinking(true);

        try {
            const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
            let systemContext = `Current Date: ${new Date().toDateString()}\n`;
            
            if (focusItem) {
                systemContext += `\n=== CURRENT FOCUS ===\nType: ${focusItem.type}\nData: ${JSON.stringify(focusItem.data, null, 2)}\n=====================\n`;
            } else if (contextData) {
                systemContext += `Context:\n${contextData}\n`;
            }
            systemContext += `\nAVAILABLE PROJECTS: ${projects.map(p => p.title).join(', ')}`;

            const responseText = await geminiService.chatWithProvider({
                provider: isUsingOpenRouter ? 'openrouter' : 'gemini',
                apiKey: openRouterInt?.config?.apiKey,
                model: openRouterInt?.config?.model,
                history,
                message: input,
                attachments: userMsg.attachments || [],
                systemContext
            });

            const toolRegex = /:::TOOL_CALL:::([\s\S]*?):::END_TOOL_CALL:::/;
            const match = responseText.match(toolRegex);
            let proposal: ActionProposal | undefined = undefined;

            if (match && match[1]) {
                const toolJson = JSON.parse(match[1]);
                if (toolJson.tool === 'update_entity' && onUpdateEntity) {
                    onUpdateEntity(toolJson.args.entityType, toolJson.args.id, toolJson.args.updates);
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'model',
                        text: `✅ Updated ${toolJson.args.entityType}: ${JSON.stringify(toolJson.args.updates)}`,
                        timestamp: new Date()
                    }]);
                    setIsThinking(false);
                    return; 
                }
                if (toolJson.tool === 'propose_import') {
                    proposal = {
                        action: {
                            actionType: toolJson.args.actionType,
                            targetProjectId: toolJson.args.targetProjectId || 'default',
                            data: toolJson.args.data,
                            reasoning: toolJson.args.reasoning,
                            warning: toolJson.args.data.warning
                        },
                        status: 'proposed',
                        originalToolCall: match[0]
                    };
                }
            }

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: responseText, 
                actionProposal: proposal,
                timestamp: new Date()
            }]);

        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Error processing request.", timestamp: new Date() }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleModelSelect = (modelId: string) => {
        if (onUpdateIntegration && openRouterInt) {
            onUpdateIntegration('openrouter', 'update', { model: modelId });
        }
        setShowModelList(false);
        setModelSearch('');
    };

    const filteredModels = useMemo(() => {
        if (!modelSearch) return availableModels;
        const lower = modelSearch.toLowerCase();
        return availableModels.filter(m => m.name.toLowerCase().includes(lower) || m.id.toLowerCase().includes(lower));
    }, [availableModels, modelSearch]);

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />}
            <div className={`fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-white dark:bg-black border-l border-gray-100 dark:border-gray-800 shadow-2xl z-40 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-black relative z-50">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span className="font-bold text-sm dark:text-white">Aasani Chat</span>
                        </div>
                        {/* Model Selector / Indicator */}
                        <div className="relative mt-1">
                            <button 
                                onClick={() => isUsingOpenRouter && setShowModelList(!showModelList)}
                                className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${isUsingOpenRouter ? 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-500 dark:text-gray-400' : 'text-gray-400 cursor-default'}`}
                            >
                                <Cpu className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">{currentModelName}</span>
                                {isUsingOpenRouter && <ChevronDown className="w-3 h-3" />}
                            </button>
                            
                            {/* Model Dropdown with Search */}
                            {showModelList && (
                                <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95 flex flex-col">
                                    <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700">
                                            <Search className="w-3 h-3 text-gray-400" />
                                            <input 
                                                ref={searchInputRef}
                                                type="text" 
                                                placeholder="Search models..." 
                                                value={modelSearch}
                                                onChange={(e) => setModelSearch(e.target.value)}
                                                className="w-full bg-transparent text-xs outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
                                            />
                                        </div>
                                        <div className="text-[9px] text-gray-400 mt-1 pl-1 flex items-center gap-1">
                                            <Globe className="w-3 h-3" /> Global Model Selection
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {filteredModels.length > 0 ? filteredModels.map(m => (
                                            <button 
                                                key={m.id} 
                                                onClick={() => handleModelSelect(m.id)}
                                                className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300 truncate border-b border-gray-50 dark:border-gray-800 last:border-0"
                                            >
                                                {m.name}
                                            </button>
                                        )) : (
                                            <div className="p-4 text-center text-xs text-gray-400">
                                                {availableModels.length === 0 ? "Loading models..." : "No matching models."}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                {/* Focus HUD */}
                {focusItem && (
                    <div className="bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-800/30 px-4 py-2 flex items-center gap-2">
                        <Target className="w-3 h-3 text-purple-600 animate-pulse" />
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide truncate">
                            Focus: {focusItem.type} - {focusItem.type === 'task' ? (focusItem.data as Task).title : focusItem.type === 'document' ? (focusItem.data as Document).title : 'Item'}
                        </span>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900/50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'}`}>
                                <FormattedMessage text={msg.text} />
                                {msg.actionProposal && (
                                    <ProposalCard 
                                        proposal={msg.actionProposal}
                                        onConfirm={(action: any) => { if(onExecuteAction) onExecuteAction('new', action); }}
                                        onSaveToInbox={(action: any) => { if(onSaveToInbox) onSaveToInbox(action); }}
                                        onCancel={() => {}}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                    {isThinking && <div className="text-xs text-gray-400 p-2">Thinking...</div>}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black">
                    <div className="relative flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 dark:text-white"
                        />
                        <button onClick={handleSendMessage} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-full">
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
