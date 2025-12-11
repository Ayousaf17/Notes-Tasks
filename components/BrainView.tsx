
import React, { useState, useEffect } from 'react';
import { BusinessContext, Goal, Document, Project } from '../types';
import { dataService } from '../services/dataService';
import { geminiService } from '../services/geminiService';
import { BrainCircuit, BookTemplate, Target, Save, Plus, Trash2, Edit3, FileText, ArrowRight, ChevronRight, CheckCircle2, Loader2, Link as LinkIcon, Sparkles } from 'lucide-react';

interface BrainViewProps {
    documents: Document[];
    onNavigate: (type: 'document', id: string) => void;
    onShowToast: (msg: string, type: 'success' | 'error') => void;
    projects?: Project[];
}

export const BrainView: React.FC<BrainViewProps> = ({ documents, onNavigate, onShowToast, projects = [] }) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'sops' | 'goals'>('identity');
  const [context, setContext] = useState<BusinessContext>(dataService.getBusinessContext());
  const [goals, setGoals] = useState<Goal[]>(dataService.getGoals());
  const [isSaving, setIsSaving] = useState(false);

  // New Goal State
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({ status: 'On Track' });
  
  // AI Goal Extraction State
  const [isExtractingGoals, setIsExtractingGoals] = useState(false);
  const [proposedGoals, setProposedGoals] = useState<Partial<Goal>[]>([]);

  // Filter SOPs from documents
  const sops = documents.filter(d => d.tags?.includes('SOP') || d.title.toLowerCase().includes('sop'));

  useEffect(() => {
      // Load initial data
      setContext(dataService.getBusinessContext());
      setGoals(dataService.getGoals());
  }, []);

  const handleSaveContext = async () => {
      setIsSaving(true);
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

  const handleApproveGoal = (proposal: Partial<Goal>) => {
      const goal: Goal = {
          id: crypto.randomUUID(),
          title: proposal.title || 'New Goal',
          metric: proposal.metric || 'TBD',
          currentValue: 0,
          targetValue: proposal.targetValue || 100,
          status: 'On Track',
          quarter: 'Next Quarter',
      };
      const updatedGoals = [...goals, goal];
      setGoals(updatedGoals);
      dataService.saveGoals(updatedGoals);
      setProposedGoals(prev => prev.filter(p => p !== proposal));
      onShowToast("Goal approved and added.", 'success');
  };

  const handleRejectGoal = (proposal: Partial<Goal>) => {
      setProposedGoals(prev => prev.filter(p => p !== proposal));
  };

  const handleExtractGoals = async (docId: string) => {
      const doc = documents.find(d => d.id === docId);
      if (!doc) return;
      
      setIsExtractingGoals(true);
      try {
          const extracted = await geminiService.extractGoalsFromDoc(doc.content);
          if (extracted && extracted.length > 0) {
              setProposedGoals(extracted);
              onShowToast(`${extracted.length} goals proposed from document.`, 'success');
          } else {
              onShowToast("No clear goals found in this document.", 'error');
          }
      } catch (e) {
          onShowToast("Failed to extract goals.", 'error');
      } finally {
          setIsExtractingGoals(false);
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
      { id: 'sops', label: 'SOP Library', icon: BookTemplate },
      { id: 'goals', label: 'Goals (OKRs)', icon: Target },
  ];

  return (
    <div className="flex-1 h-full bg-background p-6 md:p-10 overflow-y-auto font-sans transition-colors duration-200">
        <div className="max-w-5xl mx-auto pb-12">
            
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-serif font-bold text-foreground flex items-center gap-3 tracking-tight">
                    Business Brain
                </h1>
                <p className="text-muted-foreground mt-3 max-w-2xl text-lg leading-relaxed">
                    The control center for your AI's logic. Define your business DNA, operating procedures, and strategic objectives here to ensure every AI action is aligned.
                </p>
            </div>

            {/* Navigation */}
            <div className="flex gap-8 mb-10 border-b border-border">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 flex items-center gap-2 text-sm font-bold transition-all relative ${
                            activeTab === tab.id 
                            ? 'text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
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
                            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <BrainCircuit className="w-4 h-4" /> Core DNA
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-2">Company Name</label>
                                        <input 
                                            type="text" 
                                            value={context.companyName}
                                            onChange={(e) => setContext({...context, companyName: e.target.value})}
                                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                                            placeholder="e.g. Acme Corp"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-2">Core Offer / Value Prop</label>
                                        <textarea 
                                            value={context.coreOffer}
                                            onChange={(e) => setContext({...context, coreOffer: e.target.value})}
                                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none h-24 resize-none transition-all"
                                            placeholder="What do you sell and to whom? (e.g. High-end consulting for SaaS)"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Brand Strategy Card */}
                            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Positioning
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-2">Target Audience</label>
                                        <input 
                                            type="text" 
                                            value={context.targetAudience}
                                            onChange={(e) => setContext({...context, targetAudience: e.target.value})}
                                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                                            placeholder="e.g. Founders with >$1M ARR"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-2">Brand Voice</label>
                                        <input 
                                            type="text" 
                                            value={context.brandVoice}
                                            onChange={(e) => setContext({...context, brandVoice: e.target.value})}
                                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                                            placeholder="e.g. Authoritative, Witty, Concise"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* System Instructions Card */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col h-full">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Edit3 className="w-4 h-4" /> System Prompt (The "Brain")
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                These rigid instructions are injected into <span className="font-bold text-foreground">every AI interaction</span>. Define your non-negotiables, formatting rules, and operational constraints here.
                            </p>
                            <div className="flex-1 relative">
                                <textarea 
                                    value={context.customInstructions}
                                    onChange={(e) => setContext({...context, customInstructions: e.target.value})}
                                    className="w-full h-full min-h-[300px] bg-muted/50 border border-border rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary outline-none resize-none font-mono leading-relaxed text-foreground"
                                    placeholder={`Example:\n- Always prioritize high-ticket clients.\n- Never schedule meetings on Fridays.\n- When proposing tasks, always include a deadline.\n- Keep email drafts under 150 words.`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-border sticky bottom-0 bg-background py-4 z-10">
                        <button 
                            onClick={handleSaveContext}
                            disabled={isSaving}
                            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg disabled:opacity-70"
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
                                Documents tagged with <span className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">#SOP</span> appear here. 
                                The AI uses these to understand <i>how</i> to execute specific tasks.
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                            <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Active Playbooks ({sops.length})</h3>
                        </div>
                        
                        <div className="divide-y divide-border">
                            {sops.length > 0 ? sops.map(doc => {
                                const linkedProject = projects.find(p => p.id === doc.projectId);
                                return (
                                <div key={doc.id} className="p-5 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm">{doc.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                {linkedProject && (
                                                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <LinkIcon className="w-3 h-3" /> {linkedProject.title}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground">Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleExtractGoals(doc.id)}
                                            disabled={isExtractingGoals}
                                            className="text-xs font-medium text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-100 dark:hover:bg-purple-900/40 flex items-center gap-2"
                                        >
                                            {isExtractingGoals ? <Loader2 className="w-3 h-3 animate-spin"/> : <Target className="w-3 h-3"/>}
                                            Scan for OKRs
                                        </button>
                                        <button 
                                            onClick={() => onNavigate('document', doc.id)}
                                            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                        >
                                            Edit <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}) : (
                                <div className="p-12 text-center">
                                    <div className="text-muted-foreground mb-4 flex justify-center"><BookTemplate className="w-12 h-12" /></div>
                                    <p className="text-muted-foreground mb-4">No SOPs found.</p>
                                    <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">Create a new document and add the tag <span className="font-mono text-foreground">#SOP</span> to see it here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* GOALS TAB */}
            {activeTab === 'goals' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    
                    {/* Goal Approvals (if any) */}
                    {proposedGoals.length > 0 && (
                        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-2xl p-6 mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                <h3 className="font-bold text-purple-900 dark:text-purple-200">AI Suggested OKRs ({proposedGoals.length})</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {proposedGoals.map((prop, i) => (
                                    <div key={i} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-purple-100 dark:border-purple-800/50 shadow-sm">
                                        <div className="font-bold text-foreground text-sm mb-1">{prop.title}</div>
                                        <div className="text-xs text-muted-foreground mb-3">{prop.metric} (Target: {prop.targetValue})</div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproveGoal(prop)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-1.5 rounded-lg text-xs font-bold transition-colors">Approve</button>
                                            <button onClick={() => handleRejectGoal(prop)} className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-600 dark:text-gray-300 py-1.5 rounded-lg text-xs font-bold transition-colors">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-end">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Objectives & Key Results (OKRs)</h3>
                            <p className="text-sm text-muted-foreground mt-1">Connect your tasks to high-level business goals.</p>
                        </div>
                        <button 
                            onClick={() => setIsAddingGoal(true)}
                            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
                        >
                            <Plus className="w-4 h-4" /> Add Goal
                        </button>
                    </div>

                    {isAddingGoal && (
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-xl mb-8 animate-in slide-in-from-top-2">
                            <h4 className="text-sm font-bold mb-6 uppercase tracking-wider text-muted-foreground">New Objective</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Objective</label>
                                    <input 
                                        type="text" placeholder="e.g. Increase Revenue" 
                                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={newGoal.title || ''} onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Key Result Metric</label>
                                    <input 
                                        type="text" placeholder="e.g. $100k ARR" 
                                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={newGoal.metric || ''} onChange={e => setNewGoal({...newGoal, metric: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Value (Numeric)</label>
                                    <input 
                                        type="number" placeholder="100" 
                                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={newGoal.targetValue || ''} onChange={e => setNewGoal({...newGoal, targetValue: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                                    <select 
                                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                        value={newGoal.status} onChange={e => setNewGoal({...newGoal, status: e.target.value as any})}
                                    >
                                        <option value="On Track">On Track</option>
                                        <option value="At Risk">At Risk</option>
                                        <option value="Off Track">Off Track</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsAddingGoal(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                                <button onClick={handleAddGoal} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-colors shadow-md">Save Goal</button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {goals.length > 0 ? goals.map(goal => (
                            <div key={goal.id} className="bg-card p-6 rounded-2xl border border-border shadow-sm relative group hover:shadow-md transition-shadow">
                                <button 
                                    onClick={() => { if(confirm('Delete goal?')) handleDeleteGoal(goal.id); }}
                                    className="absolute top-6 right-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
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
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{goal.quarter} • {goal.status}</div>
                                        <h3 className="text-xl font-bold text-foreground leading-tight">{goal.title}</h3>
                                    </div>
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-6 pl-5">{goal.metric}</p>
                                
                                {/* Progress Bar */}
                                <div className="pl-5">
                                    <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                                        <span>Progress</span>
                                        <span>{Math.round((goal.currentValue / goal.targetValue) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                                        <div 
                                            className="bg-foreground h-full rounded-full transition-all duration-1000 ease-out" 
                                            style={{ width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%` }} 
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-medium text-muted-foreground mt-2">
                                        <span>{goal.currentValue}</span>
                                        <span>{goal.targetValue} target</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-2xl">
                                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No goals set yet. Define your first OKR.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
