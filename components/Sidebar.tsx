
import React from 'react';
import { FileText, Layout, Calendar, Settings, Plus, Cloud, Command, Briefcase, Folder, Inbox, Network, Home } from 'lucide-react';
import { ViewMode, Document, Project } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  documents: Document[]; // Filtered by active project
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  activeDocumentId: string | null;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  documents,
  onSelectDocument,
  onCreateDocument,
  activeDocumentId,
  isGoogleConnected,
  onConnectGoogle
}) => {
  return (
    <div className="w-64 bg-[#fbfbfb] border-r border-gray-100 h-full flex flex-col shrink-0 font-sans selection:bg-gray-200">
      {/* Brand Header */}
      <div className="p-5 flex items-center space-x-3 mb-2">
        <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">A</span>
        </div>
        <span className="font-semibold text-gray-900 tracking-tight">Aasani OS</span>
      </div>

      {/* Global Navigation */}
      <div className="px-3 mb-4 space-y-0.5">
          <button
            onClick={() => { onChangeView(ViewMode.HOME); }}
            className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded transition-all duration-200 text-sm ${
                currentView === ViewMode.HOME
                ? 'bg-gray-200 text-black font-medium'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
              <Home className="w-4 h-4" />
              <span>Home</span>
          </button>
          
          <button
            onClick={() => { onChangeView(ViewMode.INBOX); }}
            className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded transition-all duration-200 text-sm ${
                currentView === ViewMode.INBOX
                ? 'bg-gray-200 text-black font-medium'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
              <Inbox className="w-4 h-4" />
              <span>Inbox</span>
          </button>
      </div>

      {/* Projects Section (OS Level) */}
      <div className="px-3 mb-6">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2 flex justify-between items-center">
              <span>Projects</span>
              <button onClick={onCreateProject} className="hover:text-black"><Plus className="w-3 h-3" /></button>
          </div>
          <div className="space-y-0.5">
              {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => {
                        onSelectProject(project.id);
                        // If we are in global views (Home/Inbox), switch to Docs when clicking a project
                        // If we are in project views (Board/Cal), stay there but switch data
                        if (currentView === ViewMode.HOME || currentView === ViewMode.INBOX) {
                            onChangeView(ViewMode.DOCUMENTS);
                        }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-sm transition-colors group ${
                        activeProjectId === project.id && currentView !== ViewMode.INBOX && currentView !== ViewMode.HOME
                        ? 'bg-white shadow-sm ring-1 ring-gray-200 text-black font-medium' 
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                      <div className="flex items-center space-x-2 truncate">
                          <span className="text-xs">{project.icon || '📂'}</span>
                          <span className="truncate">{project.title}</span>
                      </div>
                      {activeProjectId === project.id && currentView !== ViewMode.INBOX && currentView !== ViewMode.HOME && <div className="w-1.5 h-1.5 rounded-full bg-black"></div>}
                  </button>
              ))}
          </div>
      </div>

      <div className="w-full h-[1px] bg-gray-100 mb-4 mx-3 w-[calc(100%-24px)]"></div>

      {/* Context Navigation (Active Project Level) */}
      <div className="px-3 space-y-0.5">
        <button
          onClick={() => onChangeView(ViewMode.DOCUMENTS)}
          className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded transition-all duration-200 text-sm ${
            currentView === ViewMode.DOCUMENTS && !activeDocumentId
              ? 'text-gray-900 font-medium'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4 opacity-70" />
          <span>Documents</span>
        </button>
        <button
          onClick={() => onChangeView(ViewMode.BOARD)}
          className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded transition-all duration-200 text-sm ${
            currentView === ViewMode.BOARD
              ? 'text-gray-900 font-medium'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Layout className="w-4 h-4 opacity-70" />
          <span>Task Board</span>
        </button>
        <button
          onClick={() => onChangeView(ViewMode.CALENDAR)}
          className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded transition-all duration-200 text-sm ${
            currentView === ViewMode.CALENDAR
              ? 'text-gray-900 font-medium'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4 opacity-70" />
          <span>Timeline</span>
        </button>
         <button
          onClick={() => onChangeView(ViewMode.GRAPH)}
          className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded transition-all duration-200 text-sm ${
            currentView === ViewMode.GRAPH
              ? 'text-gray-900 font-medium'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Network className="w-4 h-4 opacity-70" />
          <span>Graph View</span>
        </button>
      </div>

      {/* Filtered Documents List */}
      {currentView === ViewMode.DOCUMENTS && (
        <div className="mt-6 px-3 flex-1 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="flex items-center justify-between px-3 mb-2 group">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Pages
            </span>
            <button onClick={onCreateDocument} className="text-gray-400 hover:text-black transition-colors">
                <Plus className="w-3.5 h-3.5" />
            </button>
            </div>
            <div className="space-y-0.5 ml-1 border-l border-gray-100 pl-1">
            {documents.map((doc) => (
                <button
                key={doc.id}
                onClick={() => {
                    onChangeView(ViewMode.DOCUMENTS);
                    onSelectDocument(doc.id);
                }}
                className={`w-full flex items-center px-3 py-1.5 rounded text-sm text-left truncate transition-colors ${
                    activeDocumentId === doc.id
                    ? 'text-black font-medium bg-gray-50'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
                >
                <span className="truncate">{doc.title || 'Untitled'}</span>
                </button>
            ))}
            {documents.length === 0 && (
                <div className="px-3 text-xs text-gray-300 italic">No pages in this project</div>
            )}
            </div>
        </div>
      )}

      {/* Workspace / Integration Section */}
      <div className="p-3 mt-auto">
        <button
          onClick={onConnectGoogle}
          className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-all border ${
            isGoogleConnected 
            ? 'bg-white border-green-200 text-green-700 shadow-sm' 
            : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Cloud className="w-3.5 h-3.5" />
            <span>{isGoogleConnected ? 'Google Synced' : 'Connect Cloud'}</span>
          </div>
          {isGoogleConnected && <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>}
        </button>
        <button className="w-full flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-gray-900 text-xs mt-1">
          <Settings className="w-3.5 h-3.5" />
          <span>System Settings</span>
        </button>
      </div>
    </div>
  );
};