import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Cloud } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  onSelectTask?: (taskId: string) => void;
  onUpdateTaskDueDate?: (taskId: string, date: Date) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onSelectTask, onUpdateTaskDueDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Drag State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null); // Stores date string of hovered cell

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  // Ensure we always render 6 rows (42 cells) for consistent height
  const totalSlots = 42; 

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getPriorityColor = (task: Task) => {
    if (task.externalType === 'GOOGLE_CALENDAR') {
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/70';
    }
    switch(task.priority) {
        case TaskPriority.HIGH: return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/50 hover:border-red-200';
        case TaskPriority.MEDIUM: return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-900/50 hover:border-orange-200';
        case TaskPriority.LOW: return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/50 hover:border-blue-200';
        default: return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-700 hover:border-gray-200';
    }
  };

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const map = new Map<number, Task[]>();
    tasks.forEach(task => {
        if (task.dueDate) {
            const tDate = new Date(task.dueDate);
            if (tDate.getMonth() === month && tDate.getFullYear() === year) {
                const day = tDate.getDate();
                if (!map.has(day)) map.set(day, []);
                map.get(day)?.push(task);
            }
        }
    });
    return map;
  }, [tasks, month, year]);

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    if (task.externalType) return; // Prevent dragging external events
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
    // Visual tweak
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.5';
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
      const el = e.currentTarget as HTMLElement;
      el.style.opacity = '1';
      setDraggedTaskId(null);
      setDragOverDate(null);
  }

  const handleDragOver = (e: React.DragEvent, day: number) => {
    e.preventDefault(); // Essential for allowing drop
    const dateStr = `${year}-${month}-${day}`;
    if (dragOverDate !== dateStr) {
        setDragOverDate(dateStr);
    }
  };

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onUpdateTaskDueDate) {
        const newDate = new Date(year, month, day);
        onUpdateTaskDueDate(taskId, newDate);
    }
    setDraggedTaskId(null);
    setDragOverDate(null);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-black overflow-hidden font-sans transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {MONTHS[month]} <span className="text-gray-400 dark:text-gray-500 font-normal">{year}</span>
            </h2>
            <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-100 dark:border-gray-700">
                <button onClick={prevMonth} className="p-1.5 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-600 mx-1"></div>
                <button onClick={nextMonth} className="p-1.5 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
             <button 
                onClick={() => setCurrentDate(new Date())}
                className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
             >
                Today
             </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800 shrink-0">
        {DAYS.map(day => (
            <div key={day} className="py-2 text-center text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {day}
            </div>
        ))}
      </div>

      {/* Grid Body */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 bg-gray-50/30 dark:bg-black overflow-hidden">
        {/* Empty cells for start padding */}
        {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="border-b border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black"></div>
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayTasks = tasksByDay.get(day) || [];
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const isDragOver = dragOverDate === `${year}-${month}-${day}`;

            return (
                <div 
                    key={day} 
                    onDragOver={(e) => handleDragOver(e, day)}
                    onDrop={(e) => handleDrop(e, day)}
                    className={`group border-b border-r border-gray-100 dark:border-gray-800 p-2 transition-all relative flex flex-col gap-1 overflow-hidden
                        ${isToday ? 'bg-white dark:bg-gray-900 ring-1 ring-inset ring-black dark:ring-white z-10' : ''}
                        ${isDragOver ? 'bg-indigo-50/80 dark:bg-indigo-900/50 ring-2 ring-inset ring-indigo-200 dark:ring-indigo-500' : 'hover:bg-white dark:hover:bg-gray-900'}
                    `}
                >
                    <div className="flex justify-between items-start mb-1 pointer-events-none">
                        <span className={`text-sm font-medium w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200'}`}>
                            {day}
                        </span>
                        {dayTasks.length > 0 && (
                            <span className="text-[10px] text-gray-400 font-medium">{dayTasks.length} due</span>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                        {dayTasks.map(task => (
                            <div 
                                key={task.id}
                                draggable={!task.externalType}
                                onDragStart={(e) => handleDragStart(e, task)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => { e.stopPropagation(); if (!task.externalType) onSelectTask && onSelectTask(task.id); }}
                                className={`
                                    cursor-pointer text-left px-2 py-1.5 rounded text-[10px] font-medium border truncate w-full transition-transform hover:scale-[1.02] shadow-sm flex items-center gap-1.5
                                    ${getPriorityColor(task)} 
                                    ${task.status === TaskStatus.DONE ? 'opacity-50 line-through grayscale' : ''}
                                `}
                                title={task.title}
                            >
                                {task.externalType === 'GOOGLE_CALENDAR' && <Cloud className="w-3 h-3 shrink-0" />}
                                <span className="truncate">{task.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
        
        {/* End padding to fill grid (Always target 42 cells) */}
        {Array.from({ length: totalSlots - (daysInMonth + firstDay) }).map((_, i) => (
            <div key={`end-${i}`} className="border-b border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black"></div>
        ))}
      </div>
    </div>
  );
};