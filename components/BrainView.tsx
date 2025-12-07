
import React, { useState, useEffect } from 'react';
import { BusinessContext, Goal, Document } from '../types';
import { dataService } from '../services/dataService';
import { BrainCircuit, BookTemplate, Target, Save, Plus, Trash2, Edit3, FileText, ArrowRight, ChevronRight, CheckCircle2 } from 'lucide-react';

interface BrainViewProps {
    documents: Document[];
    onNavigate: (type: 'document', id: string) => void;
    onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const BrainView: React.FC<BrainViewProps> = ({ documents, onNavigate, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'sops' | 'goals'>('identity');
  const [context, setContext] = useState<BusinessContext>(dataService.getBusinessContext());
  const [goals, setGoals] = useState<Goal[]>(dataService.getGoals());
  const [isSaving, setIsSaving] = useState(false);

  // New Goal State
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({ status: 'On Track' });

  // Filter SOPs from documents
  const sops = documents.filter(d => d.tags?.includes('SOP') || d.title.toLowerCase().includes('sop'));

  useEffect(() => {
      // Load initial data
      setContext(dataService.getBusinessContext());
      setGoals(dataService.getGoals());
  }, []);

  const handleSaveContext = async () => {
      setIsSaving(true);
      // Simulate network delay for better UX feel
      await new Promise(resolve => setTimeout(resolve, 600));
      dataService.saveBusinessContext(context);
      setIsSaving(false);
      onShowToast("Business context saved successfully.", 'success');
  };

  const handleAddGoal = () => {
      if (newGoal.title && newGoal.metric) {
          const goal: Goal = {
              id: crypto.randomUUID(),
              title: newGoal.title,
              metric: newGoal.metric,
              currentValue: 0,
              targetValue: newGoal.targetValue || 100,
              status: newGoal.status || 'On Track',
              quarter: 'Q4 2025',
              ...newGoal
          } as Goal;
          const updatedGoals = [...goals, goal];
          setGoals(updatedGoals);
          dataService.saveGoals(updatedGoals);
          setIsAddingGoal(false);
          setNewGoal({ status: 'On Track' });
          onShowToast("Goal added.", 'success');
      }
  };

  const handleDeleteGoal = (id: string) => {
      const updatedGoals = goals.filter(g => g.id !== id);
      setGoals(updatedGoals);
      dataService.saveGoals(updatedGoals);
      onShowToast("Goal deleted.", 'success');
  };

  const tabs = [
      { id: 'identity', label: 'Identity & Context', icon: BrainCircuit },
      { id: 'sops', label: 'SOPs & Playbooks', icon: BookTemplate },
      { id: 'goals', label: 'Goals (OKRs)', icon: Target },
  ];

  return (
    <div className="flex-1 h-full bg-white dark:bg-black p-6 md:p-10 overflow-y-auto font-sans transition-colors duration-200">
        <div className="max-w-5xl mx-auto pb-12">
            
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                    Business Brain
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-2xl text-lg leading-relaxed">
                    The control center for your AI's logic. Define your business DNA, operating procedures, and strategic objectives here to ensure every AI action is aligned.
                </p>
            </div>

            {/* Navigation */}
            <div className="flex gap-8 mb-10 border-b border-gray-100 dark:border-gray-800">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 flex items-center gap-2 text-sm font-bold transition-all relative ${
                            activeTab === tab.id 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-purple-600' : ''}`} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* IDENTITY TAB */}
            {activeTab === 'identity' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            {/* Core DNA Card */}
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <BrainCircuit className="w-4 h-4" /> Core DNA
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name</label>
                                        <input 
                                            type="text" 
                                            value={context.companyName}
                                            onChange={(e) => setContext({...context, companyName: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all"
                                            placeholder="e.g. Acme Corp"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Core Offer / Value Prop</label>
                                        <textarea 
                                            value={context.coreOffer}
                                            onChange={(e) => setContext({...context, coreOffer: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none h-24 resize-none transition-all"
                                            placeholder="What do you sell and to whom? (e.g. High-end consulting for SaaS)"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Brand Strategy Card */}
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Positioning
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Target Audience</label>
                                        <input 
                                            type="text" 
                                            value={context.targetAudience}
                                            onChange={(e) => setContext({...context, targetAudience: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all"
                                            placeholder="e.g. Founders with >$1M ARR"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Brand Voice</label>
                                        <input 
                                            type="text" 
                                            value={context.brandVoice}
                                            onChange={(e) => setContext({...context, brandVoice: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all"
                                            placeholder="e.g. Authoritative, Witty, Concise"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* System Instructions Card */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-full">
                            <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Edit3 className="w-4 h-4" /> System Prompt (The "Brain")
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                                These rigid instructions are injected into <span className="font-bold text-gray-700 dark:text-gray-200">every AI interaction</span>. Define your non-negotiables, formatting rules, and operational constraints here.
                            </p>
                            <div className="flex-1 relative">
                                <textarea 
                                    value={context.customInstructions}
                                    onChange={(e) => setContext({...context, customInstructions: e.target.value})}
                                    className="w-full h-full min-h-[300px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none font-mono leading-relaxed text-gray-800 dark:text-gray-200"
                                    placeholder={`Example:\n- Always prioritize high-ticket clients.\n- Never schedule meetings on Fridays.\n- When proposing tasks, always include a deadline.\n- Keep email drafts under 150 words.`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-black py-4 z-10">
                        <button 
                            onClick={handleSaveContext}
                            disabled={isSaving}
                            className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg disabled:opacity-70"
                        >
                            {isSaving ? <span className="animate-spin text-lg">⏳</span> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Saving...' : 'Save Context'}
                        </button>
                    </div>
                </div>
            )}

            {/* SOPs TAB */}
            {activeTab === 'sops' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-8 mb-8 flex items-start gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 mt-1">
                            <BookTemplate className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-2">Standard Operating Procedures</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed max-w-2xl">
                                Aasani automatically indexes documents tagged with <span className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">#SOP</span> as executable procedures. 
                                When you ask the AI to "Onboard Client" or "Publish Blog", it reads these docs to generate tasks.
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200 uppercase tracking-wider">Active Playbooks ({sops.length})</h3>
                        </div>
                        
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {sops.length > 0 ? sops.map(doc => (
                                <div key={doc.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">{doc.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                {doc.tags.map(t => (
                                                    <span key={t} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>
                                                ))}
                                                <span className="text-[10px] text-gray-400">Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onNavigate('document', doc.id)}
                                        className="text-sm font-medium text-gray-400 hover:text-black dark:hover:text-white flex items-center gap-1 group-hover:translate-x-1 transition-all"
                                    >
                                        Edit <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )) : (
                                <div className="p-12 text-center">
                                    <div className="text-gray-300 dark:text-gray-600 mb-4 flex justify-center"><BookTemplate className="w-12 h-12" /></div>
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">No SOPs found.</p>
                                    <p className="text-sm text-gray-400 max-w-md mx-auto">Create a new document and add the tag <span className="font-mono text-gray-600 dark:text-gray-300">#SOP</span> to see it here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* GOALS TAB */}
            {activeTab === 'goals' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Objectives & Key Results (OKRs)</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connect your tasks to high-level business goals.</p>
                        </div>
                        <button 
                            onClick={() => setIsAddingGoal(true)}
                            className="bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
                        >
                            <Plus className="w-4 h-4" /> Add Goal
                        </button>
                    </div>

                    {isAddingGoal && (
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl mb-8 animate-in slide-in-from-top-2">
                            <h4 className="text-sm font-bold mb-6 uppercase tracking-wider text-gray-500">New Objective</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Objective</label>
                                    <input 
                                        type="text" placeholder="e.g. Increase Revenue" 
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={newGoal.title || ''} onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Key Result Metric</label>
                                    <input 
                                        type="text" placeholder="e.g. $100k ARR" 
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={newGoal.metric || ''} onChange={e => setNewGoal({...newGoal, metric: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Target Value (Numeric)</label>
                                    <input 
                                        type="number" placeholder="100" 
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={newGoal.targetValue || ''} onChange={e => setNewGoal({...newGoal, targetValue: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                                    <select 
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                        value={newGoal.status} onChange={e => setNewGoal({...newGoal, status: e.target.value as any})}
                                    >
                                        <option value="On Track">On Track</option>
                                        <option value="At Risk">At Risk</option>
                                        <option value="Off Track">Off Track</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsAddingGoal(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleAddGoal} className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors shadow-md">Save Goal</button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {goals.length > 0 ? goals.map(goal => (
                            <div key={goal.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative group hover:shadow-md transition-shadow">
                                <button 
                                    onClick={() => { if(confirm('Delete goal?')) handleDeleteGoal(goal.id); }}
                                    className="absolute top-6 right-6 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-2 h-12 rounded-full ${
                                        goal.status === 'On Track' ? 'bg-green-500' :
                                        goal.status === 'At Risk' ? 'bg-orange-500' :
                                        'bg-red-500'
                                    }`} />
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{goal.quarter} • {goal.status}</div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{goal.title}</h3>
                                    </div>
                                </div>
                                
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 pl-5">{goal.metric}</p>
                                
                                {/* Progress Bar */}
                                <div className="pl-5">
                                    <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                                        <span>Progress</span>
                                        <span>{Math.round((goal.currentValue / goal.targetValue) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                                        <div 
                                            className="bg-black dark:bg-white h-full rounded-full transition-all duration-1000 ease-out" 
                                            style={{ width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%` }} 
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-medium text-gray-400 mt-2">
                                        <span>{goal.currentValue}</span>
                                        <span>{goal.targetValue} target</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                                <Target className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400">No goals set yet. Define your first OKR.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
