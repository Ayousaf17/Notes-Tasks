
import React from 'react';
import { FileText, Layout, Calendar, Settings, Plus, Cloud, Inbox, Network, Home, X, Globe, Layers, User, Moon, Sun } from 'lucide-react';
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
  onOpenIntegrations: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
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
  onOpenIntegrations,
  isMobileOpen,
  onMobileClose,
  isDarkMode,
  onToggleDarkMode
}) => {
  
  const NavItem = ({ icon: Icon, label, isActive, onClick, className = '' }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-2 py-1.5 rounded-md transition-colors text-sm group ${
        isActive 
        ? 'text-black dark:text-white font-medium bg-gray-100 dark:bg-gray-800/50' 
        : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30'
      } ${className}`}
    >
      <Icon className={`w-4 h-4 ${isActive ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-gray-200'}`} />
      <span>{label}</span>
    </button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 font-sans transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between">
        <span className="font-semibold text-xl tracking-tight text-black dark:text-white">Aasani.</span>
        <button onClick={onMobileClose} className="md:hidden text-gray-400 hover:text-black dark:hover:text-white">
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
            <div className="px-2 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-2">Overview</div>
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
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Projects</span>
                <button onClick={onCreateProject} className="text-gray-400 hover:text-black dark:hover:text-white"><Plus className="w-3 h-3" /></button>
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
                        ? 'text-black dark:text-white font-medium bg-gray-50 dark:bg-gray-800' 
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                >
                    <span className="truncate">{project.title}</span>
                    {activeProjectId === project.id && ![ViewMode.HOME, ViewMode.INBOX, ViewMode.GLOBAL_BOARD, ViewMode.GLOBAL_CALENDAR].includes(currentView) && (
                        <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white"></div>
                    )}
                </button>
            ))}
        </div>

        {/* Active Project Context */}
        {![ViewMode.HOME, ViewMode.INBOX, ViewMode.GLOBAL_BOARD, ViewMode.GLOBAL_CALENDAR].includes(currentView) && (
             <div className="space-y-0.5 pt-4 border-t border-gray-50 dark:border-gray-800">
                <div className="px-2 text-[10px] font-semibold text-gray-300 dark:text-gray-600 uppercase tracking-widest mb-2">Current Project</div>
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
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Pages</span>
                    <button onClick={onCreateDocument} className="text-gray-400 hover:text-black dark:hover:text-white"><Plus className="w-3 h-3" /></button>
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
                        ? 'text-black dark:text-white font-medium'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                    }`}
                    >
                    <span className="truncate">{doc.title || 'Untitled'}</span>
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* Footer / Profile */}
      <div className="p-4 mt-auto border-t border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
         <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
                <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">Workspace User</div>
                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Online
                </div>
            </div>
            <span className="text-[10px] font-bold bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">PRO</span>
         </div>
         
         <div className="space-y-1">
            <button
            onClick={onToggleDarkMode}
            className="w-full flex items-center space-x-2 px-2 py-1.5 text-xs transition-colors rounded hover:bg-white dark:hover:bg-gray-800 text-gray-400 hover:text-black dark:hover:text-white"
            >
                {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            
            <button
            onClick={onOpenIntegrations}
            className="w-full flex items-center space-x-2 px-2 py-1.5 text-xs transition-colors rounded hover:bg-white dark:hover:bg-gray-800 text-gray-400 hover:text-black dark:hover:text-white"
            >
            <Cloud className="w-3.5 h-3.5" />
            <span>Connect Cloud</span>
            </button>
            <button className="w-full flex items-center space-x-2 px-2 py-1.5 text-gray-400 hover:text-black dark:hover:text-white text-xs rounded hover:bg-white dark:hover:bg-gray-800">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
            </button>
         </div>
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
            <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm" onClick={onMobileClose}></div>
            <div className="relative w-64 h-full shadow-xl animate-in slide-in-from-left duration-200">
                <SidebarContent />
            </div>
        </div>
      )}
    </>
  );
};
