
import React from 'react';
import { X, Cloud, CreditCard, MessageSquare, Database, Check } from 'lucide-react';
import { Integration } from '../types';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrations: Integration[];
  onToggleIntegration: (id: string) => void;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ 
  isOpen, 
  onClose, 
  integrations, 
  onToggleIntegration 
}) => {
  if (!isOpen) return null;

  const categories = Array.from(new Set(integrations.map(i => i.category)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-3xl rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Cloud className="w-6 h-6" />
              Connect Cloud
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your connected apps and services.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {categories.map(category => (
            <div key={category} className="mb-8 last:mb-0">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.filter(i => i.category === category).map(integration => (
                  <div key={integration.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-start gap-4 hover:border-gray-300 dark:hover:border-gray-700 transition-all bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="p-2 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                      <integration.icon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">{integration.name}</h4>
                        <button 
                          onClick={() => onToggleIntegration(integration.id)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                            integration.connected 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-gray-600'
                          }`}
                        >
                          {integration.connected ? 'Connected' : 'Connect'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{integration.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-b-xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
