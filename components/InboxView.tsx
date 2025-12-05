
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InboxItem, Project, InboxAction, Integration, TaskPriority, TaskStatus, Task, Attachment, AgentRole, Client } from '../types';
import { Mic, Sparkles, Archive, Loader2, CheckCircle, FileText, Trash2, StopCircle, Paperclip, X, Check, ArrowRight, ChevronDown, Layers, CheckCircle2, Bot, Search, Lock, Settings, User, Calendar, CheckSquare, File, Tag, Flag, Briefcase, Plus, Folder, UserPlus, Bug, Rocket } from 'lucide-react';
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

// Local interface for UI selection state
interface TaskSelection {
    selected: boolean;
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

  // Local state to track task selection for import (Key: ItemID-TaskIndex, Value: boolean)
  const [selectionState, setSelectionState] = useState<Record<string, boolean>>({});
  
  // Local state for "Create Project" input within the card
  const [newProjectInput, setNewProjectInput] = useState<Record<string, string>>({});
  const [showProjectInput, setShowProjectInput] = useState<Record<string, boolean>>({});

  // Ref for audio & file
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- INITIALIZATION ---
  // Ensure tasks are selected by default when component mounts or items change
  useEffect(() => {
      setSelectionState(prev => {
          const nextState = { ...prev };
          let hasChanges = false;
          
          items.forEach(item => {
              if (item.processedResult && item.processedResult.data.extractedTasks) {
                  item.processedResult.data.extractedTasks.forEach((_, idx) => {
                      const key = `${item.id}-${idx}`;
                      // Only set default if not already set (preserve user unchecking if they navigated away and back, 
                      // but in this app simple navigation often remounts, so defaulting to TRUE for top 7 is safer UX than FALSE)
                      if (nextState[key] === undefined) {
                          nextState[key] = idx < 7; // Default top 7 selected
                          hasChanges = true;
                      }
                  });
              }
          });
          
          return hasChanges ? nextState : prev;
      });
  }, [items]);

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

          // Pre-select top 7 tasks immediately
          const initialSelection: Record<string, boolean> = {};
          if (result.data.extractedTasks) {
              result.data.extractedTasks.forEach((_, idx) => {
                  initialSelection[`${item.id}-${idx}`] = idx < 7;
              });
          }
          setSelectionState(prev => ({ ...prev, ...initialSelection }));
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

  const toggleTaskSelection = (itemId: string, index: number) => {
      setSelectionState(prev => ({
          ...prev,
          [`${itemId}-${index}`]: !prev[`${itemId}-${index}`]
      }));
  };

  const getProviderLabel = () => {
        if (selectedProvider === 'gemini') return 'Aasani (Gemini)';
        const model = availableModels.find(m => m.id === openRouterModel);
        if (model) return model.name;
        if (isCustomModel) return openRouterModel.split('/')[1] || 'Custom Model';
        return openRouterModel.split('/')[1] || 'OpenRouter';
  };

