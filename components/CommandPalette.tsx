
import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, CheckSquare, Command, ArrowRight, Sparkles, Folder, X } from 'lucide-react';
import { Document, Task, SearchResult, ViewMode, Project } from '../types';
import { geminiService } from '../services/geminiService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  tasks: Task[];
  projects: Project[];
  onNavigate: (type: 'document' | 'task', id: string) => void;
  onCreateDocument: () => void;
  onChangeView: (view: ViewMode) => void;
  onSelectProject: (id: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
    isOpen, 
    onClose, 
    documents, 
    tasks, 
    projects,
    onNavigate, 
    onCreateDocument,
    onChangeView,
    onSelectProject
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setQuery('');
        setAiAnswer(null);
        setSelectedIndex(0);
        setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query) {
        setResults([
            { id: 'new-doc', title: 'Create new document', type: 'command', subtitle: 'Action', action: onCreateDocument },
            ...projects.map(p => ({
                id: p.id,
                title: p.title,
                type: 'project' as const,
                subtitle: 'Switch Project',
                action: () => onSelectProject(p.id)
            }))
        ]);
        return;
    }

    if (query.startsWith('?')) {
        setResults([{ id: 'ask-ai', title: `Ask Aasani: "${query.substring(1)}"`, type: 'command', subtitle: 'AI Query', action: handleAiQuery }]);
        return;
    }

    const lowerQuery = query.toLowerCase();
    
    // Search Projects
    const projectResults: SearchResult[] = projects
        .filter(p => p.title.toLowerCase().includes(lowerQuery))
        .map(p => ({ id: p.id, title: p.title, type: 'project', subtitle: 'Project Context', action: () => onSelectProject(p.id) }));

    // Search Docs
    const docResults: SearchResult[] = documents
        .filter(d => d.title.toLowerCase().includes(lowerQuery) || d.content.toLowerCase().includes(lowerQuery))
        .map(d => {
            const proj = projects.find(p => p.id === d.projectId);
            return { 
                id: d.id, 
                title: d.title || 'Untitled', 
                type: 'document', 
                subtitle: `Document in ${proj?.title || 'Unknown'}`, 
                action: () => onNavigate('document', d.id) 
            };
        });

    // Search Tasks
    const taskResults: SearchResult[] = tasks
        .filter(t => t.title.toLowerCase().includes(lowerQuery))
        .map(t => {
            const proj = projects.find(p => p.id === t.projectId);
            return {
                id: t.id, 
                title: t.title, 
                type: 'task', 
                subtitle: `${t.status} in ${proj?.title || 'Unknown'}`, 
                action: () => onNavigate('task', t.id) 
            };
        });

    setResults([...projectResults, ...docResults, ...taskResults]);
    setSelectedIndex(0);
  }, [query, documents, tasks, projects]);

  const handleAiQuery = async () => {
      if (!query.startsWith('?')) return;
      setIsThinking(true);
      
      const docContext = documents.map(d => `Doc: "${d.title}" (Tags: ${d.tags.join(', ')})`).join('\n');
      const taskContext = tasks.map(t => `Task: "${t.title}" (${t.status}, ${t.priority})`).join('\n');
      const projectContext = projects.map(p => `Project: "${p.title}"`).join('\n');
      const fullContext = `${projectContext}\n${docContext}\n${taskContext}`;
      
      const answer = await geminiService.queryWorkspace(query.substring(1), fullContext);
      setAiAnswer(answer);
      setIsThinking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (query.startsWith('?') && !aiAnswer) {
            handleAiQuery();
        } else if (results[selectedIndex]) {
            results[selectedIndex].action?.();
            onClose();
        }
    } else if (e.key === 'Escape') {
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-8 md:pt-[20vh] safe-area-top bg-white dark:bg-black md:bg-transparent">
      {/* Desktop Backdrop */}
      <div className="hidden md:block absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-black md:dark:bg-gray-900 w-full max-w-2xl h-full md:h-auto md:rounded-xl shadow-none md:shadow-2xl overflow-hidden ring-0 md:ring-1 ring-gray-900/5 dark:ring-white/10 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Input */}
        <div className="flex items-center px-4 border-b border-gray-100 dark:border-gray-800 h-16 md:h-14 shrink-0 mt-safe md:mt-0">
            {query.startsWith('?') ? <Sparkles className="w-5 h-5 text-purple-500 mr-3" /> : <Search className="w-5 h-5 text-gray-400 mr-3" />}
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type to search..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 h-full"
            />
            {/* Mobile Cancel Button */}
            <button onClick={onClose} className="md:hidden text-base font-medium text-blue-500 dark:text-blue-400 ml-2">
                Cancel
            </button>
            {/* Desktop ESC Hint */}
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600">
                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">esc</span>
                <span>to close</span>
            </div>
        </div>

        {/* AI Answer Area */}
        {isThinking && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-2">
                <Sparkles className="w-5 h-5 animate-spin text-purple-500" />
                <span className="text-sm">Connecting system nodes...</span>
            </div>
        )}
        
        {aiAnswer && (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800/50">
                <div className="flex items-start gap-3">
                    <div className="p-1 bg-white dark:bg-gray-800 rounded shadow-sm text-purple-600 dark:text-purple-400">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                        {aiAnswer}
                    </div>
                </div>
            </div>
        )}

        {/* Results List */}
        {!isThinking && !aiAnswer && (
            <div className="flex-1 overflow-y-auto p-2 bg-white dark:bg-black md:dark:bg-gray-900">
                {results.map((result, index) => (
                    <button
                        key={result.id}
                        onClick={() => { result.action?.(); onClose(); }}
                        className={`w-full flex items-center justify-between px-4 py-4 md:py-3 rounded-lg text-left transition-colors group ${
                            index === selectedIndex ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onMouseEnter={() => setSelectedIndex(index)}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded flex items-center justify-center border ${
                                index === selectedIndex ? 'bg-white dark:bg-gray-700 shadow-sm border-gray-200 dark:border-gray-600' : 'bg-gray-50 dark:bg-gray-800 border-transparent'
                            }`}>
                                {result.type === 'document' && <FileText className="w-4 h-4" />}
                                {result.type === 'task' && <CheckSquare className="w-4 h-4" />}
                                {result.type === 'command' && <Command className="w-4 h-4" />}
                                {result.type === 'project' && <Folder className="w-4 h-4" />}
                            </div>
                            <div>
                                <div className="font-medium text-base md:text-sm">{result.title}</div>
                                {result.subtitle && <div className="text-xs text-gray-400 dark:text-gray-500">{result.subtitle}</div>}
                            </div>
                        </div>
                        {index === selectedIndex && <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                    </button>
                ))}
                {results.length === 0 && (
                    <div className="p-8 text-center text-gray-400 dark:text-gray-600 text-sm">
                        No results found.
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
