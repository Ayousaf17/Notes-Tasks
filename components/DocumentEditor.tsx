
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Task, TaskPriority } from '../types';
import { Wand2, ListChecks, RefreshCw, X, Check, User, Flag, AlignLeft, Tag as TagIcon, Sparkles, MoreHorizontal, Type, Scissors, SpellCheck, ChevronRight, Hash, Table as TableIcon, Link as LinkIcon, Eye, Edit3, FileText } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface DocumentEditorProps {
  document: Document;
  allDocuments?: Document[]; // Passed for wiki linking
  allTasks?: Task[]; // Passed for wiki linking
  onUpdate: (updatedDoc: Document) => void;
  onExtractTasks: (tasks: Partial<Task>[]) => Task[]; // Returns created tasks for linking
  onNavigate?: (type: 'document' | 'task', id: string) => void;
}

// Helper to get caret coordinates for popup positioning
const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const { offsetLeft: elementLeft, offsetTop: elementTop } = element;
    const div = document.createElement('div');
    const styles = getComputedStyle(element);

    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word'; 
    div.style.width = styles.width;
    div.style.height = 'auto';
    div.style.font = styles.font;
    div.style.padding = styles.padding;
    div.style.border = styles.border;
    div.style.lineHeight = styles.lineHeight;
    div.style.letterSpacing = styles.letterSpacing;
    div.style.boxSizing = styles.boxSizing;

    div.textContent = element.value.substring(0, position);
    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);
    
    document.body.appendChild(div);
    const { offsetLeft: spanLeft, offsetTop: spanTop } = span;
    document.body.removeChild(div);

    return {
        left: elementLeft + spanLeft,
        top: elementTop + spanTop
    };
};

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
    document: doc, 
    allDocuments = [],
    allTasks = [],
    onUpdate, 
    onExtractTasks,
    onNavigate
}) => {
  // --- Core State ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isReadMode, setIsReadMode] = useState(false); // NEW: Toggle between Edit/View
  
  // --- Task Extraction State ---
  const [pendingTasks, setPendingTasks] = useState<Partial<Task>[]>([]);
  const [isReviewingTasks, setIsReviewingTasks] = useState(false);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Set<number>>(new Set());
  const [extractionSource, setExtractionSource] = useState<'document' | 'selection'>('document');
  const [extractionRange, setExtractionRange] = useState<[number, number] | null>(null);

  // --- Tagging State ---
  const [tagInput, setTagInput] = useState('');
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);

  // --- "Nexus" Editor State ---
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [slashMenu, setSlashMenu] = useState<{ x: number, y: number, query: string } | null>(null);
  const [wikiMenu, setWikiMenu] = useState<{ x: number, y: number, query: string } | null>(null); // NEW: Wiki Links
  const [hoverMenu, setHoverMenu] = useState<{ x: number, y: number, text: string, range: [number, number] } | null>(null);
  const [ghostSuggestion, setGhostSuggestion] = useState<{ text: string, x: number, y: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // --- Slash Command Draft State ---
  const [showDraftInput, setShowDraftInput] = useState<{ x: number, y: number } | null>(null);
  const [draftPrompt, setDraftPrompt] = useState('');

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && !isReadMode) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [doc.content, isReadMode]);

  // Ghost Autocomplete Logic
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (!isTyping && !isReadMode && doc.content.length > 50 && !slashMenu && !wikiMenu && !showDraftInput && !hoverMenu && textareaRef.current) {
            const { selectionStart, selectionEnd } = textareaRef.current;
            if (selectionStart === selectionEnd && selectionStart === doc.content.length) {
                // Only suggest at end of doc for now to be safe, or end of paragraph
                const coords = getCaretCoordinates(textareaRef.current, selectionStart);
                // Call AI
                const suggestion = await geminiService.continueWriting(doc.content);
                if (suggestion) {
                    setGhostSuggestion({ text: suggestion, x: coords.left, y: coords.top + 24 }); // Offset slightly
                }
            }
        }
    }, 2000); // 2s pause triggers ghost

    return () => clearTimeout(timer);
  }, [doc.content, isTyping, slashMenu, wikiMenu, showDraftInput, hoverMenu, isReadMode]);

  // --- Handlers ---

  const handleUpdate = (newDoc: Document) => {
    onUpdate(newDoc);
    setIsTyping(true);
    setGhostSuggestion(null);
    setTimeout(() => setIsTyping(false), 1000);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpdate({ ...doc, title: e.target.value, updatedAt: new Date() });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const { selectionStart } = e.target;
    
    // 1. Slash Command Detection
    if (newVal[selectionStart - 1] === '/') {
        if (selectionStart === 1 || /[\n\s]/.test(newVal[selectionStart - 2])) {
            const coords = getCaretCoordinates(e.target, selectionStart);
            setSlashMenu({ x: coords.left, y: coords.top + 24, query: '' });
            setWikiMenu(null);
        }
    } 
    // 2. Wiki Link Detection ([[)
    else if (newVal.substring(selectionStart - 2, selectionStart) === '[[') {
        const coords = getCaretCoordinates(e.target, selectionStart);
        setWikiMenu({ x: coords.left, y: coords.top + 24, query: '' });
        setSlashMenu(null);
    }
    // 3. Update Active Menus
    else if (slashMenu) {
        const lineStart = newVal.lastIndexOf('\n', selectionStart - 1) + 1;
        const currentLine = newVal.substring(lineStart, selectionStart);
        if (!currentLine.includes('/')) {
            setSlashMenu(null);
        } else {
            const slashIndex = currentLine.indexOf('/');
            setSlashMenu(prev => prev ? { ...prev, query: currentLine.substring(slashIndex + 1) } : null);
        }
    }
    else if (wikiMenu) {
        // Find last occurrence of [[ before cursor
        const lastOpen = newVal.lastIndexOf('[[', selectionStart);
        if (lastOpen === -1 || (selectionStart - lastOpen > 30)) { // Cancel if too far or gone
            setWikiMenu(null);
        } else {
            const query = newVal.substring(lastOpen + 2, selectionStart);
            setWikiMenu(prev => prev ? { ...prev, query } : null);
        }
    }

    handleUpdate({ ...doc, content: newVal, updatedAt: new Date() });
  };

  const handleSelect = () => {
      if (!textareaRef.current) return;
      const { selectionStart, selectionEnd } = textareaRef.current;
      
      if (selectionStart !== selectionEnd) {
          const text = doc.content.substring(selectionStart, selectionEnd);
          if (text.trim().length > 0) {
            // Position menu above selection (using end of selection for simplicity or midpoint)
            const coords = getCaretCoordinates(textareaRef.current, selectionEnd);
            setHoverMenu({ x: coords.left - 40, y: coords.top - 50, text, range: [selectionStart, selectionEnd] });
            setGhostSuggestion(null);
            return;
          }
      }
      setHoverMenu(null);
  };

  const insertTextAtCursor = (text: string, range?: [number, number]) => {
      if (!textareaRef.current) return;
      const { selectionStart, selectionEnd, value } = textareaRef.current;
      const start = range ? range[0] : selectionStart;
      const end = range ? range[1] : selectionEnd;
      
      const newValue = value.substring(0, start) + text + value.substring(end);
      
      handleUpdate({ ...doc, content: newValue, updatedAt: new Date() });
      
      // Restore cursor after insert
      setTimeout(() => {
          if (textareaRef.current) {
              const newPos = start + text.length;
              textareaRef.current.setSelectionRange(newPos, newPos);
              textareaRef.current.focus();
          }
      }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (ghostSuggestion && e.key === 'Tab') {
          e.preventDefault();
          insertTextAtCursor(ghostSuggestion.text);
          setGhostSuggestion(null);
      }
      
      if ((slashMenu || wikiMenu) && (e.key === 'Enter' || e.key === 'Escape' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
           // Allow menu components to handle arrows/enter usually, but here we might need to trap
           if (e.key === 'Escape') {
               setSlashMenu(null);
               setWikiMenu(null);
           }
      }
  };

  // --- Link Insertion ---
  const insertWikiLink = (item: { title: string, id: string, type: 'document' | 'task' }) => {
      setWikiMenu(null);
      if (!textareaRef.current) return;
      
      const { selectionStart, value } = textareaRef.current;
      const lastOpen = value.lastIndexOf('[[', selectionStart);
      
      // Create Markdown Link: [Title](nexus://type/id)
      const linkText = `[${item.title}](nexus://${item.type}/${item.id})`;
      
      const newValue = value.substring(0, lastOpen) + linkText + value.substring(selectionStart);
      handleUpdate({ ...doc, content: newValue });
      
      // Focus back logic would go here
  };

  // --- AI Actions ---

  const handleSummarize = async () => {
    if (!doc.content.trim()) return;
    setIsSummarizing(true);
    const result = await geminiService.summarizeDocument(doc.content);
    setSummary(result);
    setIsSummarizing(false);
  };

  const handleExtractTasks = async () => {
    setIsGenerating(true);
    let textToAnalyze = doc.content;
    let source: 'document' | 'selection' = 'document';

    if (textareaRef.current) {
        const { selectionStart, selectionEnd, value } = textareaRef.current;
        if (selectionStart !== selectionEnd) {
            textToAnalyze = value.substring(selectionStart, selectionEnd);
            source = 'selection';
            setExtractionRange([selectionStart, selectionEnd]);
        } else {
            setExtractionRange(null);
        }
    } else {
        setExtractionRange(null);
    }
    setExtractionSource(source);

    const tasks = await geminiService.extractTasks(textToAnalyze);
    if (tasks.length > 0) {
      setPendingTasks(tasks);
      setSelectedTaskIndices(new Set(tasks.map((_, i) => i))); 
      setIsReviewingTasks(true);
    }
    setIsGenerating(false);
    setHoverMenu(null); // Close hover menu if open
  };

  const handleImproveWriting = async () => {
      if (!hoverMenu) return;
      setIsGenerating(true);
      const improved = await geminiService.improveWriting(hoverMenu.text);
      insertTextAtCursor(improved, hoverMenu.range);
      setIsGenerating(false);
      setHoverMenu(null);
  };

  const handleFixGrammar = async () => {
    if (!hoverMenu) return;
    setIsGenerating(true);
    const fixed = await geminiService.fixGrammar(hoverMenu.text);
    insertTextAtCursor(fixed, hoverMenu.range);
    setIsGenerating(false);
    setHoverMenu(null);
  };

  const handleShorten = async () => {
    if (!hoverMenu) return;
    setIsGenerating(true);
    const shorter = await geminiService.shortenText(hoverMenu.text);
    insertTextAtCursor(shorter, hoverMenu.range);
    setIsGenerating(false);
    setHoverMenu(null);
  };

  const executeSlashCommand = async (cmd: string) => {
      setSlashMenu(null);
      if (!textareaRef.current) return;
      
      // Remove the slash command text (e.g., "/draft")
      const { selectionStart } = textareaRef.current;
      // find start of slash
      const value = textareaRef.current.value;
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const slashIndex = value.indexOf('/', lineStart);
      
      // Clean up the slash command from text
      const cleanValue = value.substring(0, slashIndex) + value.substring(selectionStart);
      // Update doc temporarily without slash
      handleUpdate({ ...doc, content: cleanValue });
      
      if (cmd === 'draft') {
          const coords = getCaretCoordinates(textareaRef.current, slashIndex);
          setShowDraftInput({ x: coords.left, y: coords.top + 20 });
      } else if (cmd === 'continue') {
          setIsGenerating(true);
          const continuation = await geminiService.continueWriting(cleanValue);
          insertTextAtCursor(continuation, [slashIndex, slashIndex]); 
          setIsGenerating(false);
      } else if (cmd === 'list') {
          insertTextAtCursor("- ", [slashIndex, slashIndex]);
      } else if (cmd === 'task') {
          insertTextAtCursor("- [ ] ", [slashIndex, slashIndex]);
      } else if (cmd === 'table') {
           insertTextAtCursor(`| Column 1 | Column 2 |\n|---|---|\n| Data 1 | Data 2 |`, [slashIndex, slashIndex]);
      }
  };

  const handleDraftSubmit = async () => {
      if (!draftPrompt) return;
      setShowDraftInput(null);
      setIsGenerating(true);
      const content = await geminiService.generateDocumentContent(draftPrompt, doc.content);
      insertTextAtCursor(content);
      setIsGenerating(false);
      setDraftPrompt('');
  };

  // --- Tagging ---
  const addTag = (tag: string) => {
      const cleanTag = tag.trim();
      if (cleanTag && !doc.tags?.includes(cleanTag)) {
          handleUpdate({ ...doc, tags: [...(doc.tags || []), cleanTag] });
      }
      setTagInput('');
  };

  const removeTag = (tag: string) => {
      handleUpdate({ ...doc, tags: (doc.tags || []).filter(t => t !== tag) });
  };

  const handleAutoTag = async () => {
    if (!doc.content) return;
    setIsSuggestingTags(true);
    const suggestions = await geminiService.suggestTags(doc.content);
    if (suggestions.length > 0) {
        const currentSet = new Set(doc.tags || []);
        suggestions.forEach(s => currentSet.add(s));
        handleUpdate({ ...doc, tags: Array.from(currentSet) });
    }
    setIsSuggestingTags(false);
  };

  const handleConfirmTasks = () => {
    const tasksToAdd = pendingTasks.filter((_, i) => selectedTaskIndices.has(i));
    // Get created tasks back from App
    const createdTasks = onExtractTasks(tasksToAdd);
    
    // If source was selection, replace text with smart links
    if (extractionSource === 'selection' && extractionRange && createdTasks.length > 0) {
        const links = createdTasks.map(t => `- [ ] [${t.title}](nexus://task/${t.id})`).join('\n');
        insertTextAtCursor(links, extractionRange);
    }

    setIsReviewingTasks(false);
    setPendingTasks([]);
    setSelectedTaskIndices(new Set());
    setExtractionRange(null);
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
  
  const getPriorityColor = (p?: TaskPriority | string) => {
      switch(p) {
          case 'High': return 'text-red-600 bg-red-50';
          case 'Medium': return 'text-orange-600 bg-orange-50';
          case 'Low': return 'text-blue-600 bg-blue-50';
          default: return 'text-orange-600 bg-orange-50';
      }
  };

  // --- Render Parsed Markdown for Read Mode ---
  const renderMarkdown = (text: string) => {
    // Very basic parser to handle links and newlines
    const lines = text.split('\n');
    return lines.map((line, i) => {
        // Replace links
        const linkRegex = /\[([^\]]+)\]\((nexus:\/\/[^\)]+)\)/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = linkRegex.exec(line)) !== null) {
            if (match.index > lastIndex) {
                parts.push(line.substring(lastIndex, match.index));
            }
            const title = match[1];
            const href = match[2];
            const [_, type, id] = href.match(/nexus:\/\/([^\/]+)\/(.+)/) || [];
            
            parts.push(
                <span 
                    key={match.index} 
                    onClick={(e) => {
                        e.preventDefault();
                        if(onNavigate && type && id) onNavigate(type as any, id);
                    }}
                    className="text-blue-600 underline cursor-pointer hover:text-blue-800 bg-blue-50 px-1 rounded"
                >
                    {title}
                </span>
            );
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < line.length) {
            parts.push(line.substring(lastIndex));
        }

        return (
            <div key={i} className="min-h-[1.5em]">
                {parts.length > 0 ? parts : line}
            </div>
        );
    });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white relative font-sans">
      <div className="max-w-4xl mx-auto px-12 py-16 min-h-[calc(100vh-4rem)] relative">
        
        {/* Top Metadata Toolbar */}
        <div className="group mb-4 flex items-center justify-between">
           <div className="flex space-x-2">
             {doc.updatedAt && (
               <span className="text-[10px] uppercase tracking-widest text-gray-300">
                 Last edited {doc.updatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
               </span>
             )}
           </div>
           <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button onClick={() => setIsReadMode(!isReadMode)} className={`flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${isReadMode ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-gray-900'}`}>
                {isReadMode ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{isReadMode ? 'Edit' : 'Read'}</span>
              </button>
              <div className="w-[1px] h-3 bg-gray-200 mx-1"></div>
              <button onClick={handleSummarize} disabled={isSummarizing} className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                {isSummarizing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <AlignLeft className="w-3 h-3" />}
                <span>Summarize</span>
              </button>
              <button onClick={handleAutoTag} disabled={isSuggestingTags} className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                {isSuggestingTags ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TagIcon className="w-3 h-3" />}
                <span>Tags</span>
              </button>
              <button onClick={handleExtractTasks} disabled={isGenerating} className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ListChecks className="w-3 h-3" />}
                <span>Tasks</span>
              </button>
           </div>
        </div>

        {/* Title */}
        {isReadMode ? (
            <h1 className="w-full text-4xl font-bold text-gray-900 mb-4">{doc.title || 'Untitled'}</h1>
        ) : (
            <input
                type="text"
                value={doc.title}
                onChange={handleTitleChange}
                placeholder="Untitled"
                className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 border-none focus:ring-0 focus:outline-none bg-transparent mb-4 p-0"
            />
        )}

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-8 animate-in fade-in duration-300">
            {doc.tags?.map(tag => (
                <div key={tag} className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-600 group hover:bg-gray-200 transition-colors">
                    <span className="font-medium">#{tag}</span>
                    {!isReadMode && (
                        <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            ))}
            {!isReadMode && (
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                        <TagIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2" />
                        <input 
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addTag(tagInput); }}
                            placeholder="Add tag..."
                            className="pl-7 pr-2 py-1 bg-transparent text-xs border-none focus:ring-0 placeholder-gray-300 w-24 focus:w-32 transition-all"
                        />
                    </div>
                </div>
            )}
        </div>

        {/* --- MAIN WRITING SURFACE --- */}
        <div className="relative">
            {isReadMode ? (
                <div className="w-full min-h-[60vh] text-lg leading-relaxed text-gray-800 font-serif whitespace-pre-wrap">
                    {renderMarkdown(doc.content)}
                </div>
            ) : (
                <textarea
                    ref={textareaRef}
                    value={doc.content}
                    onChange={handleContentChange}
                    onSelect={handleSelect}
                    onKeyDown={handleKeyDown}
                    placeholder="Type '/' for commands, '[[ to link', or just start writing..."
                    className="w-full min-h-[60vh] text-lg leading-relaxed text-gray-800 border-none focus:ring-0 focus:outline-none bg-transparent resize-none p-0 placeholder-gray-200 font-serif"
                />
            )}
            
            {/* Ghost Suggestion Tooltip */}
            {ghostSuggestion && !isReadMode && (
                <div 
                    className="absolute z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-300"
                    style={{ left: ghostSuggestion.x, top: ghostSuggestion.y }}
                >
                    <div className="bg-white/80 backdrop-blur border border-purple-100 shadow-lg rounded-lg px-3 py-2 max-w-sm">
                        <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500 italic font-serif">"{ghostSuggestion.text}"</p>
                                <p className="text-[10px] text-purple-400 font-medium mt-1 uppercase tracking-wider">Press Tab to accept</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- FLOATING UI ELEMENTS --- */}

      {/* 1. Slash Command Menu */}
      {slashMenu && !isReadMode && (
          <div 
              className="fixed z-50 w-64 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
              style={{ 
                  left: textareaRef.current ? textareaRef.current.getBoundingClientRect().left + slashMenu.x : 0, 
                  top: textareaRef.current ? textareaRef.current.getBoundingClientRect().top + slashMenu.y : 0 
              }}
          >
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Basic Blocks
              </div>
              <div className="max-h-60 overflow-y-auto p-1">
                  {[
                      { id: 'continue', label: 'Continue writing', icon: Sparkles, desc: 'Let AI write the next paragraph' },
                      { id: 'draft', label: 'Draft with prompt', icon: Wand2, desc: 'Give custom instructions' },
                      { id: 'task', label: 'Task item', icon: Check, desc: 'Insert a checkbox' },
                      { id: 'list', label: 'Bullet list', icon: ListChecks, desc: 'Start a bulleted list' },
                      { id: 'table', label: 'Table', icon: TableIcon, desc: 'Insert a table' },
                  ]
                  .filter(c => !slashMenu?.query || c.id.includes(slashMenu.query.toLowerCase()) || c.label.toLowerCase().includes(slashMenu.query.toLowerCase()))
                  .map((cmd, i) => (
                          <button
                              key={cmd.id}
                              onClick={() => executeSlashCommand(cmd.id)}
                              className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-3 hover:bg-gray-100 transition-colors ${i === 0 ? 'bg-gray-50' : ''}`}
                          >
                              <div className="w-8 h-8 rounded border bg-white flex items-center justify-center text-gray-500 shadow-sm">
                                  <cmd.icon className="w-4 h-4" />
                              </div>
                              <div>
                                  <p className="text-sm font-medium text-gray-700">{cmd.label}</p>
                                  <p className="text-[10px] text-gray-400">{cmd.desc}</p>
                              </div>
                          </button>
                      ))
                  }
              </div>
          </div>
      )}

      {/* 2. Wiki Link Menu */}
      {wikiMenu && !isReadMode && (
          <div 
              className="fixed z-50 w-64 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
              style={{ 
                  left: textareaRef.current ? textareaRef.current.getBoundingClientRect().left + wikiMenu.x : 0, 
                  top: textareaRef.current ? textareaRef.current.getBoundingClientRect().top + wikiMenu.y : 0 
              }}
          >
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <LinkIcon className="w-3 h-3" /> Link to...
              </div>
              <div className="max-h-60 overflow-y-auto p-1">
                  {[
                      ...allDocuments.filter(d => d.id !== doc.id).map(d => ({ title: d.title || 'Untitled', id: d.id, type: 'document' as const })),
                      ...allTasks.map(t => ({ title: t.title, id: t.id, type: 'task' as const }))
                  ]
                  .filter(item => !wikiMenu.query || item.title.toLowerCase().includes(wikiMenu.query.toLowerCase()))
                  .map((item, i) => (
                      <button
                          key={item.id}
                          onClick={() => insertWikiLink(item)}
                          className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-3 hover:bg-gray-100 transition-colors ${i === 0 ? 'bg-gray-50' : ''}`}
                      >
                          <div className="w-6 h-6 rounded border bg-white flex items-center justify-center text-gray-500 shadow-sm">
                              {item.type === 'document' ? <FileText className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                          </div>
                          <div className="truncate">
                              <p className="text-sm font-medium text-gray-700 truncate">{item.title}</p>
                              <p className="text-[10px] text-gray-400 capitalize">{item.type}</p>
                          </div>
                      </button>
                  ))}
                  {wikiMenu.query && (
                      <div className="p-2 text-xs text-center text-gray-400">
                          Press Enter to link
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 3. Draft Input (triggered by /draft) */}
      {showDraftInput && !isReadMode && (
          <div 
            className="fixed z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-3 animate-in fade-in slide-in-from-top-2"
            style={{ 
                left: textareaRef.current ? textareaRef.current.getBoundingClientRect().left + showDraftInput.x : 0, 
                top: textareaRef.current ? textareaRef.current.getBoundingClientRect().top + showDraftInput.y : 0 
            }}
          >
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-500">
                  <Wand2 className="w-3 h-3" />
                  <span>AI Draft</span>
              </div>
              <textarea
                  autoFocus
                  value={draftPrompt}
                  onChange={(e) => setDraftPrompt(e.target.value)}
                  placeholder="What should I write about?"
                  className="w-full text-sm p-2 bg-gray-50 rounded border-gray-200 focus:border-black focus:ring-0 mb-2 resize-none h-20"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDraftSubmit(); }}}
              />
              <div className="flex justify-end gap-2">
                  <button onClick={() => setShowDraftInput(null)} className="px-2 py-1 text-xs text-gray-500 hover:text-black">Cancel</button>
                  <button onClick={handleDraftSubmit} className="px-3 py-1 bg-black text-white text-xs rounded hover:bg-gray-800">Generate</button>
              </div>
          </div>
      )}

      {/* 4. "Magic" Hover Menu */}
      {hoverMenu && !isReadMode && (
          <div 
              className="fixed z-50 bg-black text-white rounded shadow-2xl flex items-center overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              style={{ 
                left: textareaRef.current ? textareaRef.current.getBoundingClientRect().left + hoverMenu.x : 0, 
                top: textareaRef.current ? textareaRef.current.getBoundingClientRect().top + hoverMenu.y : 0 
            }}
          >
              <button onClick={handleImproveWriting} className="p-2 hover:bg-gray-800 transition-colors flex items-center gap-1 border-r border-gray-800" title="Improve Writing">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-medium">Improve</span>
              </button>
              <button onClick={handleShorten} className="p-2 hover:bg-gray-800 transition-colors flex items-center gap-1 border-r border-gray-800" title="Shorten">
                  <Scissors className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Shorten</span>
              </button>
              <button onClick={handleFixGrammar} className="p-2 hover:bg-gray-800 transition-colors flex items-center gap-1 border-r border-gray-800" title="Fix Grammar">
                  <SpellCheck className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleExtractTasks} className="p-2 hover:bg-gray-800 transition-colors flex items-center gap-1" title="Create Task from Selection">
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Task</span>
              </button>
          </div>
      )}

      {/* --- MODALS (Summary, Tasks) --- */}
      {summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setSummary(null)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 ring-1 ring-gray-100 animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <AlignLeft className="w-4 h-4 text-gray-500" />
                        Document Summary
                    </h3>
                    <button onClick={() => setSummary(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-serif">
                    {summary}
                </div>
                <div className="p-4 border-t border-gray-50 flex justify-end gap-2 bg-gray-50/50">
                    <button onClick={() => setSummary(null)} className="px-4 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800 font-medium shadow-sm">Close</button>
                </div>
            </div>
        </div>
      )}

      {isReviewingTasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setIsReviewingTasks(false)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 ring-1 ring-gray-100 animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-gray-500" />
                        Found {pendingTasks.length} Tasks {extractionSource === 'selection' && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-normal">from selection</span>}
                    </h3>
                    <button onClick={() => setIsReviewingTasks(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto space-y-1">
                    {pendingTasks.map((task, idx) => (
                        <div key={idx} onClick={() => toggleTaskSelection(idx)} className={`group p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${selectedTaskIndices.has(idx) ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50 border-transparent opacity-60 hover:opacity-80'}`}>
                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${selectedTaskIndices.has(idx) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                                {selectedTaskIndices.has(idx) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${selectedTaskIndices.has(idx) ? 'text-gray-900' : 'text-gray-500'}`}>{task.title}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    {task.assignee && (<div className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"><User className="w-3 h-3" /><span>{task.assignee}</span></div>)}
                                    <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}><Flag className="w-3 h-3" /><span>{task.priority || 'Medium'}</span></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-50 flex justify-end gap-2 bg-gray-50/50">
                    <button onClick={() => setIsReviewingTasks(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium">Cancel</button>
                    <button onClick={handleConfirmTasks} disabled={selectedTaskIndices.size === 0} className="px-4 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"><span>Add {selectedTaskIndices.size} Tasks</span><Check className="w-3.5 h-3.5" /></button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
