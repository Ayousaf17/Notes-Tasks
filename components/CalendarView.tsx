import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
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

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getPriorityColor = (p?: TaskPriority) => {
    switch(p) {
        case TaskPriority.HIGH: return 'bg-red-50 text-red-700 border-red-100 hover:border-red-200';
        case TaskPriority.MEDIUM: return 'bg-orange-50 text-orange-700 border-orange-100 hover:border-orange-200';
        case TaskPriority.LOW: return 'bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-200';
        default: return 'bg-gray-50 text-gray-700 border-gray-100 hover:border-gray-200';
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
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, day: number) => {
    e.preventDefault();
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
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
                {MONTHS[month]} <span className="text-gray-400 font-normal">{year}</span>
            </h2>
            <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                <button onClick={prevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-black">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
                <button onClick={nextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-black">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
             <button 
                onClick={() => setCurrentDate(new Date())}
                className="text-xs font-medium text-gray-500 hover:text-black px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
             >
                Today
             </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS.map(day => (
            <div key={day} className="py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                {day}
            </div>
        ))}
      </div>

      {/* Grid Body */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-gray-50/30 overflow-y-auto">
        {/* Empty cells for start padding */}
        {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="border-b border-r border-gray-100 bg-gray-50/50 min-h-[140px]"></div>
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
                    className={`group border-b border-r border-gray-100 p-2 min-h-[140px] transition-colors relative flex flex-col gap-1 
                        ${isToday ? 'bg-white ring-1 ring-inset ring-blue-100 z-10' : ''}
                        ${isDragOver ? 'bg-indigo-50/50' : 'hover:bg-white'}
                    `}
                >
                    <div className="flex justify-between items-start mb-1 pointer-events-none">
                        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-black text-white' : 'text-gray-500 group-hover:text-gray-900'}`}>
                            {day}
                        </span>
                        {dayTasks.length > 0 && (
                            <span className="text-[10px] text-gray-400 font-medium">{dayTasks.length} due</span>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[120px] no-scrollbar">
                        {dayTasks.map(task => (
                            <div 
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onClick={(e) => { e.stopPropagation(); onSelectTask && onSelectTask(task.id); }}
                                className={`
                                    cursor-grab active:cursor-grabbing text-left px-2 py-1.5 rounded text-[10px] font-medium border truncate w-full transition-transform hover:scale-[1.02] shadow-sm 
                                    ${getPriorityColor(task.priority)} 
                                    ${task.status === TaskStatus.DONE ? 'opacity-50 line-through grayscale' : ''}
                                `}
                                title={task.title}
                            >
                                {task.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
        
        {/* End padding to fill grid if needed */}
        {Array.from({ length: (7 - ((daysInMonth + firstDay) % 7)) % 7 }).map((_, i) => (
            <div key={`end-${i}`} className="border-b border-r border-gray-100 bg-gray-50/50"></div>
        ))}
      </div>
    </div>
  );
};