
import React, { useState, useRef, useEffect } from 'react';
import { Document, Task, TaskPriority, TaskStatus } from '../types';
import { Wand2, ListChecks, RefreshCw, X, Check, User, Flag, AlignLeft, Tag as TagIcon, Sparkles, Edit3, Eye, SpellCheck, Scissors, Table as TableIcon, Link as LinkIcon, FileText, Maximize2, Minimize2, Heading1, Heading2, List, CheckSquare, Plus, Loader2, Trash2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface DocumentEditorProps {
  document: Document;
  allDocuments?: Document[];
  allTasks?: Task[];
  onUpdate: (updatedDoc: Document) => void;
  onExtractTasks: (tasks: Partial<Task>[]) => Task[];
  onNavigate?: (type: 'document' | 'task', id: string) => void;
  onDelete: () => void;
}

const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const { offsetLeft: elementLeft, offsetTop: elementTop } = element;
    const div = document.createElement('div');
    const styles = getComputedStyle(element);
    div.style.cssText = `position:absolute; visibility:hidden; white-space:pre-wrap; word-wrap:break-word; width:${styles.width}; font:${styles.font}; padding:${styles.padding}; border:${styles.border}; line-height:${styles.lineHeight}; box-sizing:${styles.boxSizing};`;
    div.textContent = element.value.substring(0, position);
    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);
    document.body.appendChild(div);
    const { offsetLeft: spanLeft, offsetTop: spanTop } = span;
    document.body.removeChild(div);
    return { left: elementLeft + spanLeft, top: elementTop + spanTop };
};

