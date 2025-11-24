
import React, { useState } from 'react';
import { X, Cloud, MessageSquare, Check, Loader2, Lock, AlertCircle } from 'lucide-react';
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
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Productivity Focus: Cloud & AI Only
  const categories = ['Cloud', 'AI'];

  const handleConnectClick = (integration: Integration) => {
      if (integration.connected) {
          // Disconnect immediately
          onToggleIntegration(integration.id);
          return;
      }

      // If AI category, show API key input
      if (integration.category === 'AI') {
          setActiveConfigId(integration.id);
          setApiKeyInput('');
      } else {
          // Simulate OAuth for Cloud
          setLoadingId(integration.id);
          setTimeout(() => {
              onToggleIntegration(integration.id);
              setLoadingId(null);
          }, 1500); // Fake network delay
      }
  };

  const confirmApiKey = () => {
      if (activeConfigId) {
          setLoadingId(activeConfigId);
          setTimeout(() => {
              onToggleIntegration(activeConfigId, apiKeyInput);
              setLoadingId(null);
              setActiveConfigId(null);
          }, 1000);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 font-sans overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Cloud className="w-6 h-6 text-black dark:text-white" />
              Connect Cloud
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
                            const isConfiguring = activeConfigId === integration.id;
                            const isLoading = loadingId === integration.id;

                            return (
                                <div key={integration.id} className={`bg-white dark:bg-gray-900 border rounded-xl transition-all duration-200 overflow-hidden ${isConfiguring ? 'ring-2 ring-black dark:ring-white border-transparent shadow-lg' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm hover:shadow-md'}`}>
                                    <div className="p-5 flex items-start gap-4">
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

                                        <button 
                                            onClick={() => handleConnectClick(integration)}
                                            disabled={isLoading}
                                            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all min-w-[90px] flex items-center justify-center ${
                                                integration.connected 
                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'
                                                : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80 shadow-md'
                                            }`}
                                        >
                                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : integration.connected ? 'Disconnect' : 'Connect'}
                                        </button>
                                    </div>

                                    {/* Configuration Drawer */}
                                    {isConfiguring && (
                                        <div className="px-5 pb-5 pt-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
                                                <Lock className="w-3 h-3" />
                                                <span>Enter your API Key to enable this model.</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="password" 
                                                    value={apiKeyInput}
                                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                                    placeholder={`sk-...`}
                                                    className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={confirmApiKey}
                                                    disabled={!apiKeyInput}
                                                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                            <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
                                                <AlertCircle className="w-3 h-3" />
                                                Keys are stored locally in your browser.
                                            </div>
                                        </div>
                                    )}
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