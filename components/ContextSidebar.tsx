import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Document, Task } from '../types';
import { GitGraph, Link as LinkIcon, CheckCircle, ArrowLeftCircle, FileText, Send, Sparkles, X, GripHorizontal, GripVertical } from 'lucide-react';
import { geminiService, DOCUMENT_STYLE_GUIDE } from '../services/geminiService';

interface ContextSidebarProps {
  currentDoc: Document;
  allDocs: Document[];
  allTasks: Task[];
  onNavigate: (type: 'document' | 'task', id: string) => void;
  onUpdateDocument?: (doc: Document) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export const ContextSidebar: React.FC<ContextSidebarProps> = ({ 
    currentDoc, 
    allDocs, 
    allTasks, 
    onNavigate, 
    onUpdateDocument,
    isMobile = false,
    onClose
}) => {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  
  // Resizing State
  const [width, setWidth] = useState(288); // Default 288px (w-72)
  const [chatHeight, setChatHeight] = useState(33); // Percentage (33%)
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizingWidth = useRef(false);
  const isResizingHeight = useRef(false);

  // Resize Handlers
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isResizingWidth.current) {
              const newWidth = Math.min(Math.max(200, window.innerWidth - e.clientX), 600);
              setWidth(newWidth);
          }
          if (isResizingHeight.current && sidebarRef.current) {
              const containerHeight = sidebarRef.current.clientHeight;
              const newHeight = Math.min(Math.max(20, (1 - (e.clientY - sidebarRef.current.getBoundingClientRect().top) / containerHeight) * 100), 80);
              setChatHeight(newHeight);
          }
      };

      const handleMouseUp = () => {
          isResizingWidth.current = false;
          isResizingHeight.current = false;
          document.body.style.cursor = 'default';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, []);

  // 1. Calculate Backlinks
  const backlinks = useMemo(() => {
      return allDocs.filter(d => {
          if (d.id === currentDoc.id) return false;
          const hasNexusLink = d.content.includes(`nexus://document/${currentDoc.id}`);
          const hasWikiLink = d.content.toLowerCase().includes(`[[${currentDoc.title.toLowerCase()}]]`);
          return hasNexusLink || hasWikiLink;
      });
  }, [currentDoc, allDocs]);

  // 2. Calculate Outgoing Links
  const outgoingLinks = useMemo(() => {
      const links: Document[] = [];
      const regexNexus = /nexus:\/\/document\/([a-zA-Z0-9-]+)/g;
      let match;
      while ((match = regexNexus.exec(currentDoc.content)) !== null) {
          const linkedId = match[1];
          const found = allDocs.find(d => d.id === linkedId);
          if (found && !links.find(l => l.id === found.id)) links.push(found);
      }
      const regexWiki = /\[\[(.*?)\]\]/g;
      let wikiMatch;
      while ((wikiMatch = regexWiki.exec(currentDoc.content)) !== null) {
          const title = wikiMatch[1];
          const found = allDocs.find(d => d.title.toLowerCase() === title.toLowerCase());
          if (found && !links.find(l => l.id === found.id)) links.push(found);
      }
      return links;
  }, [currentDoc, allDocs]);

  // 3. Related Tasks
  const relatedTasks = useMemo(() => {
      const linked = allTasks.filter(t => {
          const inContent = currentDoc.content.includes(`nexus://task/${t.id}`);
          const titleMatch = t.description?.includes(currentDoc.title);
          return inContent || titleMatch;
      });
      if (linked.length > 0) return linked;
      return allTasks.filter(t => t.projectId === currentDoc.projectId);
  }, [currentDoc, allTasks]);

  const handleSendChat = async () => {
      if (!chatInput.trim()) return;
      const userMsg = chatInput;
      setChatInput('');
      setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsThinking(true);

      const systemContext = `
      You are an EXPERT EDITOR ARCHITECT for the document "${currentDoc.title}".
      
      CURRENT CONTENT:
      """
      ${currentDoc.content}
      """
      
      ${DOCUMENT_STYLE_GUIDE}
      
      INSTRUCTIONS:
      1. If the user asks for a rewrite, expansion, or new section, output the NEW text block wrapped in \`:::REPLACE_TEXT:::\` and \`:::END_REPLACE_TEXT:::\`.
      2. Ensure any new content strictly follows the AUSTIN WEALTH STYLE GUIDE.
      3. If the user asks for general advice, just chat normally.
      4. Your goal is to improve the document's structure and clarity according to the guide.
      `;

      // Simplified chat for context window
      const response = await geminiService.chat([], userMsg, [], systemContext);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
      setIsThinking(false);
  };

  const applyChange = (text: string, mode: 'append' | 'replace') => {
      if (!onUpdateDocument) return;
      let newContent = currentDoc.content;
      if (mode === 'append') {
          newContent += `\n\n${text}`;
      } else {
          newContent = text; // Full replacement of document for "Replace"
      }
      onUpdateDocument({ ...currentDoc, content: newContent, updatedAt: new Date() });
  };

  return (
    <div 
        ref={sidebarRef}
        className="bg-white dark:bg-black border-l border-gray-100 dark:border-gray-800 h-full flex flex-col shrink-0 overflow-hidden transition-colors duration-200 relative shadow-xl z-20"
        style={{ width: isMobile ? '100%' : `${width}px` }}
    >
      {/* Width Resizer Handle (Desktop Only) */}
      {!isMobile && (
          <div 
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500/50 z-50 transition-colors"
              onMouseDown={() => { isResizingWidth.current = true; document.body.style.cursor = 'col-resize'; }}
          />
      )}

      {/* Header (Mobile Close) */}
      {isMobile && (
          <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold">Context & Editor</span>
              <button onClick={onClose}><X className="w-5 h-5" /></button>
          </div>
      )}
      
      {/* Scrollable Top Section: Graph Links */}
      <div className="flex-1 overflow-y-auto" style={{ height: `${100 - chatHeight}%` }}>
          <div className="p-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/50">
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <GitGraph className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Context Graph</span>
              </div>
          </div>

          <div className="p-4 space-y-8">
            {/* Connected Tasks */}
            <div>
                <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-3 flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" />
                    <span>Project Tasks</span>
                </h4>
                {relatedTasks.length > 0 ? (
                    <div className="space-y-2">
                        {relatedTasks.map(t => (
                            <button 
                                key={t.id}
                                onClick={() => onNavigate('task', t.id)}
                                className="w-full text-left p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-500 transition-colors group"
                            >
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white truncate">{t.title}</div>
                                <div className="text-[10px] text-gray-400 mt-0.5 flex justify-between">
                                    <span>{t.status}</span>
                                    <span>{t.assignee || 'Unassigned'}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-gray-300 dark:text-gray-600 italic">No tasks in this project.</div>
                )}
            </div>

            {/* Backlinks */}
            <div>
                 <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-3 flex items-center gap-2">
                    <ArrowLeftCircle className="w-3 h-3" />
                    <span>Mentioned In</span>
                </h4>
                {backlinks.length > 0 ? (
                    <div className="space-y-1">
                        {backlinks.map(d => (
                            <button
                                key={d.id}
                                onClick={() => onNavigate('document', d.id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <FileText className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                <span className="text-xs truncate">{d.title}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-gray-300 dark:text-gray-600 italic">No backlinks found.</div>
                )}
            </div>

            {/* Outgoing Links */}
            <div>
                 <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-3 flex items-center gap-2">
                    <LinkIcon className="w-3 h-3" />
                    <span>Links To</span>
                </h4>
                {outgoingLinks.length > 0 ? (
                    <div className="space-y-1">
                        {outgoingLinks.map(d => (
                            <button
                                key={d.id}
                                onClick={() => onNavigate('document', d.id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <FileText className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                <span className="text-xs truncate">{d.title}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-gray-300 dark:text-gray-600 italic">No outgoing links.</div>
                )}
            </div>
          </div>
      </div>

      {/* Height Resizer Handle */}
      <div 
          className="h-1 bg-gray-100 dark:bg-gray-800 hover:bg-purple-500/50 cursor-row-resize z-30 flex items-center justify-center transition-colors"
          onMouseDown={() => { isResizingHeight.current = true; document.body.style.cursor = 'row-resize'; }}
      >
          <GripHorizontal className="w-3 h-3 text-gray-300 dark:text-gray-600 pointer-events-none" />
      </div>

      {/* Editor Agent Chat */}
      <div className="bg-gray-50/50 dark:bg-gray-900/30 flex flex-col min-h-[150px]" style={{ height: `${chatHeight}%` }}>
          <div className="p-2 border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Editor Agent
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {chatHistory.map((msg, i) => {
                  // Check for proposed text block
                  const proposedMatch = msg.text.match(/:::REPLACE_TEXT:::([\s\S]*?):::END_REPLACE_TEXT:::/);
                  const displayContent = msg.text.replace(/:::REPLACE_TEXT:::[\s\S]*?:::END_REPLACE_TEXT:::/g, '').trim();
                  
                  return (
                      <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-2 rounded-lg text-xs max-w-[90%] ${msg.role === 'user' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                              {displayContent}
                          </div>
                          {proposedMatch && (
                              <div className="mt-1 w-full bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded p-2">
                                  <div className="text-[10px] text-purple-500 font-bold mb-1">Generated Content</div>
                                  <div className="text-[10px] italic text-gray-600 dark:text-gray-400 line-clamp-3 mb-2">{proposedMatch[1]}</div>
                                  <div className="flex gap-1">
                                      <button 
                                        onClick={() => applyChange(proposedMatch[1], 'append')}
                                        className="flex-1 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700"
                                      >
                                          Append
                                      </button>
                                      <button 
                                        onClick={() => { if(confirm('Replace entire document?')) applyChange(proposedMatch[1], 'replace'); }}
                                        className="flex-1 py-1 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded hover:bg-purple-50 dark:hover:bg-purple-900/40"
                                      >
                                          Replace Doc
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>
                  );
              })}
              {isThinking && <div className="text-[10px] text-gray-400 p-2 animate-pulse">Thinking...</div>}
          </div>
          <div className="p-2">
              <div className="relative">
                  <input 
                      type="text" 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                      placeholder="Ask editor (e.g. 'Rewrite intro')"
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 pr-8 text-xs focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
                  />
                  <button onClick={handleSendChat} className="absolute right-1.5 top-1.5 text-gray-400 hover:text-black dark:hover:text-white">
                      <Send className="w-3 h-3" />
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};