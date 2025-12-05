import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      setIsCreating(true);
      // Simulate slight delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      onCreate(title);
      setTitle('');
      setIsCreating(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!isCreating ? onClose : undefined}></div>
      <div className="relative bg-white dark:bg-gray-900 p-6 rounded-xl w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create New Project</h2>
          <button onClick={onClose} disabled={isCreating} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Project Name</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Marketing Campaign"
              disabled={isCreating}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all disabled:opacity-50"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isCreating}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!title.trim() || isCreating} 
              className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isCreating && <Loader2 className="w-3 h-3 animate-spin" />}
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};