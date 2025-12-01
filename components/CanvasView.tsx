
import React, { useState, useRef, useEffect } from 'react';
import { CanvasNode, CanvasEdge } from '../types';
import { Plus, Move, ZoomIn, ZoomOut, Sparkles, Loader2, StickyNote, Image as ImageIcon, Trash2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';

export const CanvasView: React.FC = () => {
  const [nodes, setNodes] = useState<CanvasNode[]>([
      { id: '1', type: 'note', content: 'Project Goal: Launch V2', x: 0, y: 0, color: 'bg-yellow-200' },
      { id: '2', type: 'note', content: 'Key Metric: 1000 Users', x: 300, y: 0, color: 'bg-blue-200' },
  ]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  
  // Viewport State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Node Drag State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  
  // Brainstorming State
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
      // Zoom on wheel
      if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const zoomSensitivity = 0.001;
          const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomSensitivity), 4);
          setScale(newScale);
      } else {
          // Pan on wheel
          setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      // Middle mouse or Space+Click to pan
      if (e.button === 1 || e.shiftKey || e.target === containerRef.current) {
          setIsDraggingCanvas(true);
          setLastMousePos({ x: e.clientX, y: e.clientY });
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDraggingCanvas) {
          const dx = e.clientX - lastMousePos.x;
          const dy = e.clientY - lastMousePos.y;
          setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          setLastMousePos({ x: e.clientX, y: e.clientY });
      }

      if (draggingNodeId) {
          const dx = e.movementX / scale;
          const dy = e.movementY / scale;
          setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n));
      }
  };

  const handleMouseUp = () => {
      setIsDraggingCanvas(false);
      setDraggingNodeId(null);
  };

  // --- Touch Handlers (Mobile) ---
  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
          const touch = e.touches[0];
          // Check if touching a node or canvas
          const target = e.target as HTMLElement;
          const nodeElement = target.closest('[data-node-id]');
          
          if (nodeElement) {
               const nodeId = nodeElement.getAttribute('data-node-id');
               if (nodeId) setDraggingNodeId(nodeId);
               setLastMousePos({ x: touch.clientX, y: touch.clientY });
          } else {
               setIsDraggingCanvas(true);
               setLastMousePos({ x: touch.clientX, y: touch.clientY });
          }
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
          const touch = e.touches[0];
          const dx = touch.clientX - lastMousePos.x;
          const dy = touch.clientY - lastMousePos.y;
          
          if (isDraggingCanvas) {
              setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          } else if (draggingNodeId) {
               setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: n.x + dx / scale, y: n.y + dy / scale } : n));
          }
          
          setLastMousePos({ x: touch.clientX, y: touch.clientY });
      }
  };

  const handleTouchEnd = () => {
      setIsDraggingCanvas(false);
      setDraggingNodeId(null);
  };

  const addNode = (type: 'note' | 'task' = 'note') => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      
      const centerX = (width / 2 - offset.x) / scale;
      const centerY = (height / 2 - offset.y) / scale;

      const newNode: CanvasNode = {
          id: crypto.randomUUID(),
          type,
          content: type === 'note' ? 'New Idea' : 'New Task',
          x: centerX,
          y: centerY,
          color: 'bg-yellow-200'
      };
      setNodes(prev => [...prev, newNode]);
  };

  const deleteNode = (id: string) => {
      setNodes(prev => prev.filter(n => n.id !== id));
  };

  const handleBrainstorm = async () => {
      if (!prompt.trim()) return;
      setIsBrainstorming(true);
      
      const context = nodes.map(n => `- ${n.content}`).join('\n');
      const newNodes = await geminiService.brainstormCanvasNodes(prompt, context);
      
      if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          const centerX = (width / 2 - offset.x) / scale;
          const centerY = (height / 2 - offset.y) / scale;
          
          const positionedNodes = newNodes.map(n => ({
              ...n,
              x: centerX + n.x * 2,
              y: centerY + n.y * 2
          }));
          setNodes(prev => [...prev, ...positionedNodes]);
      }

      setIsBrainstorming(false);
      setShowPromptInput(false);
      setPrompt('');
  };

  return (
    <div 
        ref={containerRef}
        className="flex-1 h-full bg-[#f4f4f5] dark:bg-[#09090b] relative overflow-hidden cursor-default select-none font-sans touch-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
            backgroundImage: 'radial-gradient(circle, #d4d4d8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            backgroundColor: 'var(--bg-canvas)'
        }}
    >
        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-full shadow-xl px-2 py-1.5 flex items-center gap-2 z-20 whitespace-nowrap">
            <button onClick={() => addNode('note')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300" title="Add Note">
                <StickyNote className="w-5 h-5" />
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
            <button onClick={() => setShowPromptInput(!showPromptInput)} className={`p-2 rounded-full transition-colors flex items-center gap-2 ${showPromptInput ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                <Sparkles className="w-5 h-5" />
                <span className="text-xs font-bold hidden sm:inline">AI Spark</span>
            </button>
        </div>

        {/* Brainstorm Input */}
        {showPromptInput && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-4 w-[90vw] max-w-sm z-20 animate-in slide-in-from-top-2">
                <textarea 
                    autoFocus
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="What do you want to brainstorm? e.g. 'Marketing ideas for launch'"
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm p-3 focus:ring-2 focus:ring-black dark:focus:ring-white mb-3 resize-none"
                    rows={3}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={() => setShowPromptInput(false)} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">Cancel</button>
                    <button 
                        onClick={handleBrainstorm} 
                        disabled={isBrainstorming || !prompt.trim()}
                        className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isBrainstorming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Generate
                    </button>
                </div>
            </div>
        )}

        {/* Canvas Content */}
        <div 
            className="absolute top-0 left-0 w-full h-full origin-top-left transition-transform duration-75 ease-linear"
            style={{ 
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` 
            }}
        >
            {nodes.map(node => (
                <div 
                    key={node.id}
                    data-node-id={node.id}
                    className={`absolute w-48 min-h-[120px] p-4 shadow-md rounded-sm cursor-grab active:cursor-grabbing flex flex-col group transition-shadow hover:shadow-xl ${node.color || 'bg-yellow-200'}`}
                    style={{ left: node.x, top: node.y }}
                    onMouseDown={(e) => {
                        e.stopPropagation(); 
                        setDraggingNodeId(node.id);
                    }}
                >
                    <textarea 
                        value={node.content}
                        onChange={(e) => setNodes(nodes.map(n => n.id === node.id ? { ...n, content: e.target.value } : n))}
                        className="bg-transparent w-full h-full resize-none border-none focus:ring-0 p-0 text-gray-800 placeholder-gray-500/50 text-sm font-medium leading-relaxed font-handwriting"
                        placeholder="Write something..."
                    />
                    <button 
                        onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                        className="absolute top-[-10px] right-[-10px] bg-white dark:bg-gray-800 text-gray-400 hover:text-red-500 p-1.5 rounded-full shadow border border-gray-100 dark:border-gray-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            ))}
        </div>

        {/* View Controls */}
        <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-10">
            <button onClick={() => setScale(s => Math.min(4, s + 0.2))} className="p-2 bg-white dark:bg-black rounded-lg shadow border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setScale(s => Math.max(0.1, s - 0.2))} className="p-2 bg-white dark:bg-black rounded-lg shadow border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300"><ZoomOut className="w-4 h-4" /></button>
            <div className="bg-black/80 text-white text-[10px] px-2 py-1 rounded backdrop-blur text-center font-mono">
                {Math.round(scale * 100)}%
            </div>
        </div>
        
        <div className="absolute bottom-6 right-6 text-gray-400 dark:text-gray-600 text-xs font-medium pointer-events-none select-none hidden sm:block">
            Hold Shift + Drag to Pan • Scroll to Zoom
        </div>
    </div>
  );
};
