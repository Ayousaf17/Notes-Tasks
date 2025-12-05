
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ProjectPlan, Document, Task, Integration } from '../types';
import { Send, X, Bot, Paperclip, Loader2, Sparkles, User, ChevronDown, Lock } from 'lucide-react';
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
  integrations?: Integration[];
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
        elements.push(<h2 key={`h2-${i}`} className="text-base font-bold text-gray-900 dark:text-white mb-3 mt-6 pb-1 border-b border-gray-100 dark:border-gray-800">{parseInline(trimmed.replace('## ', ''), `h2-${i}`)}</h2>);
    } else {
        elements.push(<p key={`p-${i}`} className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">{parseInline(trimmed, `p-${i}`)}</p>);
    }
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
    integrations
}) => {
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openrouter'>('gemini');
    const [openRouterModel, setOpenRouterModel] = useState<string>('openai/gpt-4o');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isOpen, messages]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        // Ensure key exists if OpenRouter selected
        let apiKey: string | undefined = undefined;
        if (selectedProvider === 'openrouter') {
            const int = integrations?.find(i => i.id === 'openrouter');
            if (!int || !int.connected || !int.config?.apiKey) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'model',
                    text: "Please connect OpenRouter in Settings to use this model.",
                    timestamp: new Date()
                }]);
                return;
            }
            apiKey = int.config.apiKey;
        }

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            if (input.toLowerCase().includes('create project') || input.toLowerCase().includes('plan project')) {
               const plan = await geminiService.generateProjectPlan(input); // Gemini handles logic for simplicity
               if (plan) {
                   onProjectPlanCreated(plan);
                   setMessages(prev => [...prev, {
                       id: Date.now().toString(),
                       role: 'model',
                       text: `I've created a new project for you: "**${plan.projectTitle}**". Check your workspace.`,
                       timestamp: new Date()
                   }]);
                   setIsThinking(false);
                   return;
               }
            }

            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            let systemContext = "";
            if (contextData) systemContext += `Current Document Content:\n${contextData}\n\n`;
            
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
                attachments: [],
                systemContext
            });

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: responseText,
                timestamp: new Date()
            }]);

        } catch (error) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "I encountered an error processing that request.",
                timestamp: new Date()
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const getProviderLabel = () => {
        if (selectedProvider === 'gemini') return 'Aasani (Gemini)';
        if (openRouterModel.includes('gpt-4o')) return 'GPT-4o';
        if (openRouterModel.includes('claude')) return 'Claude 3.5';
        if (openRouterModel.includes('llama')) return 'Llama 3';
        return 'OpenRouter';
    };

    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
                    onClick={onClose}
                />
            )}
            
            <div className={`fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-white dark:bg-black border-l border-gray-100 dark:border-gray-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black">
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Sparkles className={`w-4 h-4 ${selectedProvider === 'gemini' ? 'text-purple-600' : 'text-green-500'}`} />
                            <span className="font-bold text-sm text-gray-900 dark:text-white">{getProviderLabel()}</span>
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>

                        {/* Model Dropdown */}
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden z-50 hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-1">
                                <button 
                                    onClick={() => setSelectedProvider('gemini')} 
                                    className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center justify-between group/item"
                                >
                                    <span>Aasani (Gemini)</span>
                                    {selectedProvider === 'gemini' && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                                </button>
                                
                                <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                                <div className="px-3 py-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">OpenRouter</div>

                                {integrations?.find(i => i.id === 'openrouter')?.connected ? (
                                    <>
                                        <button 
                                            onClick={() => { setSelectedProvider('openrouter'); setOpenRouterModel('openai/gpt-4o'); }} 
                                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center justify-between"
                                        >
                                            <span>GPT-4o</span>
                                            {selectedProvider === 'openrouter' && openRouterModel.includes('gpt-4o') && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedProvider('openrouter'); setOpenRouterModel('anthropic/claude-3.5-sonnet'); }} 
                                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center justify-between"
                                        >
                                            <span>Claude 3.5 Sonnet</span>
                                            {selectedProvider === 'openrouter' && openRouterModel.includes('claude') && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedProvider('openrouter'); setOpenRouterModel('meta-llama/llama-3-70b-instruct'); }} 
                                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center justify-between"
                                        >
                                            <span>Llama 3 70B</span>
                                            {selectedProvider === 'openrouter' && openRouterModel.includes('llama') && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                                        </button>
                                    </>
                                ) : (
                                    <div className="px-3 py-2 text-xs text-gray-400 italic flex items-center gap-2">
                                        <Lock className="w-3 h-3" /> Connect in Settings
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900/50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-black dark:bg-white text-white dark:text-black rounded-tr-sm' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-tl-sm'}`}>
                                <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] uppercase font-bold tracking-wider">
                                    {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                    {msg.role === 'user' ? 'You' : 'Aasani'}
                                </div>
                                <div className={`text-sm leading-relaxed ${msg.role === 'user' ? '' : 'markdown-body'}`}>
                                    {msg.role === 'user' ? msg.text : <FormattedMessage text={msg.text} />}
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

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black">
                    <div className="relative flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <Paperclip className="w-5 h-5" />
                        </button>
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
                            disabled={!input.trim() || isThinking}
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
