
import React from 'react';
import { FileText, Layout, Calendar, Settings, Plus, Cloud, Inbox, Network, Home, X, Globe, Layers, User, Moon, Sun, Loader2, Shapes } from 'lucide-react';
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
  
  // Render loading state if projects are not yet loaded
  if (!projects) {
      return (
          <div className="fixed inset-y-0 left-0 w-16 bg-white dark:bg-black border-r border-gray-100 dark:border-gray-800 flex items-center justify-center z-50">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
      );
  }

  const NavItem = ({ icon: Icon, label, isActive, onClick, className = '' }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-all text-sm group/item mb-1 ${
        isActive 
        ? 'text-black dark:text-white font-medium bg-gray-100 dark:bg-gray-800/50' 
        : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30'
      } ${className}`}
      title={label}
    >
      <Icon className={`w-5 h-5 min-w-[1.25rem] ${isActive ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500 group-hover/item:text-gray-900 dark:group-hover/item:text-gray-200'}`} />
      <span className="md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out origin-left delay-75">
          {label}
      </span>
    </button>
  );

  const isProjectContext = ![ViewMode.HOME, ViewMode.INBOX, ViewMode.GLOBAL_BOARD, ViewMode.GLOBAL_CALENDAR, ViewMode.SETTINGS, ViewMode.CANVAS].includes(currentView);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
            onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-black border-r border-gray-100 dark:border-gray-800 transition-all duration-300 ease-in-out font-sans 
        ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
        md:translate-x-0 md:w-16 md:hover:w-64 group shadow-2xl md:shadow-none md:hover:shadow-2xl`}>
        
        {/* Brand Header */}
        <div className="h-16 flex items-center px-4 md:px-0 md:justify-center md:group-hover:justify-start md:group-hover:px-6 transition-all border-b border-gray-50 dark:border-gray-800 shrink-0 overflow-hidden">
          <div className="w-8 h-8 bg-black dark:bg-white rounded-full shrink-0 flex items-center justify-center text-white dark:text-black font-bold">A</div>
          <span className="ml-3 font-semibold text-xl tracking-tight text-black dark:text-white md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-300 delay-75">
             Aasani.
          </span>
          <button onClick={onMobileClose} className="md:hidden ml-auto text-gray-400 hover:text-black dark:hover:text-white">
              <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-6 no-scrollbar">
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
              <NavItem 
                  icon={Shapes} 
                  label="Canvas" 
                  isActive={currentView === ViewMode.CANVAS} 
                  onClick={() => { onChangeView(ViewMode.CANVAS); onMobileClose(); }} 
              />
          </div>

          {/* Global */}
          <div className="space-y-0.5">
              <div className="px-3 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 truncate h-4">
                  Overview
              </div>
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
              <div className="px-3 flex items-center justify-between mb-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 h-4 overflow-hidden">
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest truncate">Projects</span>
                  <button onClick={onCreateProject} className="text-gray-400 hover:text-black dark:hover:text-white"><Plus className="w-3 h-3" /></button>
              </div>
              {projects.map(project => (
                  <button
                      key={project.id}
                      onClick={() => {
                          onSelectProject(project.id);
                          if (!isProjectContext) {
                              onChangeView(ViewMode.DOCUMENTS);
                          }
                          onMobileClose();
                      }}
                      className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm transition-colors text-left group/item mb-1 ${
                          activeProjectId === project.id && isProjectContext
                          ? 'text-black dark:text-white font-medium bg-gray-50 dark:bg-gray-800' 
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                      title={project.title}
                  >
                      <span className="text-base min-w-[1.25rem] flex items-center justify-center">{project.icon || '📁'}</span>
                      <span className="ml-3 truncate md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-300 delay-75">
                          {project.title}
                      </span>
                      {activeProjectId === project.id && isProjectContext && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-black dark:bg-white md:opacity-0 md:group-hover:opacity-100 transition-opacity"></div>
                      )}
                  </button>
              ))}
          </div>

          {/* Active Project Context */}
          {isProjectContext && (
              <div className="space-y-0.5 pt-4 border-t border-gray-50 dark:border-gray-800">
                  <div className="px-3 text-[10px] font-semibold text-gray-300 dark:text-gray-600 uppercase tracking-widest mb-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 truncate h-4">
                      Current Project
                  </div>
                  
                  {/* Views */}
                  <NavItem icon={Layout} label="Board" isActive={currentView === ViewMode.BOARD} onClick={() => { onChangeView(ViewMode.BOARD); onMobileClose(); }} />
                  <NavItem icon={Calendar} label="Calendar" isActive={currentView === ViewMode.CALENDAR} onClick={() => { onChangeView(ViewMode.CALENDAR); onMobileClose(); }} />
                  <NavItem icon={Network} label="Graph" isActive={currentView === ViewMode.GRAPH} onClick={() => { onChangeView(ViewMode.GRAPH); onMobileClose(); }} />
                  
                  {/* Pages / Documents List */}
                  <div className="mt-4">
                      <div className="px-3 flex items-center justify-between mb-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 h-4 overflow-hidden group/header">
                           <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Pages</span>
                           <button onClick={(e) => { e.stopPropagation(); onCreateDocument(); }} className="text-gray-400 hover:text-black dark:hover:text-white p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Create Page"><Plus className="w-3 h-3" /></button>
                      </div>
                      
                      {documents.map(doc => (
                           <button
                              key={doc.id}
                              onClick={() => {
                                  onChangeView(ViewMode.DOCUMENTS);
                                  onSelectDocument(doc.id);
                                  onMobileClose();
                              }}
                              className={`w-full flex items-center px-3 py-2.5 text-sm text-left transition-colors rounded-md group/item mb-1 ${
                                  activeDocumentId === doc.id && currentView === ViewMode.DOCUMENTS
                                  ? 'text-black dark:text-white font-medium bg-gray-100 dark:bg-gray-800/50'
                                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                              }`}
                              title={doc.title || 'Untitled'}
                           >
                              <FileText className={`w-5 h-5 min-w-[1.25rem] transition-colors ${activeDocumentId === doc.id && currentView === ViewMode.DOCUMENTS ? 'text-black dark:text-white' : 'text-gray-400 group-hover/item:text-gray-600 dark:text-gray-600'}`} />
                              <span className="ml-3 truncate md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-300 delay-75">
                                  {doc.title || 'Untitled'}
                              </span>
                           </button>
                      ))}
                       {documents.length === 0 && (
                          <button onClick={onCreateDocument} className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-600 italic transition-colors md:opacity-0 md:group-hover:opacity-100 overflow-hidden whitespace-nowrap duration-300">
                              No pages. Create one?
                          </button>
                      )}
                  </div>
              </div>
          )}
        </div>

        {/* Footer / Profile */}
        <div className="p-4 mt-auto border-t border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 overflow-hidden">
          <div className="flex items-center gap-3 px-1 py-1 mb-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-black dark:bg-white shrink-0 flex items-center justify-center text-white dark:text-black">
                  <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto transition-all duration-300 delay-75 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">Workspace User</div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      Online
                  </div>
              </div>
              <span className="text-[10px] font-bold bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">PRO</span>
          </div>
          
          <div className="space-y-1">
              <button
              onClick={onToggleDarkMode}
              className="w-full flex items-center space-x-3 px-2 py-2 text-xs transition-colors rounded hover:bg-white dark:hover:bg-gray-800 text-gray-400 hover:text-black dark:hover:text-white"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              >
                  {isDarkMode ? <Sun className="w-4 h-4 min-w-[1rem]" /> : <Moon className="w-4 h-4 min-w-[1rem]" />}
                  <span className="md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-300 delay-75 ml-1">
                      {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                  </span>
              </button>
              
              <button
              onClick={onOpenIntegrations}
              className="w-full flex items-center space-x-3 px-2 py-2 text-xs transition-colors rounded hover:bg-white dark:hover:bg-gray-800 text-gray-400 hover:text-black dark:hover:text-white"
              title="Connect Cloud"
              >
                <Cloud className="w-4 h-4 min-w-[1rem]" />
                <span className="md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-300 delay-75 ml-1">
                    Connect Cloud
                </span>
              </button>
              <button 
                onClick={() => { onChangeView(ViewMode.SETTINGS); onMobileClose(); }}
                className={`w-full flex items-center space-x-3 px-2 py-2 text-xs rounded transition-colors ${
                  currentView === ViewMode.SETTINGS 
                  ? 'text-black dark:text-white font-medium bg-white dark:bg-gray-800' 
                  : 'text-gray-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-gray-800'
                }`}
                title="Settings"
              >
                <Settings className="w-4 h-4 min-w-[1rem]" />
                <span className="md:opacity-0 md:group-hover:opacity-100 md:w-0 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-300 delay-75 ml-1">
                    Settings
                </span>
              </button>
          </div>
        </div>
      </div>
    </>
  );
};
