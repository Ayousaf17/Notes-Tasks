
import React from 'react';
import { FileText, Layout, Calendar, Settings, Plus, Inbox, Network, Home, X, Globe, Layers, User, Moon, Sun, Loader2, Folder, Trash2, CheckSquare, Users, Sparkles } from 'lucide-react';
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
  globalModelLabel?: string; 
}

const MascotIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 48 48" className={className} fill="none">
        <path d="M24 4 C10 4, 4 14, 4 26 C4 38, 14 44, 24 44 C34 44, 44 38, 44 26 C44 14, 38 4, 24 4 Z" fill="currentColor" className="text-black dark:text-white transition-colors"/>
        <path d="M24 8 C14 8, 8 16, 8 26 C8 36, 16 40, 24 40 C32 40, 40 36, 40 26 C40 16, 36 8, 24 8 Z" fill="currentColor" className="text-white dark:text-zinc-800 transition-colors"/>
        <circle cx="16" cy="18" r="3.5" fill="currentColor" className="text-black dark:text-white" />
        <circle cx="32" cy="18" r="3.5" fill="currentColor" className="text-black dark:text-white" />
        <path d="M20 29 Q24 31 28 29" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-black dark:text-white" />
    </svg>
);

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
  onHover,
  globalModelLabel
}) => {
  
  const NavItem = ({ icon: Icon, label, isActive, onClick, className = '' }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-3 md:py-2 rounded-md transition-all text-sm group/item mb-0.5 ${
        isActive 
        ? 'text-sidebar-primary-foreground font-medium bg-sidebar-primary' 
        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      } ${className}`}
      title={!isExpanded ? label : ''}
    >
      <Icon strokeWidth={1.5} className={`w-5 h-5 md:w-4 md:h-4 min-w-[1rem] ${isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 group-hover/item:text-sidebar-accent-foreground'}`} />
      
      <span className={`hidden md:block overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out origin-left text-[13px] ${isExpanded ? 'opacity-100 w-auto ml-2' : 'opacity-0 w-0'}`}>
          {label}
      </span>
      
      <span className="md:hidden ml-3 text-sm font-medium">{label}</span>
    </button>
  );

  const isProjectContext = ![ViewMode.HOME, ViewMode.INBOX, ViewMode.GLOBAL_BOARD, ViewMode.GLOBAL_CALENDAR, ViewMode.SETTINGS, ViewMode.CLIENTS].includes(currentView);
  const currentProject = projects.find(p => p.id === activeProjectId);

  return (
    <>
      {isMobileOpen && (
        <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] md:hidden animate-in fade-in duration-300"
            onClick={onMobileClose}
        />
      )}

      <div 
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        className={`fixed inset-y-0 left-0 z-[110] flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out font-sans shadow-2xl md:shadow-none h-full
        ${isMobileOpen ? 'translate-x-0 w-[80vw]' : '-translate-x-full'} 
        md:translate-x-0 ${isExpanded ? 'md:w-64 md:shadow-xl' : 'md:w-16'} group`}
      >
        
        {/* LOGO AREA */}
        <div className={`h-16 md:h-14 flex items-center transition-all border-b border-sidebar-border shrink-0 overflow-hidden ${isExpanded || isMobileOpen ? 'px-6 md:px-5 justify-between' : 'px-0 justify-center'}`}>
          <span className={`font-serif text-xl md:text-lg font-bold tracking-tight text-sidebar-foreground whitespace-nowrap transition-all duration-300`}>
             {(isExpanded || isMobileOpen) ? 'Aasani.' : 'A.'}
          </span>
          {isMobileOpen && (
              <button onClick={onMobileClose} className="md:hidden p-2 rounded-full hover:bg-sidebar-accent text-sidebar-foreground">
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

          {/* 2. Active Project Context */}
          {isProjectContext && currentProject && (
              <div className="space-y-1 md:space-y-0.5 animate-in slide-in-from-left-2 fade-in duration-300">
                  <div className={`hidden md:block px-3 text-[10px] font-bold text-sidebar-foreground/80 uppercase tracking-widest mb-2 transition-opacity duration-200 truncate h-4 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                      {currentProject.title}
                  </div>
                  <div className="md:hidden px-3 text-xs font-bold text-sidebar-foreground uppercase tracking-widest mb-2">
                      {currentProject.title}
                  </div>
                  
                  <NavItem icon={Layout} label="Overview" isActive={currentView === ViewMode.PROJECT_OVERVIEW} onClick={() => { onChangeView(ViewMode.PROJECT_OVERVIEW); onMobileClose(); }} />
                  <NavItem icon={CheckSquare} label="Board" isActive={currentView === ViewMode.BOARD} onClick={() => { onChangeView(ViewMode.BOARD); onMobileClose(); }} />
                  <NavItem icon={Calendar} label="Calendar" isActive={currentView === ViewMode.CALENDAR} onClick={() => { onChangeView(ViewMode.CALENDAR); onMobileClose(); }} />
                  <NavItem icon={Network} label="Graph" isActive={currentView === ViewMode.GRAPH} onClick={() => { onChangeView(ViewMode.GRAPH); onMobileClose(); }} />
                  
                  {/* Pages Section */}
                  <div className="mt-4 pt-4 border-t border-sidebar-border">
                      <div className={`hidden md:flex px-3 items-center justify-between mb-1.5 transition-opacity duration-200 h-4 overflow-hidden ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                           <span className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest">Pages</span>
                           <button onClick={(e) => { e.stopPropagation(); onCreateDocument(); }} className="text-sidebar-foreground/50 hover:text-sidebar-foreground p-0.5 rounded hover:bg-sidebar-accent transition-colors"><Plus className="w-3 h-3" /></button>
                      </div>
                      <div className="space-y-0.5">
                        {documents.length === 0 && isExpanded && <div className="px-3 text-xs text-sidebar-foreground/40 italic py-1">No pages yet.</div>}
                        {documents.map(doc => (
                             <button
                                key={doc.id}
                                onClick={() => { onChangeView(ViewMode.DOCUMENTS); onSelectDocument(doc.id); onMobileClose(); }}
                                className={`w-full flex items-center px-3 py-1.5 text-sm text-left transition-colors rounded-md group ${activeDocumentId === doc.id && currentView === ViewMode.DOCUMENTS ? 'text-sidebar-accent-foreground bg-sidebar-accent font-medium' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
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
          <div className="space-y-1 md:space-y-0.5 pt-4 border-t border-sidebar-border">
              <div className={`hidden md:block px-3 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest mb-1.5 transition-opacity duration-200 truncate h-4 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                  Workspace
              </div>
              <NavItem icon={Layers} label="All Tasks" isActive={currentView === ViewMode.GLOBAL_BOARD} onClick={() => { onChangeView(ViewMode.GLOBAL_BOARD); onMobileClose(); }} />
              <NavItem icon={Globe} label="Timeline" isActive={currentView === ViewMode.GLOBAL_CALENDAR} onClick={() => { onChangeView(ViewMode.GLOBAL_CALENDAR); onMobileClose(); }} />
              <NavItem icon={Users} label="Clients" isActive={currentView === ViewMode.CLIENTS} onClick={() => { onChangeView(ViewMode.CLIENTS); onMobileClose(); }} />
          </div>

          {/* 4. Projects Switcher */}
          <div className="space-y-1 md:space-y-0.5">
              <div className={`hidden md:flex px-3 items-center justify-between mb-1.5 transition-opacity duration-200 h-4 overflow-hidden ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest">Switch Project</span>
                  <button onClick={onCreateProject}><Plus className="w-3 h-3 text-sidebar-foreground/50 hover:text-sidebar-foreground" /></button>
              </div>
              {projects.map(project => (
                  <div key={project.id} className="group/project-item relative flex items-center mb-0.5">
                      <button
                          onClick={() => { onSelectProject(project.id); onMobileClose(); }}
                          className={`w-full flex items-center px-3 py-2 rounded-md text-sm transition-colors text-left ${activeProjectId === project.id ? 'text-sidebar-foreground font-bold bg-sidebar-accent' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
                      >
                          <Folder className="w-4 h-4 mr-3 opacity-70" />
                          <span className={`truncate transition-all ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>{project.title}</span>
                      </button>
                  </div>
              ))}
          </div>
        </div>

        {/* FOOTER - Settings & Profile */}
        <div className="p-3 mt-auto border-t border-sidebar-border bg-sidebar-accent/10 overflow-hidden shrink-0 pb-safe">
          {/* Active Model Indicator */}
          {globalModelLabel && (
              <div className={`mb-3 px-2 flex items-center gap-2 text-[10px] text-sidebar-foreground/50 transition-all duration-300 ${!isExpanded ? 'justify-center' : ''}`}>
                  <Sparkles className="w-3 h-3 text-sidebar-primary" />
                  <span className={`truncate ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
                      Powered by <span className="font-bold text-sidebar-foreground">{globalModelLabel}</span>
                  </span>
              </div>
          )}

          {/* Mascot Icon in Footer */}
          <div className={`mb-2 flex items-center justify-center transition-all ${!isExpanded ? 'justify-center' : 'justify-start px-2'}`}>
             <MascotIcon className="w-6 h-6 hover:scale-110 transition-transform cursor-pointer" />
             <span className={`ml-3 text-xs font-bold text-sidebar-foreground transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>Aasani</span>
          </div>

          <button 
            onClick={() => { onChangeView(ViewMode.SETTINGS); onMobileClose(); }}
            className={`w-full flex items-center space-x-3 px-2 py-2 mb-1 text-xs rounded transition-colors ${currentView === ViewMode.SETTINGS ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'}`}
          >
            <Settings className="w-4 h-4" />
            <span className={`hidden md:block transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>Settings</span>
          </button>

          <button 
            onClick={onToggleDarkMode}
            className="w-full flex items-center space-x-3 px-2 py-2 text-xs rounded transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className={`hidden md:block transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
          
          <div className={`mt-3 pt-3 border-t border-sidebar-border flex items-center gap-3 px-2 ${!isExpanded ? 'justify-center' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold text-xs">U</div>
              <div className={`hidden md:block overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                  <div className="text-xs font-bold text-sidebar-foreground truncate">Workspace User</div>
              </div>
          </div>
        </div>
      </div>
    </>
  );
};
