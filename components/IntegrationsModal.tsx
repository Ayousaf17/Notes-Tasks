
import React, { useState } from 'react';
import { X, Cloud, MessageSquare, Check, Loader2, Key, ExternalLink, AlertCircle } from 'lucide-react';
import { Integration } from '../types';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrations: Integration[];
  onToggleIntegration: (id: string, apiKey?: string) => Promise<void>;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ 
  isOpen, 
  onClose, 
  integrations, 
  onToggleIntegration 
}) => {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const categories = ['Cloud', 'AI'];

  const handleConnectClick = (integration: Integration) => {
      if (integration.connected) {
          // Disconnect
          onToggleIntegration(integration.id);
          return;
      }
      
      // For Google/Cloud, we typically simulate or need a backend for OAuth.
      // For AI, we need API Keys.
      if (integration.category === 'AI') {
          setConnectingId(integration.id);
          setApiKeyInput('');
      } else {
          // Simulate OAuth for Cloud services (since we don't have a backend)
          setIsSubmitting(true);
          setTimeout(() => {
              onToggleIntegration(integration.id);
              setIsSubmitting(false);
          }, 1000);
      }
  };

  const handleSaveKey = async (id: string) => {
      if (!apiKeyInput.trim()) return;
      setIsSubmitting(true);
      // Simulate validation delay
      await new Promise(resolve => setTimeout(resolve, 800));
      await onToggleIntegration(id, apiKeyInput);
      setIsSubmitting(false);
      setConnectingId(null);
      setApiKeyInput('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Main Modal */}
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 font-sans overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Cloud className="w-6 h-6 text-black dark:text-white" />
              Connect Apps
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Supercharge your workspace with AI and Cloud Sync.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50 dark:bg-gray-950/50">
          <div className="grid grid-cols-1 gap-y-12">
            {categories.map(category => (
                <div key={category} className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        {category === 'Cloud' && <Cloud className="w-3 h-3" />}
                        {category === 'AI' && <MessageSquare className="w-3 h-3" />}
                        {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {integrations.filter(i => i.category === category).map(integration => {
                            const isConnecting = connectingId === integration.id;
                            const isProcessing = isSubmitting; // Simplification: lock all during submit for demo

                            return (
                                <div key={integration.id} className={`bg-white dark:bg-gray-900 border rounded-xl transition-all duration-200 overflow-hidden border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm hover:shadow-md ${isConnecting ? 'ring-2 ring-black dark:ring-white border-transparent' : ''}`}>
                                    <div className="p-5">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`p-3 rounded-lg flex-shrink-0 ${integration.connected ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                                                <integration.icon className="w-6 h-6" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 pt-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white truncate text-base">{integration.name}</h4>
                                                    {integration.connected && <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full"><Check className="w-3 h-3" /> SYNCED</div>}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{integration.description}</p>
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
                                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                                    <AlertCircle className="w-3 h-3" />
                                                    <span>Keys are stored locally in your browser.</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleConnectClick(integration)}
                                                disabled={isSubmitting && !integration.connected}
                                                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                                    integration.connected 
                                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'
                                                    : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80 shadow-md'
                                                }`}
                                            >
                                                {isSubmitting && !integration.connected ? <Loader2 className="w-3 h-3 animate-spin" /> : integration.connected ? 'Disconnect' : 'Connect'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-2xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
