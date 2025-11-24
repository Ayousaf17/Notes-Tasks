
import React, { useState, useRef, useEffect } from 'react';
import { Document, Task, TaskPriority } from '../types';
import { Wand2, ListChecks, RefreshCw, X, Check, User, Flag, AlignLeft, Tag as TagIcon, Sparkles, Edit3, Eye, SpellCheck, Scissors, Table as TableIcon, Link as LinkIcon, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface DocumentEditorProps {
  document: Document;
  allDocuments?: Document[];
  allTasks?: Task[];
  onUpdate: (updatedDoc: Document) => void;
  onExtractTasks: (tasks: Partial<Task>[]) => Task[];
  onNavigate?: (type: 'document' | 'task', id: string) => void;
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

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
    document: doc, 
    allDocuments = [],
    allTasks = [],
    onUpdate, 
    onExtractTasks,
    onNavigate
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isReadMode, setIsReadMode] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [slashMenu, setSlashMenu] = useState<{ x: number, y: number, query: string } | null>(null);
  const [hoverMenu, setHoverMenu] = useState<{ x: number, y: number, text: string, range: [number, number] } | null>(null);
  
  useEffect(() => {
    if (textareaRef.current && !isReadMode) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [doc.content, isReadMode, isZenMode]);

  // Handle ESC to exit Zen Mode
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isZenMode) {
            setIsZenMode(false);
        }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isZenMode]);

  const handleUpdate = (newDoc: Document) => onUpdate(newDoc);
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const { selectionStart } = e.target;
    if (newVal[selectionStart - 1] === '/') {
        const coords = getCaretCoordinates(e.target, selectionStart);
        setSlashMenu({ x: coords.left, y: coords.top + 24, query: '' });
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
          setHoverMenu({ x: coords.left - 40, y: coords.top - 50, text: doc.content.substring(selectionStart, selectionEnd), range: [selectionStart, selectionEnd] });
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

  return (
    <div className={`flex-1 h-full overflow-y-auto bg-white font-sans transition-all duration-500 ${isZenMode ? 'fixed inset-0 z-[100] px-0 py-0' : ''}`}>
      <div className={`mx-auto transition-all duration-500 min-h-[calc(100vh-4rem)] ${isZenMode ? 'max-w-4xl px-8 py-20' : 'max-w-3xl px-8 py-12'}`}>
        
        {/* Minimal Toolbar */}
        <div className="flex items-center justify-between mb-8 group">
           {!isZenMode && (
               <div className="text-[10px] text-gray-300 uppercase tracking-widest">
                 {doc.updatedAt && `Last edited ${doc.updatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
               </div>
           )}
           <div className={`flex items-center space-x-4 transition-opacity ${isZenMode ? 'opacity-0 hover:opacity-100 absolute top-6 right-8' : 'opacity-0 group-hover:opacity-100'}`}>
              <button onClick={() => setIsReadMode(!isReadMode)} className="text-gray-400 hover:text-black transition-colors" title="Toggle Read Mode">
                {isReadMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={handleSummarize} className="text-gray-400 hover:text-black transition-colors" title="Summarize">
                {isSummarizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlignLeft className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsZenMode(!isZenMode)} className="text-gray-400 hover:text-black transition-colors" title={isZenMode ? "Exit Zen Mode (ESC)" : "Enter Zen Mode"}>
                {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
           </div>
        </div>

        {/* Title */}
        {isReadMode ? (
            <h1 className="w-full text-4xl font-bold text-gray-900 mb-6 tracking-tight leading-tight">{doc.title || 'Untitled'}</h1>
        ) : (
            <input
                type="text"
                value={doc.title}
                onChange={(e) => handleUpdate({ ...doc, title: e.target.value })}
                placeholder="Untitled"
                className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 border-none focus:ring-0 bg-transparent mb-6 p-0 tracking-tight leading-tight"
            />
        )}

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
            {doc.tags?.map(tag => (
                <span key={tag} className="text-xs text-gray-400 font-medium">#{tag}</span>
            ))}
            {!isReadMode && (
                <input 
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdate({ ...doc, tags: [...(doc.tags || []), tagInput] }); setTagInput(''); }}}
                    placeholder="+ tag"
                    className="text-xs text-gray-300 border-none focus:ring-0 p-0 w-20 bg-transparent placeholder-gray-200 hover:placeholder-gray-400"
                />
            )}
        </div>

        {/* Editor */}
        <div className="relative">
            {isReadMode ? (
                <div className="w-full min-h-[60vh] text-lg text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {doc.content}
                </div>
            ) : (
                <textarea
                    ref={textareaRef}
                    value={doc.content}
                    onChange={handleContentChange}
                    onSelect={handleSelect}
                    placeholder="Start writing..."
                    className="w-full min-h-[60vh] text-lg text-gray-800 border-none focus:ring-0 bg-transparent resize-none p-0 placeholder-gray-200 leading-relaxed"
                />
            )}
        </div>

        {/* Hover Menu */}
        {hoverMenu && !isReadMode && (
          <div className="fixed z-50 bg-black text-white rounded shadow-xl flex items-center px-1 py-1" style={{ left: hoverMenu.x, top: hoverMenu.y }}>
              <button className="p-2 hover:bg-gray-800 rounded"><Sparkles className="w-3 h-3" /></button>
          </div>
        )}

        {/* Summary Modal */}
        {summary && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm" onClick={() => setSummary(null)}>
                <div className="bg-white p-8 rounded-lg shadow-xl border border-gray-100 max-w-lg w-full">
                    <h3 className="text-lg font-medium mb-4">Summary</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
