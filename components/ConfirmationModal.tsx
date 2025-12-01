
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 animate-in zoom-in-95 duration-200 font-sans">
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 rounded-full shrink-0 ${isDanger ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all transform active:scale-95 ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-700 dark:hover:bg-red-500' 
                : 'bg-black dark:bg-white dark:text-black hover:opacity-80'
            }`}
          >
            {confirmText}
          </button>
        </div>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
