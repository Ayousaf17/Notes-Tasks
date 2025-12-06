
import React from 'react';
import { FileText, Layout, Calendar, Settings, Plus, Inbox, Network, Home, X, Globe, Layers, User, Moon, Sun, Loader2, Folder, Trash2, CheckSquare, Users } from 'lucide-react';
import { ViewMode, Document, Project } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
  documents: Document[];
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  onDeleteDocument: (id: string) => void;
  activeDocumentId: string | null;
  onOpenIntegrations: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isExpanded: boolean;
  onHover: (expanded: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  documents,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  activeDocumentId,
  isMobileOpen,
  onMobileClose,
  isDarkMode,
  onToggleDarkMode,
  isExpanded,
  onHover
}) => {
  
  const NavItem = ({ icon: Icon, label, isActive, onClick, className = '' }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-3 md:py-2 rounded-md transition-all text-sm group/item mb-0.5 ${
        isActive 
        ? 'text-black dark:text-white font-medium bg-gray-100 dark:bg-gray-800/60' 
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30'
      } ${className}`}
      title={!isExpanded ? label : ''}
    >
      <Icon strokeWidth={1.5} className={`w-5 h-5 md:w-4 md:h-4 min-w-[1rem] ${isActive ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500 group-hover/item:text-gray-900 dark:group-hover/item:text-gray-200'}`} />
      
      <span className={`hidden md:block overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out origin-left text-[13px] ${isExpanded ? 'opacity-100 w-auto ml-2' : 'opacity-0 w-0'}`}>
          {label}
      </span>
      
      <span className="md:hidden ml-3 text-sm font-medium">{label}</span>
    </button>
  );

  // Helper to determine if we are "in" a project view
  const isProjectContext = ![ViewMode.HOME, ViewMode.INBOX, ViewMode.GLOBAL_BOARD, ViewMode.GLOBAL_CALENDAR, ViewMode.SETTINGS, ViewMode.CLIENTS].includes(currentView);
  const currentProject = projects.find(p => p.id === activeProjectId);

  return (
    <>
      {isMobileOpen && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden animate-in fade-in duration-300"
            onClick={onMobileClose}
        />
      )}

      <div 
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        className={`fixed inset-y-0 left-0 z-[110] flex flex-col bg-white dark:bg-black border-r border-gray-100 dark:border-gray-800 transition-all duration-300 ease-in-out font-sans shadow-2xl md:shadow-none h-full
        ${isMobileOpen ? 'translate-x-0 w-[80vw]' : '-translate-x-full'} 
        md:translate-x-0 ${isExpanded ? 'md:w-64 md:shadow-xl' : 'md:w-16'} group`}
      >
        
        {/* LOGO AREA */}
        <div className={`h-16 md:h-14 flex items-center transition-all border-b border-gray-50 dark:border-gray-800 shrink-0 overflow-hidden ${isExpanded || isMobileOpen ? 'px-6 md:px-5 justify-between' : 'px-0 justify-center'}`}>
          <span className={`font-serif text-xl md:text-lg font-bold tracking-tight text-black dark:text-white whitespace-nowrap transition-all duration-300`}>
             {(isExpanded || isMobileOpen) ? 'Aasani.' : 'A.'}
          </span>
          {isMobileOpen && (
              <button onClick={onMobileClose} className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                  <X className="w-5 h-5" />
              </button>
          )}
        </div>

        {/* SCROLLABLE NAV */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-2 py-6 md:py-4 space-y-6 md:space-y-6 no-scrollbar safe-area-bottom">
          
          {/* 1. Global Navigation */}
          <div className="space-y-1 md:space-y-0.5">
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

          {/* 2. Active Project Context (MOVED UP FOR BETTER VISIBILITY) */}
          {isProjectContext && currentProject && (
              <div className="space-y-1 md:space-y-0.5 animate-in slide-in-from-left-2 fade-in duration-300">
                  <div className={`hidden md:block px-3 text-[10px] font-bold text-black dark:text-white uppercase tracking-widest mb-2 transition-opacity duration-200 truncate h-4 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                      {currentProject.title}
                  </div>
                  <div className="md:hidden px-3 text-xs font-bold text-black dark:text-white uppercase tracking-widest mb-2">
                      {currentProject.title}
                  </div>
                  
                  <NavItem icon={Layout} label="Overview" isActive={currentView === ViewMode.PROJECT_OVERVIEW} onClick={() => { onChangeView(ViewMode.PROJECT_OVERVIEW); onMobileClose(); }} />
                  <NavItem icon={CheckSquare} label="Board" isActive={currentView === ViewMode.BOARD} onClick={() => { onChangeView(ViewMode.BOARD); onMobileClose(); }} />
                  <NavItem icon={Calendar} label="Calendar" isActive={currentView === ViewMode.CALENDAR} onClick={() => { onChangeView(ViewMode.CALENDAR); onMobileClose(); }} />
                  <NavItem icon={Network} label="Graph" isActive={currentView === ViewMode.GRAPH} onClick={() => { onChangeView(ViewMode.GRAPH); onMobileClose(); }} />
                  
                  {/* Pages Section */}
                  <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800/50">
                      <div className={`hidden md:flex px-3 items-center justify-between mb-1.5 transition-opacity duration-200 h-4 overflow-hidden ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                           <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Pages</span>
                           <button onClick={(e) => { e.stopPropagation(); onCreateDocument(); }} className="text-gray-400 hover:text-black dark:hover:text-white p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><Plus className="w-3 h-3" /></button>
                      </div>
                      <div className="space-y-0.5">
                        {documents.length === 0 && isExpanded && <div className="px-3 text-xs text-gray-400 italic py-1">No pages yet.</div>}
                        {documents.map(doc => (
                             <button
                                key={doc.id}
                                onClick={() => { onChangeView(ViewMode.DOCUMENTS); onSelectDocument(doc.id); onMobileClose(); }}
                                className={`w-full flex items-center px-3 py-1.5 text-sm text-left transition-colors rounded-md group ${activeDocumentId === doc.id && currentView === ViewMode.DOCUMENTS ? 'text-black dark:text-white bg-gray-100 dark:bg-gray-800 font-medium' : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
                             >
                                <FileText className="w-4 h-4 mr-2 opacity-70" />
                                <span className={`truncate transition-all ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>{doc.title || 'Untitled'}</span>
                             </button>
                        ))}
                      </div>
                  </div>
              </div>
          )}

          {/* 3. Global Views */}
          <div className="space-y-1 md:space-y-0.5 pt-4 border-t border-gray-50 dark:border-gray-800">
              <div className={`hidden md:block px-3 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-1.5 transition-opacity duration-200 truncate h-4 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                  Workspace
              </div>
              <NavItem icon={Layers} label="All Tasks" isActive={currentView === ViewMode.GLOBAL_BOARD} onClick={() => { onChangeView(ViewMode.GLOBAL_BOARD); onMobileClose(); }} />
              <NavItem icon={Globe} label="Timeline" isActive={currentView === ViewMode.GLOBAL_CALENDAR} onClick={() => { onChangeView(ViewMode.GLOBAL_CALENDAR); onMobileClose(); }} />
              <NavItem icon={Users} label="Clients" isActive={currentView === ViewMode.CLIENTS} onClick={() => { onChangeView(ViewMode.CLIENTS); onMobileClose(); }} />
          </div>

          {/* 4. Projects Switcher */}
          <div className="space-y-1 md:space-y-0.5">
              <div className={`hidden md:flex px-3 items-center justify-between mb-1.5 transition-opacity duration-200 h-4 overflow-hidden ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Switch Project</span>
                  <button onClick={onCreateProject}><Plus className="w-3 h-3 text-gray-400 hover:text-black dark:hover:text-white" /></button>
              </div>
              {projects.map(project => (
                  <div key={project.id} className="group/project-item relative flex items-center mb-0.5">
                      <button
                          onClick={() => { onSelectProject(project.id); onMobileClose(); }}
                          className={`w-full flex items-center px-3 py-2 rounded-md text-sm transition-colors text-left ${activeProjectId === project.id ? 'text-black dark:text-white font-bold' : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
                      >
                          <Folder className="w-4 h-4 mr-3 opacity-70" />
                          <span className={`truncate transition-all ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>{project.title}</span>
                      </button>
                  </div>
              ))}
          </div>
        </div>

        {/* FOOTER - Settings & Profile */}
        <div className="p-3 mt-auto border-t border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 overflow-hidden shrink-0 pb-safe">
          <button 
            onClick={() => { onChangeView(ViewMode.SETTINGS); onMobileClose(); }}
            className={`w-full flex items-center space-x-3 px-2 py-2 mb-1 text-xs rounded transition-colors ${currentView === ViewMode.SETTINGS ? 'bg-white dark:bg-gray-800 text-black dark:text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
          >
            <Settings className="w-4 h-4" />
            <span className={`hidden md:block transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>Settings</span>
          </button>

          <button 
            onClick={onToggleDarkMode}
            className="w-full flex items-center space-x-3 px-2 py-2 text-xs rounded transition-colors text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className={`hidden md:block transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
          
          <div className={`mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 px-2 ${!isExpanded ? 'justify-center' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs">U</div>
              <div className={`hidden md:block overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                  <div className="text-xs font-bold text-black dark:text-white truncate">Workspace User</div>
              </div>
          </div>
        </div>
      </div>
    </>
  );
};
