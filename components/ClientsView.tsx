
import React, { useState } from 'react';
import { Client, Project, ClientActivity } from '../types';
import { Mail, Briefcase, DollarSign, Clock, Users, Search, Plus, Filter, MoreHorizontal, LayoutGrid, List, Phone, Calendar, CheckCircle2, MessageSquare, Send, X, FileText, ChevronRight, Folder } from 'lucide-react';

interface ClientsViewProps {
  clients: Client[];
  projects: Project[];
  onAddClient: () => void;
}

const STAGES = ['Lead', 'Negotiation', 'Active', 'Churned'];

export const ClientsView: React.FC<ClientsViewProps> = ({ clients, projects, onAddClient }) => {
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activityInput, setActivityInput] = useState('');

  // Calculate Total Pipeline Value
  const totalValue = clients.reduce((acc, curr) => acc + curr.value, 0);

  const handleAddActivity = () => {
      if (!activityInput.trim() || !selectedClient) return;
      
      const newActivity: ClientActivity = {
          id: Date.now().toString(),
          type: 'note',
          content: activityInput,
          timestamp: new Date()
      };

      // In a real app, this would update the DB. For now, we mutate local state for the UI effect
      selectedClient.activities = [newActivity, ...(selectedClient.activities || [])];
      setActivityInput('');
  };

  return (
    <div className="flex-1 h-full bg-white dark:bg-black overflow-hidden flex flex-col font-sans animate-in fade-in duration-300 relative">
      
      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-24">
        <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Clients & Leads</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Total Pipeline Value: <span className="font-bold text-green-600 dark:text-green-400">${totalValue.toLocaleString()}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('pipeline')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'pipeline' ? 'bg-white dark:bg-gray-700 shadow-sm text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <button onClick={onAddClient} className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Client
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search clients..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                    />
                </div>
                <button className="p-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500">
                    <Filter className="w-4 h-4" />
                </button>
            </div>

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Company</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Value</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Projects</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Last Contact</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {clients.length > 0 ? clients.map((client) => {
                                    const clientProjects = projects.filter(p => p.clientId === client.id).length;
                                    
                                    return (
                                        <tr 
                                            key={client.id} 
                                            onClick={() => setSelectedClient(client)}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-xs text-gray-600 dark:text-gray-300">
                                                        {client.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{client.name}</div>
                                                        <div className="text-xs text-gray-500">{client.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="w-3 h-3" />
                                                    {client.company}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                    client.status === 'Active' 
                                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                                    : client.status === 'Lead'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                                    : client.status === 'Negotiation'
                                                    ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                                }`}>
                                                    {client.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                ${client.value.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {clientProjects} Active
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {client.lastContact.toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                                            No clients found. Add your first client to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PIPELINE VIEW */}
            {viewMode === 'pipeline' && (
                <div className="flex gap-6 overflow-x-auto pb-4 animate-in fade-in slide-in-from-bottom-4">
                    {STAGES.map(stage => {
                        const stageClients = clients.filter(c => c.status === stage);
                        const stageValue = stageClients.reduce((acc, c) => acc + c.value, 0);
                        
                        return (
                            <div key={stage} className="flex-none w-80 flex flex-col h-full rounded-xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 p-4">
                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
                                    <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">{stage}</h3>
                                    <span className="text-xs font-medium text-gray-400">{stageClients.length}</span>
                                </div>
                                
                                <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                                    {stageClients.map(client => (
                                        <div 
                                            key={client.id} 
                                            onClick={() => setSelectedClient(client)}
                                            className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md cursor-pointer transition-all group hover:-translate-y-1"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-gray-900 dark:text-white text-sm">{client.company}</div>
                                                <div className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold">
                                                    ${(client.value / 1000).toFixed(0)}k
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">{client.name}</div>
                                            <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(client.lastContact).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    ))}
                                    {stageClients.length === 0 && (
                                        <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                                            No clients
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 pt-2 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    ${stageValue.toLocaleString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>

      {/* CLIENT DETAIL DRAWER */}
      {selectedClient && (
          <div className="absolute inset-y-0 right-0 w-full md:w-[600px] bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xl shadow-lg">
                              {selectedClient.company.charAt(0)}
                          </div>
                          <div>
                              <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{selectedClient.company}</h2>
                              <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${selectedClient.status === 'Active' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                                  {selectedClient.status}
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setSelectedClient(null)} className="p-2 bg-white dark:bg-gray-800 rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-colors shadow-sm">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="flex gap-4">
                      <a href={`mailto:${selectedClient.email}`} className="flex-1 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <Mail className="w-3.5 h-3.5" /> Email
                      </a>
                      <button className="flex-1 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <Phone className="w-3.5 h-3.5" /> Call
                      </button>
                      <button className="flex-1 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <Calendar className="w-3.5 h-3.5" /> Schedule
                      </button>
                  </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  
                  {/* Google Workspace Integration Slot */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest flex items-center gap-2">
                              <Folder className="w-3.5 h-3.5" /> Google Workspace
                          </h3>
                          <span className="text-[10px] bg-white dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">SYNC ACTIVE</span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-blue-100 dark:border-blue-900">
                              <Folder className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">Client_Assets/{selectedClient.company}</div>
                              <div className="text-[10px] text-gray-500">Shared Drive Folder</div>
                          </div>
                          <button className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">Open</button>
                      </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                          <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Deal Value</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">${selectedClient.value.toLocaleString()}</div>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                          <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Point of Contact</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white truncate">{selectedClient.name}</div>
                          <div className="text-xs text-gray-400 truncate">{selectedClient.email}</div>
                      </div>
                  </div>

                  {/* Active Projects */}
                  <div>
                      <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5" /> Active Projects
                      </h3>
                      <div className="space-y-2">
                          {projects.filter(p => p.clientId === selectedClient.id).length > 0 ? (
                              projects.filter(p => p.clientId === selectedClient.id).map(p => (
                                  <div key={p.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
                                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.title}</span>
                                      <ChevronRight className="w-4 h-4 text-gray-400" />
                                  </div>
                              ))
                          ) : (
                              <div className="text-sm text-gray-400 italic">No linked projects.</div>
                          )}
                      </div>
                  </div>

                  {/* Activity Timeline */}
                  <div>
                      <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5" /> Activity Log
                      </h3>
                      
                      {/* Input */}
                      <div className="flex gap-2 mb-6">
                          <input 
                              type="text" 
                              value={activityInput}
                              onChange={(e) => setActivityInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddActivity()}
                              placeholder="Log a call, note, or meeting..."
                              className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                          />
                          <button onClick={handleAddActivity} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity">
                              <Send className="w-4 h-4" />
                          </button>
                      </div>

                      {/* Timeline */}
                      <div className="space-y-6 relative before:absolute before:left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800">
                          {(selectedClient.activities || []).map((activity, i) => (
                              <div key={i} className="relative pl-8">
                                  <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-950 ${activity.type === 'call' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                                  <div className="text-sm text-gray-800 dark:text-gray-200">{activity.content}</div>
                                  <div className="text-[10px] text-gray-400 mt-1">{activity.timestamp.toLocaleString()}</div>
                              </div>
                          ))}
                          {(!selectedClient.activities || selectedClient.activities.length === 0) && (
                              <div className="pl-8 text-sm text-gray-400 italic">No recent activity recorded.</div>
                          )}
                      </div>
                  </div>

              </div>
          </div>
      )}
    </div>
  );
};
