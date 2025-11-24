import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, AgentRole } from '../types';
import { X, Calendar, User, Flag, CheckSquare, AlignLeft, Trash2 } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  users: string[];
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, isOpen, onClose, onUpdate, onDelete, users }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  
  // Sync local state when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
  }, [task]);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdate(task.id, { title, description });
    onClose();
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(task.id, { status: e.target.value as TaskStatus });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(task.id, { priority: e.target.value as TaskPriority });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(task.id, { assignee: e.target.value });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
        onUpdate(task.id, { dueDate: new Date(e.target.value) });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-50">
            <div className="flex-1 mr-4">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => onUpdate(task.id, { title })}
                    className="w-full text-xl font-semibold text-gray-900 border-none focus:ring-0 p-0 placeholder-gray-300"
                    placeholder="Task Title"
                />
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <span>in Project</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-black p-1">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
            
            {/* Main Content */}
            <div className="flex-1 space-y-6">
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <AlignLeft className="w-4 h-4" /> Description
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={() => onUpdate(task.id, { description })}
                        placeholder="Add a more detailed description..."
                        className="w-full h-40 text-sm text-gray-600 border border-gray-200 rounded-lg p-3 focus:ring-1 focus:ring-black focus:border-black resize-none"
                    />
                </div>

                {task.agentResult && (
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                        <h4 className="text-xs font-bold text-purple-800 uppercase mb-2">AI Agent Output</h4>
                        <div className="text-sm text-purple-900 whitespace-pre-wrap leading-relaxed">
                            {task.agentResult.output}
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Properties */}
            <div className="w-full md:w-64 space-y-6">
                
                {/* Status */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                    <div className="relative">
                        <select 
                            value={task.status} 
                            onChange={handleStatusChange}
                            className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-black focus:border-black"
                        >
                            <option value={TaskStatus.TODO}>To Do</option>
                            <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                            <option value={TaskStatus.DONE}>Done</option>
                        </select>
                        <CheckSquare className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Priority */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase">Priority</label>
                    <div className="relative">
                        <select 
                            value={task.priority} 
                            onChange={handlePriorityChange}
                            className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-black focus:border-black"
                        >
                            <option value={TaskPriority.HIGH}>High</option>
                            <option value={TaskPriority.MEDIUM}>Medium</option>
                            <option value={TaskPriority.LOW}>Low</option>
                        </select>
                        <Flag className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Assignee */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase">Assignee</label>
                    <div className="relative">
                        <select 
                            value={task.assignee || ''} 
                            onChange={handleAssigneeChange}
                            className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-black focus:border-black"
                        >
                            <option value="">Unassigned</option>
                            <optgroup label="People">
                                {users.filter(u => !u.startsWith('AI_')).map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </optgroup>
                            <optgroup label="AI Agents">
                                <option value={AgentRole.RESEARCHER}>AI Researcher</option>
                                <option value={AgentRole.WRITER}>AI Writer</option>
                                <option value={AgentRole.PLANNER}>AI Planner</option>
                            </optgroup>
                        </select>
                        <User className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Due Date */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase">Due Date</label>
                    <div className="relative">
                        <input 
                            type="date" 
                            value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                            onChange={handleDateChange}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 focus:ring-black focus:border-black"
                        />
                    </div>
                </div>

            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-50 flex justify-between bg-gray-50/50 rounded-b-xl">
            <button 
                onClick={() => { onDelete(task.id); onClose(); }}
                className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-2 px-3 py-2 rounded hover:bg-red-50 transition-colors"
            >
                <Trash2 className="w-4 h-4" /> Delete Task
            </button>
            <button 
                onClick={onClose}
                className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
                Done
            </button>
        </div>

      </div>
    </div>
  );
};