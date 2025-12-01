import React, { useMemo } from 'react';
import { Document, Task } from '../types';
import { GitGraph, Link as LinkIcon, CheckCircle, ArrowLeftCircle, FileText } from 'lucide-react';

interface ContextSidebarProps {
  currentDoc: Document;
  allDocs: Document[];
  allTasks: Task[];
  onNavigate: (type: 'document' | 'task', id: string) => void;
}

export const ContextSidebar: React.FC<ContextSidebarProps> = ({ currentDoc, allDocs, allTasks, onNavigate }) => {
  
  // 1. Calculate Backlinks: Docs that link TO currentDoc
  const backlinks = useMemo(() => {
      // Check for nexus:// links OR [[Title]] links
      return allDocs.filter(d => {
          if (d.id === currentDoc.id) return false;
          const hasNexusLink = d.content.includes(`nexus://document/${currentDoc.id}`);
          const hasWikiLink = d.content.toLowerCase().includes(`[[${currentDoc.title.toLowerCase()}]]`);
          return hasNexusLink || hasWikiLink;
      });
  }, [currentDoc, allDocs]);

  // 2. Calculate Outgoing Links: Docs that currentDoc links TO
  const outgoingLinks = useMemo(() => {
      const links: Document[] = [];
      
      // Nexus Links
      const regexNexus = /nexus:\/\/document\/([a-zA-Z0-9-]+)/g;
      let match;
      while ((match = regexNexus.exec(currentDoc.content)) !== null) {
          const linkedId = match[1];
          const found = allDocs.find(d => d.id === linkedId);
          if (found && !links.find(l => l.id === found.id)) {
              links.push(found);
          }
      }

      // Wiki Links [[Title]]
      const regexWiki = /\[\[(.*?)\]\]/g;
      let wikiMatch;
      while ((wikiMatch = regexWiki.exec(currentDoc.content)) !== null) {
          const title = wikiMatch[1];
          const found = allDocs.find(d => d.title.toLowerCase() === title.toLowerCase());
          if (found && !links.find(l => l.id === found.id)) {
              links.push(found);
          }
      }

      return links;
  }, [currentDoc, allDocs]);

  // 3. Calculate Related Tasks
  // Logic: If specific tasks are linked/mentioned, show them.
  // Fallback: If NONE are found, show ALL tasks for this project to ensure visibility.
  const relatedTasks = useMemo(() => {
      const linked = allTasks.filter(t => {
          const inContent = currentDoc.content.includes(`nexus://task/${t.id}`);
          const titleMatch = t.description?.includes(currentDoc.title);
          return inContent || titleMatch;
      });

      if (linked.length > 0) return linked;

      // Fallback: Show all project tasks
      return allTasks.filter(t => t.projectId === currentDoc.projectId);
  }, [currentDoc, allTasks]);

  return (
    <div className="w-72 bg-white dark:bg-black border-l border-gray-100 dark:border-gray-800 h-full flex flex-col shrink-0 overflow-y-auto transition-colors duration-200">
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
  );
};