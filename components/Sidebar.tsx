import React from 'react';
import { FileText, Layout, Calendar, Settings, Plus, Database, Cloud, Command } from 'lucide-react';
import { ViewMode, Document } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  documents: Document[];
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  activeDocumentId: string | null;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  documents,
  onSelectDocument,
  onCreateDocument,
  activeDocumentId,
  isGoogleConnected,
  onConnectGoogle
}) => {
  return (
    <div className="w-60 bg-[#fbfbfb] border-r border-gray-100 h-full flex flex-col shrink-0 font-sans selection:bg-gray-200">
      {/* Header */}
      <div className="p-5 flex items-center space-x-3 mb-2">
        <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
          <Command className="w-3 h-3 text-white" />
        </div>
        <span className="font-semibold text-gray-900 tracking-tight">Nexus</span>
      </div>

      {/* Primary Nav */}
      <div className="px-3 space-y-0.5">
        <button
          onClick={() => onChangeView(ViewMode.DOCUMENTS)}
          className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded transition-all duration-200 text-sm ${
            currentView === ViewMode.DOCUMENTS && !activeDocumentId
              ? 'bg-gray-100 text-gray-900 font-medium'
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
              ? 'bg-gray-100 text-gray-900 font-medium'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Layout className="w-4 h-4 opacity-70" />
          <span>Board</span>
        </button>
        <button
          onClick={() => onChangeView(ViewMode.CALENDAR)}
          className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded transition-all duration-200 text-sm ${
            currentView === ViewMode.CALENDAR
              ? 'bg-gray-100 text-gray-900 font-medium'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4 opacity-70" />
          <span>Calendar</span>
        </button>
      </div>

      {/* Documents List */}
      <div className="mt-8 px-3 flex-1 overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between px-3 mb-2 group">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Private
          </span>
          <button onClick={onCreateDocument} className="text-gray-400 hover:text-black transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-0.5">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                onChangeView(ViewMode.DOCUMENTS);
                onSelectDocument(doc.id);
              }}
              className={`w-full flex items-center px-3 py-1.5 rounded text-sm text-left truncate transition-colors ${
                activeDocumentId === doc.id
                  ? 'bg-white shadow-sm text-gray-900 font-medium ring-1 ring-gray-100'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="truncate">{doc.title || 'Untitled'}</span>
            </button>
          ))}
          {documents.length === 0 && (
            <div className="px-3 text-xs text-gray-400 italic">No pages yet</div>
          )}
        </div>
      </div>

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
            <span>{isGoogleConnected ? 'Google Synced' : 'Connect Google'}</span>
          </div>
          {isGoogleConnected && <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>}
        </button>
        <button className="w-full flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-gray-900 text-xs mt-1">
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};