  // Helper to handle the "Import All" action with filtering for selected tasks
  const handleImport = (item: InboxItem) => {
      if (!item.processedResult) return;

      // DEEP CLONE to prevent mutation of props and ensure clean state handoff
      const finalResult: InboxAction = JSON.parse(JSON.stringify(item.processedResult));
      
      // Handle "New Project" Logic
      if (showProjectInput[item.id] && newProjectInput[item.id]) {
          finalResult.targetProjectId = `NEW:${newProjectInput[item.id]}`;
      }

      // Filter tasks based on selection
      if (finalResult.data.extractedTasks) {
          finalResult.data.extractedTasks = finalResult.data.extractedTasks.filter((_, idx) => {
              const isSelected = selectionState[`${item.id}-${idx}`];
              // Default to true if undefined (safety net) for top 7, though state init should handle this
              if (isSelected === undefined) return idx < 7;
              return isSelected;
          });
      }

      onProcessItem(item.id, finalResult);
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
                            
                            {/* CASE 3: CREATE CLIENT (CRM) */}
                            {item.processedResult.actionType === 'create_client' && item.processedResult.data.clientData && (
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-4 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                        <Briefcase className="w-3 h-3" /> New Lead Detected
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Contact Name</label>
                                                <input 
                                                    type="text" 
                                                    value={item.processedResult.data.clientData.name}
                                                    onChange={(e) => handleUpdateActionData(item.id, { clientData: { ...item.processedResult!.data.clientData, name: e.target.value } })}
                                                    className="w-full bg-transparent border-none p-0 text-sm font-medium text-gray-900 dark:text-white focus:ring-0"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Company</label>
                                                <input 
                                                    type="text" 
                                                    value={item.processedResult.data.clientData.company}
                                                    onChange={(e) => handleUpdateActionData(item.id, { clientData: { ...item.processedResult!.data.clientData, company: e.target.value } })}
                                                    className="w-full bg-transparent border-none p-0 text-sm font-medium text-gray-900 dark:text-white focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Email</label>
                                            <input 
                                                type="text" 
                                                value={item.processedResult.data.clientData.email || ''}
                                                onChange={(e) => handleUpdateActionData(item.id, { clientData: { ...item.processedResult!.data.clientData, email: e.target.value } })}
                                                placeholder="No email detected"
                                                className="w-full bg-transparent border-none p-0 text-sm text-gray-900 dark:text-white focus:ring-0"
                                            />
                                        </div>
                                        <div className="flex gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Est. Value</label>
                                                <input 
                                                    type="number" 
                                                    value={item.processedResult.data.clientData.value || 0}
                                                    onChange={(e) => handleUpdateActionData(item.id, { clientData: { ...item.processedResult!.data.clientData, value: parseInt(e.target.value) } })}
                                                    className="w-24 bg-transparent border-none p-0 text-sm font-medium text-gray-900 dark:text-white focus:ring-0"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                                                <select 
                                                    value={item.processedResult.data.clientData.status || 'Lead'}
                                                    onChange={(e) => handleUpdateActionData(item.id, { clientData: { ...item.processedResult!.data.clientData, status: e.target.value } })}
                                                    className="bg-transparent border-none p-0 text-sm font-medium text-gray-900 dark:text-white focus:ring-0 cursor-pointer"
                                                >
                                                    <option value="Lead">Lead</option>
                                                    <option value="Negotiation">Negotiation</option>
                                                    <option value="Active">Active</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
                                        <button onClick={() => onDeleteItem(item.id)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-red-500 transition-colors">Discard</button>
                                        <button onClick={() => onProcessItem(item.id, item.processedResult!)} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors">Add to CRM</button>
                                    </div>
                                </div>
                            )}

                            {/* STANDARD CASE: DOC OR TASK */}
                            {item.processedResult.actionType !== 'create_client' && (
                                <>
                                    <div className="p-5">
                                        {/* Header: Project & Title */}
                                        <div className="space-y-4 mb-6">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="relative">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1">
                                                        <Folder className="w-3 h-3" />
                                                        <select 
                                                            value={showProjectInput[item.id] ? "new" : (item.processedResult.targetProjectId || "default")}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === "new") {
                                                                    setShowProjectInput(prev => ({...prev, [item.id]: true}));
                                                                } else {
                                                                    setShowProjectInput(prev => ({...prev, [item.id]: false}));
                                                                    if (onUpdateItem) onUpdateItem(item.id, { processedResult: { ...item.processedResult!, targetProjectId: val } });
                                                                }
                                                            }}
                                                            className="bg-transparent border-none appearance-none outline-none cursor-pointer"
                                                        >
                                                            <option value="default">Default Project</option>
                                                            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                                            <option value="new">+ Create New Project</option>
                                                        </select>
                                                        <ChevronDown className="w-3 h-3 text-gray-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                                
                                                {showProjectInput[item.id] && (
                                                    <input 
                                                        type="text" 
                                                        value={newProjectInput[item.id] || ''}
                                                        onChange={(e) => setNewProjectInput(prev => ({...prev, [item.id]: e.target.value}))}
                                                        placeholder="New Project Name"
                                                        className="bg-white dark:bg-gray-800 border border-purple-400 dark:border-purple-600 rounded px-2 py-1 text-xs text-black dark:text-white outline-none w-40"
                                                        autoFocus
                                                    />
                                                )}

                                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1">
                                                    {item.processedResult.actionType === 'create_task' ? 'Single Task' : 'Doc + Tasks'}
                                                </div>
                                            </div>

                                            {/* Editable Title */}
                                            <input 
                                                type="text" 
                                                value={item.processedResult.data.title}
                                                onChange={(e) => handleUpdateActionData(item.id, { title: e.target.value })}
                                                className="w-full bg-transparent border-none p-0 text-xl font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0"
                                                placeholder="Title"
                                            />
                                        </div>

                                        {/* Task List Section */}
                                        {item.processedResult.data.extractedTasks && item.processedResult.data.extractedTasks.length > 0 && (
                                            <div className="space-y-6">
                                                
                                                {/* Suggested Tasks (Top 7) */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Sparkles className="w-3 h-3 text-purple-500" />
                                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest">Suggested Actions</h4>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                                                        {item.processedResult.data.extractedTasks.slice(0, 7).map((t, idx) => (
                                                            <div key={idx} className="p-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={selectionState[`${item.id}-${idx}`] !== false} // Default true if undefined
                                                                    onChange={() => toggleTaskSelection(item.id, idx)}
                                                                    className="mt-1 w-4 h-4 rounded border-gray-300 text-black focus:ring-black dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-white dark:checked:border-white"
                                                                />
                                                                <div className="flex-1 min-w-0 space-y-1.5">
                                                                    <div className="flex justify-between items-start gap-4">
                                                                        <input 
                                                                            type="text" 
                                                                            value={t.title}
                                                                            onChange={(e) => handleUpdateExtractedTask(item.id, idx, { title: e.target.value })}
                                                                            className="flex-1 bg-transparent border-none p-0 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-0"
                                                                        />
                                                                        {/* Minimal Priority Pill */}
                                                                        <div className="relative">
                                                                            <select 
                                                                                value={t.priority}
                                                                                onChange={(e) => handleUpdateExtractedTask(item.id, idx, { priority: e.target.value })}
                                                                                className={`appearance-none pl-2 pr-4 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer outline-none border transition-colors
                                                                                    ${t.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900' : 
                                                                                    t.priority === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-900' :
                                                                                    'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900'
                                                                                }`}
                                                                            >
                                                                                <option value="High">High</option>
                                                                                <option value="Medium">Medium</option>
                                                                                <option value="Low">Low</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                                                            <User className="w-3 h-3" />
                                                                            <input 
                                                                                type="text" 
                                                                                value={t.assignee || 'Unassigned'}
                                                                                onChange={(e) => handleUpdateExtractedTask(item.id, idx, { assignee: e.target.value })}
                                                                                className="bg-transparent border-none p-0 w-20 focus:ring-0 text-gray-500"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Additional Tasks (Greyed Out) */}
                                                {item.processedResult.data.extractedTasks.length > 7 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Layers className="w-3 h-3 text-gray-400" />
                                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Additional Opportunities ({item.processedResult.data.extractedTasks.length - 7})</h4>
                                                        </div>
                                                        <div className="pl-2 border-l-2 border-gray-100 dark:border-gray-800 space-y-2">
                                                            {item.processedResult.data.extractedTasks.slice(7).map((t, idx) => {
                                                                const realIdx = idx + 7;
                                                                const isSelected = !!selectionState[`${item.id}-${realIdx}`];
                                                                return (
                                                                    <div key={realIdx} className={`flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!isSelected ? 'opacity-50 hover:opacity-100' : ''}`}>
                                                                        <input 
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={() => toggleTaskSelection(item.id, realIdx)}
                                                                            className="w-3.5 h-3.5 rounded border-gray-300 text-gray-500 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-800"
                                                                        />
                                                                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{t.title}</span>
                                                                        <span className="text-[10px] text-gray-400 uppercase">{t.priority}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-800">
                                        <button onClick={() => onDeleteItem(item.id)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-red-500 transition-colors">Discard</button>
                                        <button 
                                            onClick={() => handleImport(item)} 
                                            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-2 shadow-sm"
                                        >
                                            Import {Object.values(selectionState).filter(v => v !== false).length > 0 ? Object.values(selectionState).filter(v => v !== false).length : Math.min(7, item.processedResult.data.extractedTasks?.length || 0)} Items <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </>
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
                <div className="text-center py-8 text-gray-400 dark:text-gray-600 flex flex-col items-center">
                    <CheckCircle2 className="w-12 h-12 text-gray-200 dark:text-gray-800 mb-6" />
                    <p className="text-sm font-medium mb-6">Inbox Zero. Start something new.</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl w-full px-4">
                        <button onClick={() => setInputText("New Lead: [Name]\nCompany: [Company]\nEmail: [Email]\nValue: [1000]")} className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:shadow-md text-left group">
                            <UserPlus className="w-6 h-6 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                            <div className="text-xs font-bold text-gray-900 dark:text-white">New Lead</div>
                            <div className="text-[10px] text-gray-500 mt-1">Capture prospect details</div>
                        </button>
                        
                        <button onClick={() => setInputText("Project Kickoff: [Project Name]\nGoal: [Main Goal]\n\nKey Milestones:\n- [ ] Phase 1\n- [ ] Phase 2")} className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-purple-400 dark:hover:border-purple-500 transition-all hover:shadow-md text-left group">
                            <Rocket className="w-6 h-6 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                            <div className="text-xs font-bold text-gray-900 dark:text-white">Project Kickoff</div>
                            <div className="text-[10px] text-gray-500 mt-1">Plan new initiative</div>
                        </button>

                        <button onClick={() => setInputText("Bug Report: [Issue Title]\nSeverity: High\n\nSteps to Reproduce:\n1. ...\n\nExpected Result: ...")} className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-red-400 dark:hover:border-red-500 transition-all hover:shadow-md text-left group">
                            <Bug className="w-6 h-6 text-red-500 mb-3 group-hover:scale-110 transition-transform" />
                            <div className="text-xs font-bold text-gray-900 dark:text-white">Bug Report</div>
                            <div className="text-[10px] text-gray-500 mt-1">Log issue & assign</div>
                        </button>

                        <button onClick={() => setInputText("Meeting Notes: [Title]\nAttendees: [Names]\n\nKey Discussion Points:\n- ...\n\nAction Items:\n- ...")} className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-green-400 dark:hover:border-green-500 transition-all hover:shadow-md text-left group">
                            <FileText className="w-6 h-6 text-green-500 mb-3 group-hover:scale-110 transition-transform" />
                            <div className="text-xs font-bold text-gray-900 dark:text-white">Meeting Notes</div>
                            <div className="text-[10px] text-gray-500 mt-1">Log & extract tasks</div>
                        </button>

                        <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-orange-400 dark:hover:border-orange-500 transition-all hover:shadow-md text-left group">
                            <FileText className="w-6 h-6 text-orange-500 mb-3 group-hover:scale-110 transition-transform" />
                            <div className="text-xs font-bold text-gray-900 dark:text-white">Contract Review</div>
                            <div className="text-[10px] text-gray-500 mt-1">Upload PDF to analyze</div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
