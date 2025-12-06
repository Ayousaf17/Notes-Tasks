
import React, { useState, useEffect } from 'react';
import { User, Trash2, Plus, Moon, Sun, Database, ShieldAlert, Folder, Cloud, MessageSquare, Check, Loader2, Lock, AlertCircle, Plug, ShieldCheck, Globe, Key, Save, BarChart3 } from 'lucide-react';
import { Project, Integration } from '../types';
import { analyticsService } from '../services/analyticsService';

interface SettingsViewProps {
  teamMembers: string[];
  onUpdateTeam: (members: string[]) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onClearData: () => void;
  onDeleteProject: (projectId: string) => void;
  projects: Project[];
  integrations: Integration[];
  onToggleIntegration: (id: string, apiKey?: string) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
    teamMembers, 
    onUpdateTeam,
    isDarkMode,
    onToggleDarkMode,
    onClearData,
    onDeleteProject,
    projects,
    integrations,
    onToggleIntegration
}) => {
  const [newMember, setNewMember] = useState('');
  const [activeTab, setActiveTab] = useState<'team' | 'general' | 'data' | 'integrations' | 'insights'>('team');
  const [usageStats, setUsageStats] = useState<Record<string, number>>({});
  
  // Integration Local State
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Database Connection State
  const [dbUrl, setDbUrl] = useState('');
  const [dbKey, setDbKey] = useState('');
  const [isSavingDb, setIsSavingDb] = useState(false);

  useEffect(() => {
      // Load existing DB configs
      const storedUrl = localStorage.getItem('aasani_supabase_url');
      const storedKey = localStorage.getItem('aasani_supabase_key');
      if (storedUrl) setDbUrl(storedUrl);
      if (storedKey) setDbKey(storedKey);
      
      // Load Analytics
      setUsageStats(analyticsService.getFeatureUsage());
  }, []);

  const handleAddMember = () => {
      if (newMember.trim() && !(teamMembers || []).includes(newMember.trim())) {
          onUpdateTeam([...(teamMembers || []), newMember.trim()]);
          setNewMember('');
      }
  };

  const handleRemoveMember = (member: string) => {
      onUpdateTeam((teamMembers || []).filter(m => m !== member));
  };

  const handleConnectClick = (integration: Integration) => {
      if (integration.connected) {
          onToggleIntegration(integration.id);
          return;
      }
      
      if (integration.category === 'AI') {
          setConnectingId(integration.id);
          setApiKeyInput('');
      } else {
          // Simulate Cloud OAuth
          setIsSubmitting(true);
          setTimeout(() => {
              onToggleIntegration(integration.id);
              setIsSubmitting(false);
          }, 1000);
      }
  };

  const handleSaveKey = async (id: string) => {
      const trimmedKey = apiKeyInput.trim();
      if (!trimmedKey) return;
      
      setIsSubmitting(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      await onToggleIntegration(id, trimmedKey);
      setIsSubmitting(false);
      setConnectingId(null);
      setApiKeyInput('');
  };

  const handleSaveDatabase = () => {
      if (!dbUrl.trim() || !dbKey.trim()) return;
      setIsSavingDb(true);
      localStorage.setItem('aasani_supabase_url', dbUrl.trim());
      localStorage.setItem('aasani_supabase_key', dbKey.trim());
      
      // Simulate delay then reload to apply new client
      setTimeout(() => {
          setIsSavingDb(false);
          window.location.reload();
      }, 1000);
  };

  const tabs = [
      { id: 'team', label: 'Team' },
      { id: 'general', label: 'General' },
      { id: 'integrations', label: 'Integrations' },
      { id: 'insights', label: 'Insights' },
      { id: 'data', label: 'Data' },
  ];

  return (
    <div className="flex-1 h-full bg-gray-50 dark:bg-black p-4 md:p-8 overflow-y-auto font-sans transition-colors duration-200">
        <div className="max-w-3xl mx-auto pb-12 relative">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

            {/* Tabs - Scrollable on mobile */}
            <div className="flex gap-6 mb-8 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar pb-1">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap px-1 ${activeTab === tab.id ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full" />}
                    </button>
                ))}
            </div>

            {/* TEAM TAB */}
            {activeTab === 'team' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage the list of people available for task assignment.</p>
                    </div>

                    <div className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                value={newMember}
                                onChange={(e) => setNewMember(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                                placeholder="Add new member name..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none dark:text-white"
                            />
                        </div>
                        <button 
                            onClick={handleAddMember}
                            disabled={!newMember.trim()}
                            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add
                        </button>
                    </div>

                    <div className="space-y-2">
                        {(teamMembers || []).map((member) => (
                            <div key={member} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 group hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                                        {member.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{member}</span>
                                </div>
                                {member !== 'Me' && (
                                    <button 
                                        onClick={() => handleRemoveMember(member)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in slide-in-from-bottom-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                            {isDarkMode ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-orange-500" />}
                            <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Switch between light and dark themes</div>
                            </div>
                        </div>
                        <button 
                            onClick={onToggleDarkMode}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${isDarkMode ? 'bg-black justify-end' : 'bg-gray-200 justify-start'}`}
                        >
                            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </button>
                    </div>
                </div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
                 <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in slide-in-from-bottom-2 space-y-6">
                    <div className="mb-2">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Apps</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage external connections and AI models.</p>
                    </div>

                    <div className="space-y-4">
                        {integrations.map(integration => {
                            const isConnecting = connectingId === integration.id;
                            
                            return (
                                <div key={integration.id} className={`border rounded-xl transition-all duration-200 overflow-hidden border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 ${isConnecting ? 'ring-2 ring-black dark:ring-white border-transparent' : ''}`}>
                                    <div className="p-4">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`p-3 rounded-lg flex-shrink-0 ${integration.connected ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                                                <integration.icon className="w-5 h-5" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 pt-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{integration.name}</h4>
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{integration.category}</span>
                                                    </div>
                                                    {integration.connected && <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full"><Check className="w-3 h-3" /> CONNECTED</div>}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{integration.description}</p>
                                            </div>
                                        </div>

                                        {isConnecting ? (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="relative">
                                                    <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                                    <input 
                                                        type="password"
                                                        autoFocus
                                                        value={apiKeyInput}
                                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                                        placeholder={`Enter ${integration.name} API Key`}
                                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleSaveKey(integration.id)}
                                                        disabled={!apiKeyInput.trim() || isSubmitting}
                                                        className="flex-1 bg-black dark:bg-white text-white dark:text-black py-2 rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Key'}
                                                    </button>
                                                    <button 
                                                        onClick={() => setConnectingId(null)}
                                                        className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleConnectClick(integration)}
                                                disabled={isSubmitting && !integration.connected}
                                                className={`w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                                                    integration.connected 
                                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'
                                                    : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80'
                                                }`}
                                            >
                                                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : integration.connected ? 'Disconnect' : 'Connect'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                 </div>
            )}

            {/* INSIGHTS TAB */}
            {activeTab === 'insights' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Workspace Analytics</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Track how you use Aasani.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Inbox Captured</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{usageStats['inbox_add_item'] || 0}</div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">AI Analyses</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{usageStats['inbox_analyzed'] || 0}</div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Chat Messages</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{usageStats['chat_message_sent'] || 0}</div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Stale Bundles</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{usageStats['stale_bundle_executed'] || 0}</div>
                        </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                        <p>These metrics are stored locally in your browser to help visualize your productivity patterns. No data is sent to external servers for tracking.</p>
                    </div>
                </div>
            )}

            {/* DATA TAB */}
            {activeTab === 'data' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    
                    {/* SUPABASE CONNECTION FORM */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Database className="w-5 h-5 text-green-600" /> Database Connection
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connect your own Supabase project to persist data.</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Project URL</label>
                                <input 
                                    type="text" 
                                    value={dbUrl}
                                    onChange={(e) => setDbUrl(e.target.value)}
                                    placeholder="https://your-project.supabase.co"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Anon Key</label>
                                <input 
                                    type="password" 
                                    value={dbKey}
                                    onChange={(e) => setDbKey(e.target.value)}
                                    placeholder="eyJh..."
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none dark:text-white"
                                />
                            </div>
                            <div className="pt-2">
                                <button 
                                    onClick={handleSaveDatabase}
                                    disabled={isSavingDb}
                                    className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSavingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save & Connect
                                </button>
                                <p className="text-[10px] text-gray-400 mt-2 text-center">
                                    Credentials are saved to your browser's local storage. Page will reload on save.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Folder className="w-5 h-5" /> Manage Projects
                        </h2>
                        <div className="space-y-2">
                            {projects.map(project => (
                                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="text-lg text-gray-500 dark:text-gray-400">
                                            <Folder className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{project.title}</span>
                                            <span className="text-xs text-gray-400">Created {new Date(project.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { if(confirm(`Delete project "${project.title}" and all its tasks?`)) onDeleteProject(project.id); }}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                        title="Delete Project"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {projects.length === 0 && <div className="text-sm text-gray-400 italic">No projects found.</div>}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5" /> Danger Zone
                        </h2>
                        <div className="p-4 border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded-lg flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-red-900 dark:text-red-200">Reset Workspace Data</div>
                                <div className="text-xs text-red-600 dark:text-red-400 mt-1">Clear all tasks, documents, and projects. This cannot be undone.</div>
                            </div>
                            <button 
                                onClick={() => { if(confirm('Are you sure? This will wipe all data.')) onClearData(); }}
                                className="px-4 py-2 bg-white dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-bold rounded hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                            >
                                Reset Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
