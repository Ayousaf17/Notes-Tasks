
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage, ProjectPlan, Document, Task, Integration, TaskStatus, TaskPriority, Project, Client, ActionProposal, Attachment, AgentRole, InboxAction, InboxItem } from '../types';
import { Send, X, Bot, Paperclip, Loader2, Sparkles, User, ChevronDown, Lock, Settings, Search, CheckCircle2, Calendar, Briefcase, Flag, Plus, File, Folder, Layers, ArrowRight, Eye, Target } from 'lucide-react';
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
  projects: Project[]; 
  clients: Client[];   
  teamMembers: string[]; 
  integrations?: Integration[];
  onAddTask?: (task: Partial<Task>) => void; // Legacy
  onSaveToInbox?: (item: InboxItem) => void;
  onExecuteAction?: (id: string, action: InboxAction) => void;
}

interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
}

// Unified Proposal Card for Tasks, Docs, Projects, Clients
const ProposalCard = ({ 
    proposal, 
    onConfirm, 
    onSaveToInbox,
    onCancel 
}: { 
    proposal: ActionProposal, 
    onConfirm: (action: InboxAction) => void,
    onSaveToInbox: (action: InboxAction) => void,
    onCancel: () => void
}) => {
    const { action } = proposal;
    const [isConfirmed, setIsConfirmed] = useState(proposal.status === 'confirmed');
    const [isSaved, setIsSaved] = useState(proposal.status === 'saved');

    if (isConfirmed) {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
                <div className="bg-green-500 rounded-full p-1 text-white"><CheckCircle2 className="w-4 h-4" /></div>
                <div>
                    <div className="text-sm font-bold text-green-800 dark:text-green-300">Action Completed</div>
                    <div className="text-xs text-green-700 dark:text-green-400">{action.data.title}</div>
                </div>
            </div>
        );
    }

    if (isSaved) {
        return (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
                <div className="bg-blue-500 rounded-full p-1 text-white"><Folder className="w-4 h-4" /></div>
                <div>
                    <div className="text-sm font-bold text-blue-800 dark:text-blue-300">Saved to Inbox</div>
                    <div className="text-xs text-blue-700 dark:text-blue-400">Review later</div>
                </div>
            </div>
        );
    }

    if (proposal.status === 'cancelled') {
        return (
            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs text-gray-500 italic text-center">
                Action Cancelled
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden my-4 animate-in slide-in-from-bottom-2">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 border-b border-purple-100 dark:border-purple-800/50 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                    {action.actionType.replace('create_', '').toUpperCase()} PROPOSAL
                </span>
            </div>
            
            <div className="p-4 space-y-3">
                <div className="font-bold text-sm text-gray-900 dark:text-white">{action.data.title}</div>
                
                {action.data.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{action.data.description}</div>
                )}

                {/* Sub-Items Preview */}
                {action.data.extractedTasks && action.data.extractedTasks.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                        <Layers className="w-3 h-3" />
                        <span>Includes {action.data.extractedTasks.length} sub-tasks</span>
                    </div>
                )}

                {/* Client Details Preview */}
                {action.actionType === 'create_client' && action.data.clientData && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Company:</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{action.data.clientData.company}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Value:</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">${action.data.clientData.value}</span>
                        </div>
                    </div>
                )}

                <div className="text-[10px] text-gray-400 mt-2 italic">
                    Reason: {action.reasoning}
                </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-between gap-2">
                <button 
                    onClick={onCancel}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setIsSaved(true); onSaveToInbox(action); }}
                        className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        Save to Inbox
                    </button>
                    <button 
                        onClick={() => { setIsConfirmed(true); onConfirm(action); }}
                        className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                        Create Now <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ... FormattedMessage (No changes needed)
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  // Hide tool calls from raw text
  const cleanText = text.replace(/:::TOOL_CALL:::[\s\S]*?:::END_TOOL_CALL:::/g, '').trim();
  if (!cleanText) return null;

  const lines = cleanText.split('\n');
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
        currentListItems.push(<li key={`li-${i}`} className="pl-1">{parseInline(olMatch[2], `li-${i}`)}</li>);
        return;
    }
    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
        if (currentListType !== 'ul') flushList();
        currentListType = 'ul';
        currentListItems.push(<li key={`li-${i}`} className="pl-1">{parseInline(ulMatch[1], `li-${i}`)}</li>);
        return;
    }
    flushList();
    if (trimmed.startsWith('### ')) elements.push(<h3 key={`h3-${i}`} className="text-sm font-bold text-gray-900 dark:text-white mb-2 mt-6">{parseInline(trimmed.replace('### ', ''), `h3-${i}`)}</h3>);
    else if (trimmed.startsWith('## ')) elements.push(<h2 key={`h2-${i}`} className="text-base font-bold text-gray-900 dark:text-white mb-3 mt-6 pb-1 border-b border-gray-100 dark:border-gray-800">{parseInline(trimmed.replace('## ', ''), `h2-${i}`)}</h2>);
    else elements.push(<p key={`p-${i}`} className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">{parseInline(trimmed, `p-${i}`)}</p>);
  });
  flushList();
  return <div>{elements}</div>;
};

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({
    isOpen,
    onClose,
    contextData,
    onProjectPlanCreated,
    messages,
    setMessages,
    allDocuments,
    allTasks,
    projects,
    clients,
    teamMembers,
    integrations,
    onAddTask,
    onSaveToInbox,
    onExecuteAction
}) => {
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openrouter'>('gemini');
    const [openRouterModel, setOpenRouterModel] = useState<string>('openai/gpt-4o');
    const [isCustomModel, setIsCustomModel] = useState(false);
    
    // Attachments State
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Model Fetching State
    const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [modelSearchQuery, setModelSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isOpen, messages]);

    // Fetch OpenRouter Models
    useEffect(() => {
        const fetchModels = async () => {
            if (availableModels.length > 0) return;
            setIsLoadingModels(true);
            try {
                const response = await fetch('https://openrouter.ai/api/v1/models');
                const data = await response.json();
                if (data.data && Array.isArray(data.data)) {
                    const sorted = data.data.sort((a: OpenRouterModel, b: OpenRouterModel) => a.name.localeCompare(b.name));
                    setAvailableModels(sorted);
                } else {
                    throw new Error("Invalid model data format");
                }
            } catch (error) {
                console.error("Failed to fetch models", error);
                setAvailableModels([
                    { id: 'openai/gpt-4o', name: 'GPT-4o' },
                    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
                    { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B' },
                    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
                ]);
            } finally {
                setIsLoadingModels(false);
            }
        };
        if (isOpen && integrations?.find(i => i.id === 'openrouter')?.connected) fetchModels();
    }, [isOpen, integrations]);

    const filteredModels = useMemo(() => {
        if (!modelSearchQuery) return availableModels;
        return availableModels.filter(m => 
            m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) || 
            m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())
        );
    }, [availableModels, modelSearchQuery]);

    // Parse Tool Calls from Response
    const parseResponseForTools = (response: string): { text: string, proposal?: ActionProposal } => {
        const toolRegex = /:::TOOL_CALL:::([\s\S]*?):::END_TOOL_CALL:::/;
        const match = response.match(toolRegex);
        
        let proposal: ActionProposal | undefined = undefined;

        if (match && match[1]) {
            try {
                const toolJson = JSON.parse(match[1]);
                if (toolJson.tool === 'propose_import') {
                    // Smart Matching Logic: Try to find ID for project/client names if AI sent strings
                    let matchedProjectId = toolJson.args.targetProjectId;
                    if (!matchedProjectId || matchedProjectId === 'default') {
                        matchedProjectId = projects[0]?.id || 'default';
                    }

                    proposal = {
                        action: {
                            actionType: toolJson.args.actionType,
                            targetProjectId: matchedProjectId,
                            data: toolJson.args.data,
                            reasoning: toolJson.args.reasoning
                        },
                        status: 'proposed',
                        originalToolCall: match[0]
                    };
                }
            } catch (e) {
                console.error("Failed to parse tool call", e);
            }
        }
        
        return { text: response, proposal };
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = (reader.result as string).split(',')[1];
                const newAttachment: Attachment = {
                    mimeType: file.type,
                    data: base64String,
                    name: file.name
                };
                setAttachments(prev => [...prev, newAttachment]);
            };
            reader.readAsDataURL(file);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendMessage = async () => {
        if (!input.trim() && attachments.length === 0) return;

        let apiKey: string | undefined = undefined;
        if (selectedProvider === 'openrouter') {
            const int = integrations?.find(i => i.id === 'openrouter');
            if (!int || !int.connected || !int.config?.apiKey) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Please connect OpenRouter in Settings to use this model.", timestamp: new Date() }]);
                return;
            }
            apiKey = int.config.apiKey;
        }

        const userMsg: ChatMessage = { 
            id: Date.now().toString(), 
            role: 'user', 
            text: input, 
            timestamp: new Date(),
            attachments: [...attachments] // Store copy
        };
        
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setAttachments([]); // Clear attachments after send
        setIsThinking(true);

        try {
            const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
            
            // CONTEXT BUILDING
            let systemContext = `Current Date: ${new Date().toDateString()}\n\nAVAILABLE PROJECTS:\n${projects.map(p => `- ${p.title} (ID: ${p.id})`).join('\n')}\n\nAVAILABLE CLIENTS:\n${clients.map(c => `- ${c.company} (ID: ${c.id})`).join('\n')}\n\nTEAM:\n${teamMembers.join(', ')}\n\n`;
            
            if (contextData) systemContext += `Current Context:\n${contextData}\n\n`;
            if (input.length > 10) {
                 const relevant = await geminiService.findRelevantContext(input, allDocuments, allTasks);
                 if (relevant.text) systemContext += `Relevant Workspace Information:\n${relevant.text}\n\n`;
            }

            const responseText = await geminiService.chatWithProvider({
                provider: selectedProvider,
                apiKey: apiKey,
                model: openRouterModel,
                history,
                message: input,
                attachments: userMsg.attachments || [],
                systemContext
            });

            // Process any tools found in response
            const { text, proposal } = parseResponseForTools(responseText);

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: text, 
                actionProposal: proposal,
                timestamp: new Date()
            }]);

        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I encountered an error processing that request.", timestamp: new Date() }]);
        } finally {
            setIsThinking(false);
        }
    };

    const updateProposalStatus = (messageId: string, status: 'confirmed' | 'cancelled' | 'saved') => {
        setMessages(prev => prev.map(m => {
            if (m.id === messageId && m.actionProposal) {
                return { ...m, actionProposal: { ...m.actionProposal, status } };
            }
            return m;
        }));
    };

    const getProviderLabel = () => {
        if (selectedProvider === 'gemini') return 'Aasani (Gemini)';
        const model = availableModels.find(m => m.id === openRouterModel);
        if (model) return model.name;
        if (isCustomModel) return openRouterModel.split('/')[1] || 'Custom Model';
        return openRouterModel.split('/')[1] || 'OpenRouter';
    };

    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
                    onClick={onClose}
                />
            )}
            
            <div className={`fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-white dark:bg-black border-l border-gray-100 dark:border-gray-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col h-[100dvh] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black shrink-0">
                    <div className="relative group">
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Sparkles className={`w-4 h-4 ${selectedProvider === 'gemini' ? 'text-purple-600' : 'text-green-500'}`} />
                            <span className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[150px] md:max-w-[200px]">{getProviderLabel()}</span>
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>

                        {/* Dropdown Backdrop */}
                        {isDropdownOpen && (
                            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                        )}

                        {/* Model Dropdown */}
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[400px]">
                                <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                    <button 
                                        onClick={() => { setSelectedProvider('gemini'); setIsCustomModel(false); setIsDropdownOpen(false); }} 
                                        className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-white dark:hover:bg-gray-800 rounded-lg flex items-center justify-between group/item border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-3 h-3 text-purple-600" />
                                            <span>Aasani (Gemini)</span>
                                        </div>
                                        {selectedProvider === 'gemini' && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                                    </button>
                                </div>

                                {integrations?.find(i => i.id === 'openrouter')?.connected ? (
                                    <>
                                        <div className="p-2 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2 w-3 h-3 text-gray-400" />
                                                <input 
                                                    type="text" 
                                                    autoFocus
                                                    value={modelSearchQuery}
                                                    onChange={(e) => setModelSearchQuery(e.target.value)}
                                                    placeholder="Search models (e.g. Llama, Claude)"
                                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-purple-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-1">
                                            {isLoadingModels && <div className="flex items-center justify-center py-4 text-xs text-gray-400 gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Fetching list...</div>}
                                            {!isLoadingModels && filteredModels.length === 0 && <div className="py-4 text-center text-xs text-gray-400">No models found.</div>}
                                            {filteredModels.map(model => (
                                                <button 
                                                    key={model.id}
                                                    onClick={() => { setSelectedProvider('openrouter'); setOpenRouterModel(model.id); setIsCustomModel(false); setIsDropdownOpen(false); }} 
                                                    className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center justify-between"
                                                >
                                                    <span className="truncate pr-2">{model.name}</span>
                                                    {selectedProvider === 'openrouter' && openRouterModel === model.id && <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                            <button 
                                                onClick={() => { setSelectedProvider('openrouter'); setIsCustomModel(true); setIsDropdownOpen(false); }} 
                                                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-white dark:hover:bg-gray-800 rounded-lg flex items-center justify-between text-blue-500"
                                            >
                                                <div className="flex items-center gap-2"><Settings className="w-3 h-3" /><span>Enter Custom Model ID</span></div>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-4 text-center">
                                        <div className="text-xs text-gray-400 mb-2 flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> OpenRouter Locked</div>
                                        <div className="text-[10px] text-gray-500">Connect OpenRouter in Settings to access 100+ models.</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
                </div>

                {isCustomModel && (
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5">
                            <Settings className="w-3 h-3 text-gray-400" />
                            <input 
                                type="text" 
                                value={openRouterModel}
                                onChange={(e) => setOpenRouterModel(e.target.value)}
                                placeholder="e.g. mistralai/mistral-large"
                                className="flex-1 text-xs bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                )}

                {/* CONTEXT HUD (HEADS UP DISPLAY) - Visual cue for user */}
                {contextData && contextData.includes('FOCUS: Analyzing Inbox Item') && (
                    <div className="bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-800/30 px-4 py-2 flex items-center gap-2">
                        <Target className="w-3 h-3 text-purple-600 dark:text-purple-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                            Focus Mode: Inbox Handoff
                        </span>
                    </div>
                )}
                {contextData && !contextData.includes('FOCUS: Analyzing Inbox Item') && contextData.length > 5 && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800/30 px-4 py-2 flex items-center gap-2">
                        <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                            Context Aware
                        </span>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900/50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-black dark:bg-white text-white dark:text-black rounded-tr-sm' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-tl-sm'}`}>
                                <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] uppercase font-bold tracking-wider">
                                    {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                    {msg.role === 'user' ? 'You' : 'Aasani'}
                                </div>
                                <div className={`text-sm leading-relaxed ${msg.role === 'user' ? '' : 'markdown-body'}`}>
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="mb-2 flex flex-wrap gap-2">
                                            {msg.attachments.map((att, idx) => (
                                                <div key={idx} className="bg-white/20 dark:bg-black/20 p-1.5 rounded-md flex items-center gap-2 text-xs">
                                                    <File className="w-3 h-3" />
                                                    <span className="truncate max-w-[150px]">{att.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <FormattedMessage text={msg.text} />
                                    {/* Action Proposal Widget */}
                                    {msg.actionProposal && (
                                        <ProposalCard 
                                            proposal={msg.actionProposal}
                                            onConfirm={(action) => {
                                                const dummyId = crypto.randomUUID(); // Temp ID for passing to existing handler logic
                                                if(onExecuteAction) onExecuteAction(dummyId, action);
                                                updateProposalStatus(msg.id, 'confirmed');
                                            }}
                                            onSaveToInbox={(action) => {
                                                const newItem: InboxItem = {
                                                    id: crypto.randomUUID(),
                                                    content: action.data.title,
                                                    type: 'text',
                                                    status: 'pending',
                                                    createdAt: new Date(),
                                                    processedResult: action
                                                };
                                                if(onSaveToInbox) onSaveToInbox(newItem);
                                                updateProposalStatus(msg.id, 'saved');
                                            }}
                                            onCancel={() => updateProposalStatus(msg.id, 'cancelled')}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                <span className="text-xs text-gray-500 font-medium">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black shrink-0 pb-safe">
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {attachments.map((att, idx) => (
                                <div key={idx} className="bg-gray-100 dark:bg-gray-800 pl-3 pr-2 py-1.5 rounded-lg flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                    <File className="w-3 h-3 text-blue-500" />
                                    <span className="truncate max-w-[150px]">{att.name}</span>
                                    <button onClick={() => removeAttachment(idx)} className="hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="relative flex items-center gap-2">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={`Ask ${getProviderLabel()}...`}
                            className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none text-gray-900 dark:text-white"
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={(!input.trim() && attachments.length === 0) || isThinking}
                            className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
