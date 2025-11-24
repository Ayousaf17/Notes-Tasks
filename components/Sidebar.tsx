
import React from 'react';
import { FileText, Layout, Calendar, Settings, Plus, Cloud, Inbox, Network, Home, X, Globe, Layers } from 'lucide-react';
import { ViewMode, Document, Project } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  documents: Document[];
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  activeDocumentId: string | null;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
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
  onConnectGoogle,
  isMobileOpen,
  onMobileClose
}) => {
  
  const NavItem = ({ icon: Icon, label, isActive, onClick, className = '' }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-2 py-1.5 rounded-md transition-colors text-sm group ${
        isActive 
        ? 'text-black font-medium' 
        : 'text-gray-400 hover:text-gray-900'
      } ${className}`}
    >
      <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-gray-900'}`} />
      <span>{label}</span>
    </button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 font-sans">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between">
        <span className="font-semibold text-xl tracking-tight text-black">Aasani.</span>
        <button onClick={onMobileClose} className="md:hidden text-gray-400">
            <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-8">
        {/* Core */}
        <div className="space-y-0.5">
            <NavItem 
                icon={Home} 
                label="Home" 
                isActive={currentView === ViewMode.HOME} 
                onClick={() => { onChangeView(ViewMode.HOME); onMobileClose(); }} 
            />
            <NavItem 
                icon={Inbox} 
                label="Inbox" 
                isActive={currentView === ViewMode.INBOX} 
                onClick={() => { onChangeView(ViewMode.INBOX); onMobileClose(); }} 
            />
        </div>

        {/* Global */}
        <div className="space-y-0.5">
            <div className="px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Overview</div>
            <NavItem 
                icon={Layers} 
                label="All Tasks" 
                isActive={currentView === ViewMode.GLOBAL_BOARD} 
                onClick={() => { onChangeView(ViewMode.GLOBAL_BOARD); onMobileClose(); }} 
            />
            <NavItem 
                icon={Globe} 
                label="Timeline" 
                isActive={currentView === ViewMode.GLOBAL_CALENDAR} 
                onClick={() => { onChangeView(ViewMode.GLOBAL_CALENDAR); onMobileClose(); }} 
            />
        </div>

        {/* Projects */}
        <div className="space-y-0.5">
            <div className="px-2 flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Projects</span>
                <button onClick={onCreateProject} className="text-gray-400 hover:text-black"><Plus className="w-3 h-3" /></button>
            </div>
            {projects.map(project => (
                <button
                    key={project.id}
                    onClick={() => {
                        onSelectProject(project.id);
                        if ([ViewMode.HOME, ViewMode.INBOX, ViewMode.GLOBAL_BOARD, ViewMode.GLOBAL_CALENDAR].includes(currentView)) {
                            onChangeView(ViewMode.DOCUMENTS);
                        }
                        onMobileClose();
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors text-left group ${
                        activeProjectId === project.id && ![ViewMode.HOME, ViewMode.INBOX, ViewMode.GLOBAL_BOARD, ViewMode.GLOBAL_CALENDAR].includes(currentView)
                        ? 'text-black font-medium' 
                        : 'text-gray-400 hover:text-gray-900'
                    }`}
                >
                    <span className="truncate">{project.title}</span>
                    {activeProjectId === project.id && ![ViewMode.HOME, ViewMode.INBOX, ViewMode.GLOBAL_BOARD, ViewMode.GLOBAL_CALENDAR].includes(currentView) && (
                        <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                    )}
                </button>
            ))}
        </div>

        {/* Active Project Context */}
        {![ViewMode.HOME, ViewMode.INBOX, ViewMode.GLOBAL_BOARD, ViewMode.GLOBAL_CALENDAR].includes(currentView) && (
             <div className="space-y-0.5 pt-4 border-t border-gray-50">
                <div className="px-2 text-[10px] font-semibold text-gray-300 uppercase tracking-widest mb-2">Current Project</div>
                <NavItem icon={FileText} label="Documents" isActive={currentView === ViewMode.DOCUMENTS} onClick={() => { onChangeView(ViewMode.DOCUMENTS); onMobileClose(); }} />
                <NavItem icon={Layout} label="Board" isActive={currentView === ViewMode.BOARD} onClick={() => { onChangeView(ViewMode.BOARD); onMobileClose(); }} />
                <NavItem icon={Calendar} label="Calendar" isActive={currentView === ViewMode.CALENDAR} onClick={() => { onChangeView(ViewMode.CALENDAR); onMobileClose(); }} />
                <NavItem icon={Network} label="Graph" isActive={currentView === ViewMode.GRAPH} onClick={() => { onChangeView(ViewMode.GRAPH); onMobileClose(); }} />
            </div>
        )}

        {/* Documents List */}
        {currentView === ViewMode.DOCUMENTS && (
             <div className="space-y-0.5">
                 <div className="px-2 flex items-center justify-between mb-2 mt-4">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Pages</span>
                    <button onClick={onCreateDocument} className="text-gray-400 hover:text-black"><Plus className="w-3 h-3" /></button>
                </div>
                {documents.map((doc) => (
                    <button
                    key={doc.id}
                    onClick={() => {
                        onChangeView(ViewMode.DOCUMENTS);
                        onSelectDocument(doc.id);
                        onMobileClose();
                    }}
                    className={`w-full flex items-center px-2 py-1.5 text-sm text-left truncate transition-colors ${
                        activeDocumentId === doc.id
                        ? 'text-black font-medium'
                        : 'text-gray-400 hover:text-gray-900'
                    }`}
                    >
                    <span className="truncate">{doc.title || 'Untitled'}</span>
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 mt-auto">
        <button
          onClick={onConnectGoogle}
          className={`w-full flex items-center space-x-2 px-2 py-1.5 text-xs transition-colors ${
            isGoogleConnected ? 'text-green-600' : 'text-gray-400 hover:text-black'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>{isGoogleConnected ? 'Synced' : 'Connect Cloud'}</span>
        </button>
        <button className="w-full flex items-center space-x-2 px-2 py-1.5 text-gray-400 hover:text-black text-xs">
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:flex w-64 h-full shrink-0">
        <SidebarContent />
      </div>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm" onClick={onMobileClose}></div>
            <div className="relative w-64 h-full shadow-xl animate-in slide-in-from-left duration-200">
                <SidebarContent />
            </div>
        </div>
      )}
    </>
  );
};