// Enhanced Markdown Renderer with Navigation support
const MarkdownRenderer: React.FC<{ 
    text: string; 
    onNavigate?: (type: 'document' | 'task', id: string) => void;
    allDocuments?: Document[]; 
}> = ({ text, onNavigate, allDocuments }) => {
    const lines = text.split('\n');
    let inCodeBlock = false;

    const handleLinkClick = (title: string) => {
        if (!onNavigate || !allDocuments) return;
        const targetDoc = allDocuments.find(d => d.title.toLowerCase() === title.toLowerCase());
        if (targetDoc) {
            onNavigate('document', targetDoc.id);
        } else {
            console.log("Document not found:", title);
        }
    };

    return (
        <div className="space-y-4 text-gray-800 dark:text-gray-200 leading-loose">
            {lines.map((line, i) => {
                // Code Block handling
                if (line.startsWith('```')) {
                    inCodeBlock = !inCodeBlock;
                    return null; // Hide the delimiter
                }
                if (inCodeBlock) {
                    return <div key={i} className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 overflow-x-auto my-4">{line}</div>
                }

                // Blockquote
                if (line.startsWith('> ')) {
                    return (
                        <div key={i} className="border-l-4 border-purple-300 dark:border-purple-600 pl-4 py-2 italic text-gray-600 dark:text-gray-400 my-6 bg-gray-50 dark:bg-gray-900/50 rounded-r-lg">
                            {line.slice(2)}
                        </div>
                    );
                }

                // Horizontal Rule
                if (line.trim() === '---') {
                    return <hr key={i} className="my-10 border-gray-200 dark:border-gray-800" />;
                }

                // Headers
                if (line.startsWith('# ')) return <h1 key={i} className="text-3xl md:text-4xl font-bold mt-12 mb-8 text-gray-900 dark:text-white tracking-tight">{line.slice(2)}</h1>;
                if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-semibold mt-10 mb-5 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">{line.slice(3)}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-medium mt-8 mb-4 text-gray-900 dark:text-white">{line.slice(4)}</h3>;
                
                // List Items
                if (line.trim().startsWith('- [ ]')) return (
                    <div key={i} className="flex items-start gap-3 pl-1 my-2">
                        <div className="w-4 h-4 mt-1.5 border border-gray-300 dark:border-gray-600 rounded shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300">{line.replace('- [ ]', '').trim()}</span>
                    </div>
                );
                if (line.trim().startsWith('- [x]')) return (
                    <div key={i} className="flex items-start gap-3 pl-1 my-2">
                        <div className="w-4 h-4 mt-1.5 bg-black dark:bg-white border border-black dark:border-white rounded shrink-0 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white dark:text-black" />
                        </div>
                        <span className="text-gray-400 dark:text-gray-500 line-through">{line.replace('- [x]', '').trim()}</span>
                    </div>
                );
                if (line.trim().startsWith('- ')) return <li key={i} className="ml-4 list-disc pl-2 text-gray-700 dark:text-gray-300 my-2 marker:text-gray-400">{line.slice(2)}</li>;
                if (line.trim().match(/^\d+\. /)) return <li key={i} className="ml-4 list-decimal pl-2 text-gray-700 dark:text-gray-300 my-2 marker:text-gray-400">{line.replace(/^\d+\. /, '')}</li>;

                // Empty lines
                if (!line.trim()) return <div key={i} className="h-4" />;

                // Paragraphs with bold handling
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                    <p key={i} className="text-base md:text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                        {parts.map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j} className="font-semibold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
                            }
                            // Link handling [[Link]]
                            const linkParts = part.split(/(\[\[.*?\]\])/g);
                            if (linkParts.length > 1) {
                                return linkParts.map((lp, k) => {
                                    if (lp.startsWith('[[') && lp.endsWith(']]')) {
                                        const linkText = lp.slice(2, -2);
                                        return (
                                            <span 
                                                key={`${j}-${k}`} 
                                                onClick={() => handleLinkClick(linkText)}
                                                className="text-purple-600 dark:text-purple-400 underline decoration-purple-300 dark:decoration-purple-700 underline-offset-2 cursor-pointer hover:text-purple-800 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded px-0.5 transition-colors"
                                            >
                                                {linkText}
                                            </span>
                                        );
                                    }
                                    return lp;
                                });
                            }
                            return part;
                        })}
                    </p>
                );
            })}
        </div>
    );
};

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
    document: doc, 
    allDocuments = [],
    allTasks = [],
    onUpdate, 
    onExtractTasks,
    onNavigate,
    onDelete
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isReadMode, setIsReadMode] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isExtractingTask, setIsExtractingTask] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [slashMenu, setSlashMenu] = useState<{ x: number, y: number, query: string } | null>(null);
  const [hoverMenu, setHoverMenu] = useState<{ x: number, y: number, text: string, range: [number, number] } | null>(null);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && !isReadMode) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [doc.content, isReadMode, isZenMode]);

  // Handle ESC to exit Zen Mode
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (isZenMode) setIsZenMode(false);
            if (slashMenu) setSlashMenu(null);
        }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isZenMode, slashMenu]);

  const handleUpdate = (newDoc: Document) => onUpdate(newDoc);
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const { selectionStart } = e.target;
    
    // Check for Slash Command trigger
    if (newVal[selectionStart - 1] === '/') {
        const coords = getCaretCoordinates(e.target, selectionStart);
        // Adjust for scroll position
        const rect = e.target.getBoundingClientRect();
        setSlashMenu({ 
            x: Math.min(rect.left + coords.left, window.innerWidth - 200), // Prevent overflow
            y: rect.top + coords.top + 30 + window.scrollY, 
            query: '' 
        });
    } else if (slashMenu) {
        setSlashMenu(null); 
    }
    
    handleUpdate({ ...doc, content: newVal, updatedAt: new Date() });
  };

  const handleSelect = () => {
      if (!textareaRef.current) return;
      const { selectionStart, selectionEnd } = textareaRef.current;
      if (selectionStart !== selectionEnd) {
          const coords = getCaretCoordinates(textareaRef.current, selectionEnd);
           const rect = textareaRef.current.getBoundingClientRect();
           setHoverMenu({ 
               x: Math.max(20, Math.min(rect.left + coords.left - 60, window.innerWidth - 120)), // Bounds check
               y: rect.top + coords.top - 50 + window.scrollY, 
               text: doc.content.substring(selectionStart, selectionEnd), 
               range: [selectionStart, selectionEnd] 
           });
      } else {
          setHoverMenu(null);
      }
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const result = await geminiService.summarizeDocument(doc.content);
    setSummary(result);
    setIsSummarizing(false);
  };

  const handleExtractTaskFromSelection = async () => {
      if (hoverMenu && hoverMenu.text) {
          setIsExtractingTask(true);
          
          let tasksToCreate: Partial<Task>[] = [];
          
          if (hoverMenu.text.length > 100) {
              tasksToCreate = await geminiService.extractTasks(hoverMenu.text);
          } else {
              tasksToCreate = [{
                  title: hoverMenu.text,
                  status: TaskStatus.TODO,
                  priority: TaskPriority.MEDIUM
              }];
          }

          if (tasksToCreate.length > 0) {
              onExtractTasks(tasksToCreate);
          }
          
          setIsExtractingTask(false);
          setHoverMenu(null);
      }
  };

  const executeSlashCommand = (command: string) => {
      if (!textareaRef.current) return;
      const { selectionStart } = textareaRef.current;
      const textBefore = doc.content.substring(0, selectionStart);
      const slashIndex = textBefore.lastIndexOf('/');
      if (slashIndex === -1) return;

      let insertText = '';
      if (command === 'h1') insertText = '# ';
      if (command === 'h2') insertText = '## ';
      if (command === 'bullet') insertText = '- ';
      if (command === 'task') insertText = '- [ ] ';
      
      const newContent = doc.content.substring(0, slashIndex) + insertText + doc.content.substring(selectionStart);
      
      handleUpdate({ ...doc, content: newContent, updatedAt: new Date() });
      setSlashMenu(null);
      
      setTimeout(() => {
          textareaRef.current?.focus();
          const newPos = slashIndex + insertText.length;
          textareaRef.current?.setSelectionRange(newPos, newPos);
      }, 10);
  };

  return (
    <div className={`flex-1 h-full overflow-y-auto bg-white dark:bg-black font-sans transition-all duration-500 ${isZenMode ? 'fixed inset-0 z-[100] px-0 py-0' : ''}`}>
      {/* Container widened to max-w-6xl to utilize entire page space */}
      <div className={`mx-auto transition-all duration-500 min-h-[calc(100vh-4rem)] ${isZenMode ? 'max-w-7xl px-4 md:px-8 py-20' : 'max-w-6xl px-6 md:px-8 pt-6 md:pt-24 pb-32'}`}>
        
        {/* Minimal Toolbar */}
        <div className="flex items-center justify-between mb-8 group relative">
           {!isZenMode && (
               <div className="text-[10px] text-gray-300 dark:text-gray-600 uppercase tracking-widest">
                 {doc.updatedAt && `Last edited ${doc.updatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
               </div>
           )}
           <div className={`flex items-center space-x-4 transition-opacity ${isZenMode ? 'opacity-0 hover:opacity-100 absolute top-6 right-8' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
              <button onClick={() => setIsReadMode(!isReadMode)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors" title="Toggle Read Mode">
                {isReadMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={handleSummarize} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors" title="Summarize">
                {isSummarizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlignLeft className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsZenMode(!isZenMode)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors" title={isZenMode ? "Exit Zen Mode (ESC)" : "Enter Zen Mode"}>
                {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-800" />
              <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete Page">
                <Trash2 className="w-4 h-4" />
              </button>
           </div>
        </div>

        {/* Title */}
        {isReadMode ? (
            <h1 className="w-full text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">{doc.title || 'Untitled'}</h1>
        ) : (
            <input
                type="text"
                value={doc.title}
                onChange={(e) => handleUpdate({ ...doc, title: e.target.value })}
                placeholder="Untitled"
                className="w-full text-3xl md:text-4xl font-bold text-gray-900 dark:text-white placeholder-gray-200 dark:placeholder-gray-700 border-none focus:ring-0 bg-transparent mb-6 p-0 tracking-tight leading-tight"
            />
        )}

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
            {doc.tags?.map(tag => (
                <span key={tag} className="text-xs text-gray-400 dark:text-gray-500 font-medium">#{tag}</span>
            ))}
            {!isReadMode && (
                <input 
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdate({ ...doc, tags: [...(doc.tags || []), tagInput] }); setTagInput(''); }}}
                    placeholder="+ tag"
                    className="text-xs text-gray-300 dark:text-gray-600 border-none focus:ring-0 p-0 w-20 bg-transparent placeholder-gray-200 dark:placeholder-gray-700 hover:placeholder-gray-400"
                />
            )}
        </div>

        {/* Editor */}
        <div className="relative">
            {isReadMode ? (
                <MarkdownRenderer text={doc.content} onNavigate={onNavigate} allDocuments={allDocuments} />
            ) : (
                <textarea
                    ref={textareaRef}
                    value={doc.content}
                    onChange={handleContentChange}
                    onSelect={handleSelect}
                    placeholder="Start writing..."
                    className="w-full min-h-[60vh] text-base md:text-lg text-gray-800 dark:text-gray-200 border-none focus:ring-0 bg-transparent resize-none p-0 placeholder-gray-200 dark:placeholder-gray-700 leading-loose"
                />
            )}
        </div>
        
        {/* Mobile Zen Mode Exit Button (Since no ESC key) */}
        {isZenMode && (
            <button 
                onClick={() => setIsZenMode(false)}
                className="fixed top-6 left-6 z-[110] md:hidden p-3 bg-black/50 dark:bg-white/20 backdrop-blur rounded-full text-white dark:text-white shadow-lg"
            >
                <Minimize2 className="w-5 h-5" />
            </button>
        )}

        {/* Slash Menu */}
        {slashMenu && !isReadMode && (
            <div 
                className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg py-1 w-48 overflow-hidden animate-in zoom-in-95 duration-100" 
                style={{ left: slashMenu.x, top: slashMenu.y }}
            >
                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">Basic Blocks</div>
                <button onClick={() => executeSlashCommand('h1')} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <Heading1 className="w-4 h-4" /> Heading 1
                </button>
                <button onClick={() => executeSlashCommand('h2')} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <Heading2 className="w-4 h-4" /> Heading 2
                </button>
                <button onClick={() => executeSlashCommand('bullet')} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <List className="w-4 h-4" /> Bullet List
                </button>
                <button onClick={() => executeSlashCommand('task')} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <ListChecks className="w-4 h-4" /> Task Item
                </button>
            </div>
        )}

        {/* Hover Menu */}
        {hoverMenu && !isReadMode && (
          <div className="fixed z-50 bg-black dark:bg-white text-white dark:text-black rounded-lg shadow-xl flex items-center px-2 py-1.5 gap-2 transform -translate-x-1/2" style={{ left: hoverMenu.x, top: hoverMenu.y }}>
              <button onClick={handleExtractTaskFromSelection} className="p-1.5 hover:bg-gray-800 dark:hover:bg-gray-200 rounded transition-colors" title="Create Task from Selection">
                  {isExtractingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
              </button>
              <div className="w-px h-4 bg-gray-700 dark:bg-gray-300" />
              <button className="p-1.5 hover:bg-gray-800 dark:hover:bg-gray-200 rounded transition-colors" title="Improve Writing">
                  <Sparkles className="w-4 h-4" />
              </button>
          </div>
        )}

        {/* Summary Modal */}
        {summary && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm p-4" onClick={() => setSummary(null)}>
                <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-xl border border-gray-100 dark:border-gray-800 max-w-lg w-full max-h-[80vh] overflow-y-auto">
                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Summary</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{summary}</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
