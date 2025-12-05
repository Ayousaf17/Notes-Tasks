import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InboxItem, Project, InboxAction, Integration, TaskPriority, TaskStatus, Task, Attachment, AgentRole } from '../types';
import { Mic, Sparkles, Archive, Loader2, CheckCircle, FileText, Trash2, StopCircle, Paperclip, X, Check, ArrowRight, ChevronDown, Layers, CheckCircle2, Bot, Search, Lock, Settings, User, Calendar, CheckSquare, File, Tag, Flag } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface InboxViewProps {
  items: InboxItem[];
  onAddItem: (content: string, type: 'text' | 'audio' | 'file', fileName?: string, attachments?: Attachment[]) => void;
  onProcessItem: (itemId: string, action: InboxAction) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem?: (itemId: string, updates: Partial<InboxItem>) => void; 
  projects: Project[];
  integrations?: Integration[];
}

interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
}

export const InboxView: React.FC<InboxViewProps> = ({ 
    items, 
    onAddItem, 
    onProcessItem, 
    onDeleteItem,
    onUpdateItem,
    projects,
    integrations
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Model Selection
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [openRouterModel, setOpenRouterModel] = useState('openai/gpt-4o');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);

  // Model Fetching State
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  // Ref for audio & file
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- MODEL FETCHING ---
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
        if (showModelDropdown && integrations?.find(i => i.id === 'openrouter')?.connected) fetchModels();
  }, [showModelDropdown, integrations]);

  const filteredModels = useMemo(() => {
      if (!modelSearchQuery) return availableModels;
      return availableModels.filter(m => 
          m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) || 
          m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())
      );
  }, [availableModels, modelSearchQuery]);

  // --- Handlers ---

  const handleSubmit = () => {
      if (!inputText.trim()) return;
      onAddItem(inputText, 'text');
      setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
      }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        onAddItem("🎤 Voice Note (Transcription would appear here in production...)", 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
      alert("Microphone access needed.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          const reader = new FileReader();
          reader.onload = () => {
              const base64String = (reader.result as string).split(',')[1];
              const attachment: Attachment = {
                  mimeType: file.type,
                  data: base64String,
                  name: file.name
              };
              onAddItem(`Attached: ${file.name}`, 'file', file.name, [attachment]);
          };
          reader.readAsDataURL(file);

          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleMagicSort = async (item: InboxItem) => {
      setProcessingId(item.id);
      
      let apiKey: string | undefined = undefined;
      if (selectedProvider === 'openrouter') {
          const int = integrations?.find(i => i.id === 'openrouter');
          if (int && int.connected && int.config?.apiKey) {
              apiKey = int.config.apiKey;
          } else {
              console.warn("OpenRouter key missing, falling back to Gemini");
          }
      }

      const result = await geminiService.organizeInboxItem(
          item.content, 
          projects, 
          selectedProvider, 
          apiKey, 
          openRouterModel,
          item.attachments || [] 
      );

      // Force default assignee to AI Writer if result doesn't have one or is Unassigned
      if (result) {
          if (result.actionType === 'create_task' && !result.data.extractedTasks) {
              result.data.extractedTasks = [{
                  title: result.data.title,
                  description: result.data.description,
                  priority: result.data.priority || TaskPriority.MEDIUM,
                  assignee: AgentRole.WRITER,
                  dueDate: undefined
              }];
          } else if (result.data.extractedTasks) {
              result.data.extractedTasks = result.data.extractedTasks.map(t => ({
                  ...t,
                  assignee: t.assignee === 'Unassigned' ? AgentRole.WRITER : t.assignee
              }));
          }
      }

      if (result && onUpdateItem) {
          onUpdateItem(item.id, { processedResult: result });
      } else if (result) {
          onProcessItem(item.id, result);
      }
      setProcessingId(null);
  };

  const handleUpdateActionData = (itemId: string, newData: any) => {
      if (onUpdateItem) {
          const item = items.find(i => i.id === itemId);
          if (item && item.processedResult) {
              onUpdateItem(itemId, { 
                  processedResult: { ...item.processedResult, data: { ...item.processedResult.data, ...newData } } 
              });
          }
      }
  };

  const handleUpdateExtractedTask = (itemId: string, taskIndex: number, taskUpdates: any) => {
      if (onUpdateItem) {
          const item = items.find(i => i.id === itemId);
          if (item && item.processedResult && item.processedResult.data.extractedTasks) {
              const newTasks = [...item.processedResult.data.extractedTasks];
              newTasks[taskIndex] = { ...newTasks[taskIndex], ...taskUpdates };
              
              onUpdateItem(itemId, {
                  processedResult: {
                      ...item.processedResult,
                      data: {
                          ...item.processedResult.data,
                          extractedTasks: newTasks
                      }
                  }
              });
          }
      }
  };

  const handleDeleteExtractedTask = (itemId: string, taskIndex: number) => {
      if (onUpdateItem) {
          const item = items.find(i => i.id === itemId);
          if (item && item.processedResult && item.processedResult.data.extractedTasks) {
              const newTasks = item.processedResult.data.extractedTasks.filter((_, idx) => idx !== taskIndex);
              onUpdateItem(itemId, {
                  processedResult: {
                      ...item.processedResult,
                      data: {
                          ...item.processedResult.data,
                          extractedTasks: newTasks
                      }
                  }
              });
          }
      }
  };

  const getProviderLabel = () => {
        if (selectedProvider === 'gemini') return 'Aasani (Gemini)';
        const model = availableModels.find(m => m.id === openRouterModel);
        if (model) return model.name;
        if (isCustomModel) return openRouterModel.split('/')[1] || 'Custom Model';
        return openRouterModel.split('/')[1] || 'OpenRouter';
  };

  return (
    <div className="flex-1 h-full bg-gray-50 dark:bg-black flex flex-col items-center p-4 md:p-8 overflow-y-auto font-sans transition-colors duration-200">
        
        {/* Header */}
        <div className="w-full max-w-2xl mb-8 mt-4 md:mt-0 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Brain Dump</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Capture ideas now. Aasani sorts them later.</p>
            
            {/* Model Selector for Inbox */}
            <div className="absolute top-0 right-0 md:relative md:top-auto md:right-auto md:mt-4 flex justify-center">
                <div className="relative group">
                    <button 
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-purple-400 transition-colors shadow-sm"
                    >
                        <Bot className={`w-3.5 h-3.5 ${selectedProvider === 'gemini' ? 'text-purple-500' : 'text-green-500'}`} />
                        <span className="truncate max-w-[150px]">{getProviderLabel()}</span>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>
                    
                    {/* Dropdown Backdrop */}
                    {showModelDropdown && (
                        <div className="fixed inset-0 z-40" onClick={() => setShowModelDropdown(false)}></div>
                    )}

                    {/* Model Dropdown */}
                    {showModelDropdown && (
                        <div className="absolute top-full right-0 md:left-1/2 md:-translate-x-1/2 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden text-left animate-in zoom-in-95 flex flex-col max-h-[400px]">
                            {/* ... Content ... */}
                            <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                <button onClick={() => { setSelectedProvider('gemini'); setIsCustomModel(false); setShowModelDropdown(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-white dark:hover:bg-gray-800 rounded-lg flex items-center justify-between group/item border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-3 h-3 text-purple-600" />
                                        <span>Aasani (Gemini)</span>
                                    </div>
                                    {selectedProvider === 'gemini' && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                                </button>
                            </div>
                            {/* ... OpenRouter List ... */}
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
                                                placeholder="Search models..."
                                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-purple-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-1">
                                        {filteredModels.map(model => (
                                            <button 
                                                key={model.id}
                                                onClick={() => { setSelectedProvider('openrouter'); setOpenRouterModel(model.id); setIsCustomModel(false); setShowModelDropdown(false); }} 
                                                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center justify-between"
                                            >
                                                <span className="truncate pr-2">{model.name}</span>
                                                {selectedProvider === 'openrouter' && openRouterModel === model.id && <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Input Box */}
        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/50 p-4 mb-12 border border-gray-100 dark:border-gray-800 transition-all focus-within:ring-2 focus-within:ring-black/5 dark:focus-within:ring-white/10 relative animate-in fade-in zoom-in-95 duration-300">
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind? (Paste content, attach files...)"
                className="w-full text-base md:text-lg text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 border-none focus:ring-0 resize-none max-h-40 min-h-[80px] bg-transparent"
                rows={2}
            />
            <div className="flex justify-between items-center mt-2 border-t border-gray-50 dark:border-gray-800 pt-3">
                <div className="flex items-center gap-1">
                    <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-50 text-red-500 animate-pulse' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                </div>
                <button 
                    onClick={handleSubmit}
                    disabled={!inputText.trim()}
                    className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    Capture
                </button>
            </div>
        </div>

        {/* List of Items */}
        <div className="w-full max-w-2xl space-y-6 pb-20">
            {items.filter(i => i.status === 'pending').map(item => (
                <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
                    
                    {/* Content */}
                    <div className="p-5">
                        <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-medium">{item.content}</div>
                        <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
                            {item.type === 'audio' ? <Mic className="w-3 h-3" /> : item.type === 'file' ? <FileText className="w-3 h-3" /> : null}
                            <span>{item.type.toUpperCase()} • {item.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>

                    {/* AI RESULT CARD */}
                    {item.processedResult ? (
                        <div className="bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800">
                            
                            {/* CASE 1: TASK PROPOSAL (Matching Sidebar Style) */}
                            {item.processedResult.actionType === 'create_task' && (
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-4 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                                        <Sparkles className="w-3 h-3" /> Task Proposal
                                    </div>
                                    <div className="space-y-4">
                                        <input 
                                            type="text" 
                                            value={item.processedResult.data.title}
                                            onChange={(e) => handleUpdateActionData(item.id, { title: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-2 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Project Select */}
                                            <div className="relative">
                                                <select 
                                                    value={item.processedResult.targetProjectId}
                                                    onChange={(e) => {
                                                        if (onUpdateItem) onUpdateItem(item.id, { processedResult: { ...item.processedResult!, targetProjectId: e.target.value } });
                                                    }}
                                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-2 text-xs appearance-none focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white cursor-pointer"
                                                >
                                                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                                </select>
                                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-2.5 pointer-events-none" />
                                            </div>
                                            {/* Priority Selector (Clean UI) */}
                                            <div className="flex bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 p-0.5">
                                                {[TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH].map(p => {
                                                    const isSelected = item.processedResult!.data.priority === p;
                                                    let colorClass = 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white';
                                                    if (isSelected && p === TaskPriority.HIGH) colorClass = 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400';
                                                    if (isSelected && p === TaskPriority.MEDIUM) colorClass = 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
                                                    if (isSelected && p === TaskPriority.LOW) colorClass = 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';

                                                    return (
                                                        <button 
                                                            key={p} 
                                                            onClick={() => handleUpdateActionData(item.id, { priority: p })}
                                                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all flex items-center justify-center gap-1.5 ${
                                                                isSelected ? colorClass : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                                            }`}
                                                        >
                                                            {isSelected && <div className={`w-1.5 h-1.5 rounded-full ${p === TaskPriority.HIGH ? 'bg-red-500' : p === TaskPriority.MEDIUM ? 'bg-orange-500' : 'bg-blue-500'}`}></div>}
                                                            {p}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
                                        <button onClick={() => onDeleteItem(item.id)} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors">Discard</button>
                                        <button onClick={() => onProcessItem(item.id, item.processedResult!)} className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded text-xs font-bold hover:opacity-90">Create Task</button>
                                    </div>
                                </div>
                            )}

                            {/* CASE 2: DOCUMENT + TASKS (Tabbed UI) */}
                            {(item.processedResult.actionType === 'create_document' || item.processedResult.actionType === 'mixed') && (
                                <div className="flex flex-col">
                                    {/* Tabs */}
                                    <div className="flex border-b border-gray-200 dark:border-gray-800">
                                        <div className="px-4 py-3 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10">
                                            <FileText className="w-3 h-3" /> Page Content
                                        </div>
                                        {item.processedResult.data.extractedTasks && item.processedResult.data.extractedTasks.length > 0 && (
                                            <div className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <CheckSquare className="w-3 h-3" /> {item.processedResult.data.extractedTasks.length} Tasks Found
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5 space-y-5">
                                        {/* Doc Title */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Page Title</label>
                                            <input 
                                                type="text" 
                                                value={item.processedResult.data.title}
                                                onChange={(e) => handleUpdateActionData(item.id, { title: e.target.value })}
                                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                            />
                                        </div>

                                        {/* Smart Tags */}
                                        {item.processedResult.data.tags && (
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Smart Tags</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {item.processedResult.data.tags.map((tag, idx) => (
                                                        <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-300">
                                                            <Tag className="w-3 h-3" /> #{tag}
                                                            <button 
                                                                onClick={() => {
                                                                    const newTags = item.processedResult!.data.tags!.filter((_, i) => i !== idx);
                                                                    handleUpdateActionData(item.id, { tags: newTags });
                                                                }} 
                                                                className="ml-1 hover:text-red-500"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                    <button 
                                                        onClick={() => {
                                                            const newTag = prompt("Enter new tag:");
                                                            if (newTag) {
                                                                const newTags = [...(item.processedResult!.data.tags || []), newTag];
                                                                handleUpdateActionData(item.id, { tags: newTags });
                                                            }
                                                        }}
                                                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                                                    >
                                                        + Tag
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Editable Tasks List */}
                                        {item.processedResult.data.extractedTasks && item.processedResult.data.extractedTasks.length > 0 && (
                                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                                                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-500 uppercase">
                                                    Extracted Action Items
                                                </div>
                                                <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
                                                    {item.processedResult.data.extractedTasks.map((t, idx) => (
                                                        <div key={idx} className="p-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                                            <div className="mt-1 text-blue-500"><CheckCircle2 className="w-4 h-4" /></div>
                                                            <div className="flex-1 min-w-0 space-y-2">
                                                                {/* Task Title Input */}
                                                                <input 
                                                                    type="text" 
                                                                    value={t.title}
                                                                    onChange={(e) => handleUpdateExtractedTask(item.id, idx, { title: e.target.value })}
                                                                    className="w-full bg-transparent border-none p-0 text-xs font-medium text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400"
                                                                    placeholder="Task Title"
                                                                />
                                                                
                                                                {/* Row 2: Priority & Assignee */}
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative">
                                                                        <select 
                                                                            value={t.priority} 
                                                                            onChange={(e) => handleUpdateExtractedTask(item.id, idx, { priority: e.target.value as TaskPriority })}
                                                                            className={`text-[10px] uppercase font-bold py-0.5 pl-1.5 pr-4 rounded border appearance-none cursor-pointer focus:ring-0 focus:border-transparent ${
                                                                                t.priority === 'High' ? 'text-red-600 bg-red-50 border-red-100' :
                                                                                t.priority === 'Medium' ? 'text-orange-600 bg-orange-50 border-orange-100' :
                                                                                'text-blue-600 bg-blue-50 border-blue-100'
                                                                            }`}
                                                                        >
                                                                            <option value="High">High</option>
                                                                            <option value="Medium">Medium</option>
                                                                            <option value="Low">Low</option>
                                                                        </select>
                                                                        <Flag className="w-2 h-2 absolute right-1.5 top-1.5 pointer-events-none opacity-50" />
                                                                    </div>
                                                                    
                                                                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                        <User className="w-3 h-3" />
                                                                        <input 
                                                                            type="text"
                                                                            value={t.assignee || AgentRole.WRITER}
                                                                            onChange={(e) => handleUpdateExtractedTask(item.id, idx, { assignee: e.target.value })}
                                                                            placeholder="Unassigned"
                                                                            className="bg-transparent border-none p-0 w-24 focus:ring-0 text-gray-600 dark:text-gray-300"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleDeleteExtractedTask(item.id, idx)}
                                                                className="p-1 text-gray-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                                title="Remove Task"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newTasks = [...(item.processedResult!.data.extractedTasks || []), { title: 'New Task', priority: TaskPriority.MEDIUM, assignee: AgentRole.WRITER }];
                                                        handleUpdateActionData(item.id, { extractedTasks: newTasks });
                                                    }}
                                                    className="w-full py-2 text-[10px] font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800"
                                                >
                                                    + Add Another Task
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-2 p-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-800">
                                        <button onClick={() => onDeleteItem(item.id)} className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors">Discard</button>
                                        <button 
                                            onClick={() => onProcessItem(item.id, item.processedResult!)} 
                                            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-2"
                                        >
                                            Import All <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // ACTION BAR
                        <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex justify-end">
                             <div className="flex gap-2">
                                <button onClick={() => onDeleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleMagicSort(item)}
                                    disabled={processingId === item.id}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 text-xs font-medium transition-all shadow-sm"
                                >
                                    {processingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    <span>Organize with {selectedProvider === 'gemini' ? 'Gemini' : getProviderLabel()}</span>
                                </button>
                             </div>
                        </div>
                    )}
                </div>
            ))}

            {items.filter(i => i.status === 'pending').length === 0 && (
                <div className="text-center py-12 text-gray-400 dark:text-gray-600 flex flex-col items-center">
                    <CheckCircle2 className="w-16 h-16 text-gray-200 dark:text-gray-800 mb-4" />
                    <p className="text-sm font-medium">Inbox Zero. You're all caught up.</p>
                </div>
            )}
        </div>
    </div>
  );
};