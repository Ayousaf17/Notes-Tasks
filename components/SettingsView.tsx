import React, { useState } from 'react';
import { User, Trash2, Plus, Moon, Sun, Database, ShieldAlert } from 'lucide-react';

interface SettingsViewProps {
  teamMembers: string[];
  onUpdateTeam: (members: string[]) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onClearData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
    teamMembers, 
    onUpdateTeam,
    isDarkMode,
    onToggleDarkMode,
    onClearData
}) => {
  const [newMember, setNewMember] = useState('');
  const [activeTab, setActiveTab] = useState<'team' | 'general' | 'data'>('team');

  const handleAddMember = () => {
      if (newMember.trim() && !(teamMembers || []).includes(newMember.trim())) {
          onUpdateTeam([...(teamMembers || []), newMember.trim()]);
          setNewMember('');
      }
  };

  const handleRemoveMember = (member: string) => {
      onUpdateTeam((teamMembers || []).filter(m => m !== member));
  };

  return (
    <div className="flex-1 h-full bg-gray-50 dark:bg-black p-8 overflow-y-auto font-sans transition-colors duration-200">
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

            <div className="flex gap-6 mb-8 border-b border-gray-200 dark:border-gray-800">
                <button 
                    onClick={() => setActiveTab('team')}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'team' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    Team & Assignees
                    {activeTab === 'team' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full" />}
                </button>
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'general' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    General
                    {activeTab === 'general' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full" />}
                </button>
                <button 
                    onClick={() => setActiveTab('data')}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'data' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    Data & Storage
                    {activeTab === 'data' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white rounded-t-full" />}
                </button>
            </div>

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
                        {(teamMembers || []).length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm italic">No team members added yet.</div>
                        )}
                    </div>
                </div>
            )}

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

            {activeTab === 'data' && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-in fade-in slide-in-from-bottom-2">
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
            )}
        </div>
    </div>
  );
};