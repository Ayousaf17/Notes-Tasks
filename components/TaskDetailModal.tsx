
import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, AgentRole, Project } from '../types';
import { X, Calendar, User, Flag, CheckSquare, AlignLeft, Trash2, Folder } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  users: string[];
  projects: Project[]; 
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, isOpen, onClose, onUpdate, onDelete, users, projects }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [assigneeInput, setAssigneeInput] = useState(task.assignee || '');
  
  // Sync local state when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setAssigneeInput(task.assignee || '');
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
    const val = e.target.value;
    setAssigneeInput(val);
    onUpdate(task.id, { assignee: val });
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(task.id, { projectId: e.target.value });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
        onUpdate(task.id, { dueDate: new Date(e.target.value) });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-2xl rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-50 dark:border-gray-800">
            <div className="flex-1 mr-4">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => onUpdate(task.id, { title })}
                    className="w-full text-xl font-semibold text-gray-900 dark:text-white border-none focus:ring-0 p-0 placeholder-gray-300 dark:placeholder-gray-600 bg-transparent"
                    placeholder="Task Title"
                />
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-2">
                    <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white p-1">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
            
            {/* Main Content */}
            <div className="flex-1 space-y-6">
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <AlignLeft className="w-4 h-4" /> Description
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={() => onUpdate(task.id, { description })}
                        placeholder="Add a more detailed description..."
                        className="w-full h-40 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-3 focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white resize-none"
                    />
                </div>

                {task.agentResult && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800/50">
                        <h4 className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase mb-2">AI Agent Output</h4>
                        <div className="text-sm text-purple-900 dark:text-purple-200 whitespace-pre-wrap leading-relaxed">
                            {task.agentResult.output}
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Properties */}
            <div className="w-full md:w-64 space-y-6">
                
                {/* Project */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</label>
                    <div className="relative">
                        <select 
                            value={task.projectId} 
                            onChange={handleProjectChange}
                            className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white cursor-pointer"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                        <Folder className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</label>
                    <div className="relative">
                        <select 
                            value={task.status} 
                            onChange={handleStatusChange}
                            className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white cursor-pointer"
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
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</label>
                    <div className="relative">
                        <select 
                            value={task.priority} 
                            onChange={handlePriorityChange}
                            className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white cursor-pointer"
                        >
                            <option value={TaskPriority.HIGH}>High</option>
                            <option value={TaskPriority.MEDIUM}>Medium</option>
                            <option value={TaskPriority.LOW}>Low</option>
                        </select>
                        <Flag className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Assignee - Dropdown Select */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Assignee</label>
                    <div className="relative">
                        <select 
                            value={assigneeInput}
                            onChange={handleAssigneeChange}
                            className="w-full appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg px-3 py-2 pr-8 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white cursor-pointer"
                        >
                            <option value="">Unassigned</option>
                            <optgroup label="Team">
                                {users.map(u => (
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
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Due Date</label>
                    <div className="relative">
                        <input 
                            type="date" 
                            value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                            onChange={handleDateChange}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg px-3 py-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white"
                        />
                    </div>
                </div>

            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-50 dark:border-gray-800 flex justify-between bg-gray-50/50 dark:bg-gray-900/50 rounded-b-xl">
            <button 
                onClick={() => { onDelete(task.id); onClose(); }}
                className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-2 px-3 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
                <Trash2 className="w-4 h-4" /> Delete Task
            </button>
            <button 
                onClick={onClose}
                className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
                Done
            </button>
        </div>

      </div>
    </div>
  );
};
