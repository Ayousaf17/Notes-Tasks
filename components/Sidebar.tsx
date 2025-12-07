import React from 'react';
import { FileText, Layout, Calendar, Settings, Plus, Inbox, Network, Home, X, Globe, Layers, User, Moon, Sun, Loader2, Folder, Trash2, CheckSquare, Users, Sparkles, LogOut, Pin, PinOff } from 'lucide-react';
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
  isPinned: boolean;
  onTogglePin: () => void;
  onHover: (expanded: boolean) => void;
  globalModelLabel?: string; 
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
  isPinned,
  onTogglePin,
  onHover,
  globalModelLabel
}) => {
  
  const NavItem = ({ icon: Icon, label, isActive, onClick, className = '' }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm group/item mb-1 relative ${
        isActive 
        ? 'bg-sidebar-accent text-sidebar-foreground font-semibold shadow-sm' 
        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
      } ${className}`}
      title={!isExpanded ? label : ''}
    >
      <Icon strokeWidth={isActive ? 2 : 1.5} className={`w-5 h-5 md:w-4 md:h-4 min-w-[1rem] ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 group-hover/item:text-sidebar-foreground'}`} />
      
      <span className={`hidden md:block overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out origin-left text-[13px] ${isExpanded ? 'opacity-100 w-auto ml-2' : 'opacity-0 w-0'}`}>
          {label}
      </span>
      
      <span className="md:hidden ml-3 text-sm font-medium">{label}</span>
      
      {/* Active Indicator Strip */}
      {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary rounded-r-full md:hidden" />
      )}
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
        onMouseEnter={() => !isPinned && onHover(true)}
        onMouseLeave={() => !isPinned && onHover(false)}
        className={`fixed inset-y-0 left-0 z-[110] flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out font-sans shadow-2xl md:shadow-none h-full
        ${isMobileOpen ? 'translate-x-0 w-[80vw]' : '-translate-x-full'} 
        md:translate-x-0 ${isExpanded ? 'md:w-64' : 'md:w-16'} group`}
      >
        
        {/* LOGO AREA - STANDARDIZED */}
        <div className={`h-16 md:h-14 flex items-center transition-all border-b border-sidebar-border shrink-0 overflow-hidden ${isExpanded || isMobileOpen ? 'px-4' : 'px-0 justify-center'}`}>
          <div className="flex items-center gap-3">
              {/* App Icon (Logo Mark) */}
              <div className="w-8 h-8 md:w-7 md:h-7 bg-sidebar-primary text-sidebar-primary-foreground rounded-lg flex items-center justify-center font-serif font-bold text-lg md:text-base shrink-0 ml-0.5 shadow-sm">
                  A
              </div>
              
              {/* App Text (Logo Type) */}
              <div className={`font-semibold text-lg tracking-tight text-sidebar-foreground whitespace-nowrap transition-all duration-300 ${isExpanded || isMobileOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
                  Aasani
              </div>
          </div>

          {isMobileOpen && (
              <button onClick={onMobileClose} className="md:hidden ml-auto p-2 rounded-full hover:bg-sidebar-accent text-sidebar-foreground">
                  <X className="w-5 h-5" />
              </button>
          )}
        </div>

        {/* SCROLLABLE NAV */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-2 py-6 md:py-4 space-y-6 md:space-y-6 no-scrollbar safe-area-bottom">
          
          {/* 1. Global Navigation */}
          <div className="space-y-1">
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
              <div className="space-y-1 animate-in slide-in-from-left-2 fade-in duration-300">
                  <div className={`hidden md:block px-3 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest mb-2 transition-opacity duration-200 truncate h-4 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
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
                  <div className="mt-4 pt-4 border-t border-sidebar-border/50">
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
                                className={`w-full flex items-center px-3 py-1.5 text-sm text-left transition-colors rounded-md group ${activeDocumentId === doc.id && currentView === ViewMode.DOCUMENTS ? 'bg-sidebar-accent text-sidebar-foreground font-medium shadow-sm' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30'}`}
                             >
                                <FileText className={`w-4 h-4 mr-2 ${activeDocumentId === doc.id ? 'text-sidebar-foreground' : 'opacity-70'}`} />
                                <span className={`truncate transition-all ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>{doc.title || 'Untitled'}</span>
                             </button>
                        ))}
                      </div>
                  </div>
              </div>
          )}

          {/* 3. Global Views */}
          <div className="space-y-1 pt-4 border-t border-sidebar-border/50">
              <div className={`hidden md:block px-3 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest mb-1.5 transition-opacity duration-200 truncate h-4 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                  Workspace
              </div>
              <NavItem icon={Layers} label="All Tasks" isActive={currentView === ViewMode.GLOBAL_BOARD} onClick={() => { onChangeView(ViewMode.GLOBAL_BOARD); onMobileClose(); }} />
              <NavItem icon={Globe} label="Timeline" isActive={currentView === ViewMode.GLOBAL_CALENDAR} onClick={() => { onChangeView(ViewMode.GLOBAL_CALENDAR); onMobileClose(); }} />
              <NavItem icon={Users} label="Clients" isActive={currentView === ViewMode.CLIENTS} onClick={() => { onChangeView(ViewMode.CLIENTS); onMobileClose(); }} />
          </div>

          {/* 4. Projects Switcher */}
          <div className="space-y-1 pt-4 border-t border-sidebar-border/50">
              <div className={`hidden md:flex px-3 items-center justify-between mb-1.5 transition-opacity duration-200 h-4 overflow-hidden ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest">Switch Project</span>
                  <button onClick={onCreateProject}><Plus className="w-3 h-3 text-sidebar-foreground/50 hover:text-sidebar-foreground" /></button>
              </div>
              {projects.map(project => (
                  <div key={project.id} className="group/project-item relative flex items-center mb-0.5">
                      <button
                          onClick={() => { onSelectProject(project.id); onMobileClose(); }}
                          className={`flex-1 flex items-center px-3 py-2 rounded-md text-sm transition-colors text-left ${activeProjectId === project.id ? 'bg-sidebar-accent text-sidebar-foreground font-semibold shadow-sm' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30'}`}
                      >
                          <Folder className={`w-4 h-4 mr-3 ${activeProjectId === project.id ? 'text-sidebar-foreground' : 'opacity-70'}`} />
                          <span className={`truncate transition-all ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>{project.title}</span>
                      </button>
                      
                      {/* Delete Project Button - Visible on Hover in Expanded Mode */}
                      {isExpanded && (
                          <button
                              onClick={(e) => { e.stopPropagation(); if(confirm('Delete project?')) onDeleteProject(project.id); }}
                              className="absolute right-2 p-1.5 text-sidebar-foreground/30 hover:text-destructive hover:bg-sidebar-accent rounded opacity-0 group-hover/project-item:opacity-100 transition-opacity"
                              title="Delete Project"
                          >
                              <Trash2 className="w-3 h-3" />
                          </button>
                      )}
                  </div>
              ))}
          </div>
        </div>

        {/* FOOTER - Cleaned up */}
        <div className="p-3 mt-auto border-t border-sidebar-border bg-sidebar-accent/10 overflow-hidden shrink-0 pb-safe">
          
          {/* Pin Toggle (Desktop Only) */}
          <div className="hidden md:flex justify-end mb-2">
              <button 
                  onClick={onTogglePin}
                  className={`p-1.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors ${!isExpanded ? 'hidden' : ''}`}
                  title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
              >
                  {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
          </div>

          <button 
            onClick={() => { onChangeView(ViewMode.SETTINGS); onMobileClose(); }}
            className={`w-full flex items-center space-x-3 px-2 py-2 mb-1 text-xs rounded transition-colors ${currentView === ViewMode.SETTINGS ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm font-medium' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'}`}
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
          
          <div className={`mt-3 pt-3 border-t border-sidebar-border/50 flex items-center gap-3 px-2 ${!isExpanded ? 'justify-center' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">U</div>
              <div className={`hidden md:block overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                  <div className="text-xs font-bold text-sidebar-foreground truncate">Workspace User</div>
              </div>
          </div>
        </div>
      </div>
    </>
  );
};