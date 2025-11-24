import React, { useState } from 'react';
import { Document, Task, TaskPriority } from '../types';
import { Wand2, ListChecks, RefreshCw, X, Check, User, Flag, Calendar, AlignLeft } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface DocumentEditorProps {
  document: Document;
  onUpdate: (updatedDoc: Document) => void;
  onExtractTasks: (tasks: Partial<Task>[]) => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ document, onUpdate, onExtractTasks }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  
  // Summarization State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  
  // Task Review State
  const [pendingTasks, setPendingTasks] = useState<Partial<Task>[]>([]);
  const [isReviewingTasks, setIsReviewingTasks] = useState(false);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Set<number>>(new Set());

  const adjustTextareaHeight = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...document, title: e.target.value, updatedAt: new Date() });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...document, content: e.target.value, updatedAt: new Date() });
    adjustTextareaHeight(e.target);
  };

  const handleExtractTasks = async () => {
    setIsGenerating(true);
    const tasks = await geminiService.extractTasks(document.content);
    if (tasks.length > 0) {
      setPendingTasks(tasks);
      setSelectedTaskIndices(new Set(tasks.map((_, i) => i))); // Select all by default
      setIsReviewingTasks(true);
    }
    setIsGenerating(false);
  };

  const handleSummarize = async () => {
    if (!document.content.trim()) return;
    setIsSummarizing(true);
    const result = await geminiService.summarizeDocument(document.content);
    setSummary(result);
    setIsSummarizing(false);
  };

  const handleConfirmTasks = () => {
    const tasksToAdd = pendingTasks.filter((_, i) => selectedTaskIndices.has(i));
    onExtractTasks(tasksToAdd);
    setIsReviewingTasks(false);
    setPendingTasks([]);
    setSelectedTaskIndices(new Set());
  };

  const toggleTaskSelection = (index: number) => {
    const newSet = new Set(selectedTaskIndices);
    if (newSet.has(index)) {
        newSet.delete(index);
    } else {
        newSet.add(index);
    }
    setSelectedTaskIndices(newSet);
  };

  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    const newContent = await geminiService.generateDocumentContent(aiPrompt, document.content);
    const updatedContent = document.content ? `${document.content}\n\n${newContent}` : newContent;
    onUpdate({ ...document, content: updatedContent, updatedAt: new Date() });
    setIsGenerating(false);
    setShowAiInput(false);
    setAiPrompt('');
  };

  const getPriorityColor = (p?: TaskPriority | string) => {
      switch(p) {
          case 'High': return 'text-red-600 bg-red-50';
          case 'Medium': return 'text-orange-600 bg-orange-50';
          case 'Low': return 'text-blue-600 bg-blue-50';
          default: return 'text-orange-600 bg-orange-50';
      }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white relative">
      <div className="max-w-4xl mx-auto px-12 py-16 min-h-[calc(100vh-4rem)]">
        
        {/* Top Metadata (Hidden until hover) */}
        <div className="group mb-6 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity duration-300">
           <div className="flex space-x-2">
             {document.updatedAt && (
               <span className="text-[10px] uppercase tracking-widest text-gray-300">
                 Edited {document.updatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
               </span>
             )}
           </div>
           <div className="flex items-center space-x-2">
              <button
                onClick={handleSummarize}
                disabled={isSummarizing}
                className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                {isSummarizing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <AlignLeft className="w-3 h-3" />}
                <span>Summarize</span>
              </button>
              <button
                onClick={() => setShowAiInput(!showAiInput)}
                className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <Wand2 className="w-3 h-3" />
                <span>AI Draft</span>
              </button>
              <button
                onClick={handleExtractTasks}
                disabled={isGenerating}
                className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ListChecks className="w-3 h-3" />}
                <span>Tasks</span>
              </button>
           </div>
        </div>

        {/* Title */}
        <input
          type="text"
          value={document.title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 border-none focus:ring-0 focus:outline-none bg-transparent mb-8 p-0"
        />

        {/* AI Input Overlay */}
        {showAiInput && (
            <div className="mb-8 p-1 bg-gray-50 rounded-lg animate-in fade-in slide-in-from-top-2 border border-gray-100">
                <div className="flex flex-col p-2">
                    <textarea 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe what you want to write..."
                        className="w-full bg-transparent border-none p-2 text-sm focus:ring-0 resize-none h-16 placeholder-gray-400 text-gray-700"
                        autoFocus
                    />
                    <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                        <button 
                            onClick={() => setShowAiInput(false)}
                            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAiDraft}
                            disabled={isGenerating || !aiPrompt}
                            className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                        >
                            {isGenerating ? 'Thinking...' : 'Generate'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Content */}
        <textarea
          value={document.content}
          onChange={handleContentChange}
          placeholder="Type '/' for commands, or just start writing..."
          className="w-full min-h-[60vh] text-lg leading-relaxed text-gray-800 border-none focus:ring-0 focus:outline-none bg-transparent resize-none p-0 placeholder-gray-200 font-serif"
          ref={(el) => {
            if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
            }
          }}
        />
      </div>

      {/* Summary Modal */}
      {summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setSummary(null)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 ring-1 ring-gray-100 animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <AlignLeft className="w-4 h-4 text-gray-500" />
                        Document Summary
                    </h3>
                    <button onClick={() => setSummary(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="p-6 max-h-[60vh] overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-serif">
                    {summary}
                </div>

                <div className="p-4 border-t border-gray-50 flex justify-end gap-2 bg-gray-50/50">
                    <button 
                        onClick={() => setSummary(null)}
                        className="px-4 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800 font-medium shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Task Review Modal */}
      {isReviewingTasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setIsReviewingTasks(false)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 ring-1 ring-gray-100 animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-gray-500" />
                        Found {pendingTasks.length} Tasks
                    </h3>
                    <button onClick={() => setIsReviewingTasks(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="p-2 max-h-[60vh] overflow-y-auto space-y-1">
                    {pendingTasks.map((task, idx) => (
                        <div 
                            key={idx}
                            onClick={() => toggleTaskSelection(idx)}
                            className={`group p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                                selectedTaskIndices.has(idx) 
                                ? 'bg-white border-blue-200 shadow-sm' 
                                : 'bg-gray-50 border-transparent opacity-60 hover:opacity-80'
                            }`}
                        >
                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                selectedTaskIndices.has(idx) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                            }`}>
                                {selectedTaskIndices.has(idx) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${selectedTaskIndices.has(idx) ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {task.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    {task.assignee && (
                                        <div className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                            <User className="w-3 h-3" />
                                            <span>{task.assignee}</span>
                                        </div>
                                    )}
                                    <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                                        <Flag className="w-3 h-3" />
                                        <span>{task.priority || 'Medium'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-50 flex justify-end gap-2 bg-gray-50/50">
                    <button 
                        onClick={() => setIsReviewingTasks(false)}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmTasks}
                        disabled={selectedTaskIndices.size === 0}
                        className="px-4 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                    >
                        <span>Add {selectedTaskIndices.size} Tasks</span>
                        <Check className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};