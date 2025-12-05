
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Document, Task, TaskStatus } from '../types';
import { FileText, CheckSquare, ZoomIn, ZoomOut, RefreshCw, GitGraph, Layers, LayoutTemplate } from 'lucide-react';

interface GraphViewProps {
  documents: Document[];
  tasks: Task[];
  onNavigate: (type: 'document' | 'task', id: string) => void;
}

interface Node {
  id: string;
  type: 'document' | 'task';
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  data: Document | Task;
  radius: number;
  column?: number;
  height?: number; // For Sankey
}

interface Link {
  id: string;
  source: string;
  target: string;
  type: 'wiki' | 'dependency' | 'promotion' | 'mention';
}

export const GraphView: React.FC<GraphViewProps> = ({ documents, tasks, onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [lastTouchPos, setLastTouchPos] = useState({ x: 0, y: 0 });
  
  // Layout Mode: 'organic' (Force) or 'sankey' (Structured Flow)
  const [layoutMode, setLayoutMode] = useState<'organic' | 'sankey'>('sankey');

  // --- 1. Graph Data Preparation ---
  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const centerX = width / 2;
    const centerY = height / 2;

    // Helper to determine Sankey Column
    // 0: Documents (Source)
    // 1: To Do (Backlog)
    // 2: In Progress (Active)
    // 3: Done (Completed)
    const getColumn = (type: 'document' | 'task', data: any) => {
        if (type === 'document') return 0;
        if (data.status === TaskStatus.TODO) return 1;
        if (data.status === TaskStatus.IN_PROGRESS) return 2;
        return 3;
    };

    const newNodes: Node[] = [];
    const newLinks: Link[] = [];

    // Create Nodes
    documents.forEach(doc => {
        const existing = nodes.find(n => n.id === doc.id);
        newNodes.push({
            id: doc.id,
            type: 'document',
            label: doc.title || 'Untitled',
            x: existing ? existing.x : centerX - 300,
            y: existing ? existing.y : centerY + (Math.random() - 0.5) * 200,
            vx: 0,
            vy: 0,
            data: doc,
            radius: 20, // Slightly smaller for dense graphs
            column: 0,
            height: 40 // Default visual height
        });
    });

    tasks.forEach(task => {
        const existing = nodes.find(n => n.id === task.id);
        const col = getColumn('task', task);
        newNodes.push({
            id: task.id,
            type: 'task',
            label: task.title,
            x: existing ? existing.x : centerX,
            y: existing ? existing.y : centerY,
            vx: 0,
            vy: 0,
            data: task,
            radius: 12,
            column: col,
            height: 30
        });
    });

    // Create Links
    tasks.forEach(task => {
        // Document -> Task (Parent)
        if (task.linkedDocumentId && documents.find(d => d.id === task.linkedDocumentId)) {
            newLinks.push({ id: `link-p-${task.id}`, source: task.linkedDocumentId, target: task.id, type: 'promotion' });
        }
        // Task -> Task (Dependency)
        if (task.dependencies) {
            task.dependencies.forEach(depId => {
                if (tasks.find(t => t.id === depId)) {
                    newLinks.push({ id: `link-d-${task.id}-${depId}`, source: depId, target: task.id, type: 'dependency' });
                }
            });
        }
    });

    // Document -> Document or Document -> Task (Mentions)
    documents.forEach(doc => {
        const regex = /nexus:\/\/(document|task)\/([a-zA-Z0-9-.]+)/g;
        let match;
        while ((match = regex.exec(doc.content)) !== null) {
            const targetType = match[1];
            const targetId = match[2];
            // Only add if not already linked by promotion (avoid duplicates)
            if (!newLinks.find(l => l.source === doc.id && l.target === targetId)) {
                 const exists = targetType === 'document' ? documents.find(d => d.id === targetId) : tasks.find(t => t.id === targetId);
                 if (exists) newLinks.push({ id: `link-m-${doc.id}-${targetId}`, source: doc.id, target: targetId, type: 'wiki' });
            }
        }
    });

    setNodes(newNodes);
    setLinks(newLinks);
    
    // Reset view if switching to sankey first time
    if (layoutMode === 'sankey') {
        setOffset({ x: 0, y: 0 });
        setScale(1);
    }
  }, [documents, tasks]); 


  // --- 2. Simulation / Layout Logic ---
  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();

        setNodes(prevNodes => {
            const nextNodes = prevNodes.map(n => ({ ...n }));

            if (layoutMode === 'sankey') {
                // --- SANKEY (DETERMINISTIC) LAYOUT ---
                const columns = [0, 1, 2, 3];
                const colWidth = width / columns.length;
                const startX = colWidth / 2; // Center of first column
                
                columns.forEach(colIndex => {
                    const colNodes = nextNodes.filter(n => n.column === colIndex);
                    // Sort nodes to minimize link crossing (heuristic: sort by ID or connections)
                    // Simple sort: connected nodes closer to top
                    colNodes.sort((a, b) => a.id.localeCompare(b.id));

                    const totalHeight = colNodes.reduce((sum, n) => sum + (n.height || 40) + 20, 0); // 20px gap
                    let currentY = (height / 2) - (totalHeight / 2);

                    colNodes.forEach(node => {
                        // Target Positions
                        const targetX = startX + (colIndex * colWidth * 0.85); // 0.85 to squeeze slightly
                        const targetY = currentY + ((node.height || 40) / 2);

                        // Easing for smooth transition if switching modes
                        node.x += (targetX - node.x) * 0.1;
                        node.y += (targetY - node.y) * 0.1;
                        
                        // Stop velocity
                        node.vx = 0;
                        node.vy = 0;

                        currentY += (node.height || 40) + 20; // Increment Y
                    });
                });

            } else {
                // --- ORGANIC (FORCE) LAYOUT ---
                const k = 0.05; // Spring constant
                const repulsion = 5000;
                const drag = 0.90;

                // Repulsion
                for (let i = 0; i < nextNodes.length; i++) {
                    for (let j = i + 1; j < nextNodes.length; j++) {
                        const dx = nextNodes[i].x - nextNodes[j].x;
                        const dy = nextNodes[i].y - nextNodes[j].y;
                        const distSq = dx * dx + dy * dy || 1;
                        const dist = Math.sqrt(distSq);
                        
                        const force = repulsion / distSq;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;

                        nextNodes[i].vx += fx;
                        nextNodes[i].vy += fy;
                        nextNodes[j].vx -= fx;
                        nextNodes[j].vy -= fy;
                    }
                }

                // Attraction (Links)
                links.forEach(link => {
                    const source = nextNodes.find(n => n.id === link.source);
                    const target = nextNodes.find(n => n.id === link.target);
                    if (source && target) {
                        const dx = target.x - source.x;
                        const dy = target.y - source.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        
                        const force = (dist - 150) * k; 
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;

                        source.vx += fx;
                        source.vy += fy;
                        target.vx -= fx;
                        target.vy -= fy;
                    }
                });

                // Center Gravity
                const cx = width / 2;
                const cy = height / 2;
                nextNodes.forEach(node => {
                    node.vx += (cx - node.x) * 0.002;
                    node.vy += (cy - node.y) * 0.002;
                });

                // Apply Velocity
                nextNodes.forEach(node => {
                    if (dragNodeId === node.id) return;
                    node.vx *= drag;
                    node.vy *= drag;
                    node.x += node.vx;
                    node.y += node.vy;
                });
            }

            return nextNodes;
        });

        animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [links, dragNodeId, layoutMode]);


  // --- 3. Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      setDragNodeId(nodeId);
      setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging && dragNodeId) {
          const { movementX, movementY } = e;
          setNodes(prev => prev.map(n => {
              if (n.id === dragNodeId) {
                  return { ...n, x: n.x + movementX / scale, y: n.y + movementY / scale };
              }
              return n;
          }));
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
      setDragNodeId(null);
  };

  const handlePan = (e: React.MouseEvent) => {
      if (isDragging) return;
      if (e.buttons === 1) { 
         setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
      const sensitivity = 0.001;
      const newScale = Math.max(0.2, Math.min(3, scale - e.deltaY * sensitivity));
      setScale(newScale);
  };

  // --- 4. Render Helpers ---

  const getNodeColor = (node: Node) => {
      if (node.type === 'document') return '#3b82f6'; // Blue
      const task = node.data as Task;
      if (task.status === TaskStatus.DONE) return '#10b981'; // Green
      if (task.status === TaskStatus.IN_PROGRESS) return '#f59e0b'; // Amber
      return '#ef4444'; // Red
  };

  const getGradientId = (link: Link) => `grad-${link.source}-${link.target}`;

  // Bezier Curve for Sankey
  const getPath = (source: Node, target: Node) => {
      const sx = source.x + (layoutMode === 'sankey' ? 10 : 0); // Start from right side of node
      const sy = source.y;
      const tx = target.x - (layoutMode === 'sankey' ? 10 : 0); // End at left side of node
      const ty = target.y;

      // Control points
      const dx = Math.abs(tx - sx);
      const cp1x = sx + dx * 0.5;
      const cp1y = sy;
      const cp2x = tx - dx * 0.5;
      const cp2y = ty;

      return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;
  };

  return (
    <div 
        ref={containerRef}
        className="flex-1 h-full bg-slate-50 dark:bg-black relative overflow-hidden cursor-move select-none transition-colors duration-200 touch-none"
        onMouseMove={(e) => { handleMouseMove(e); handlePan(e); }}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onMouseDown={handlePan}
    >
        {/* Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 flex flex-col">
                <button 
                    onClick={() => setLayoutMode('sankey')} 
                    className={`p-2 rounded-md transition-colors ${layoutMode === 'sankey' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                    title="Sankey Flow View"
                >
                    <LayoutTemplate className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setLayoutMode('organic')} 
                    className={`p-2 rounded-md transition-colors ${layoutMode === 'organic' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                    title="Organic Network View"
                >
                    <GitGraph className="w-4 h-4" />
                </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 flex flex-col mt-2">
                <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded"><ZoomIn className="w-4 h-4" /></button>
                <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded"><ZoomOut className="w-4 h-4" /></button>
                <button onClick={() => { setScale(1); setOffset({x:0, y:0}); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded"><RefreshCw className="w-4 h-4" /></button>
            </div>
        </div>

        {/* Sankey Columns Background */}
        {layoutMode === 'sankey' && (
            <div className="absolute inset-0 flex pointer-events-none z-0">
                {['Documents', 'To Do', 'In Progress', 'Done'].map((label, i) => (
                    <div key={label} className="flex-1 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col items-center pt-6">
                        <div className="text-xs font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest bg-white/50 dark:bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-gray-100 dark:border-gray-800">
                            {label}
                        </div>
                    </div>
                ))}
            </div>
        )}

        <svg className="w-full h-full pointer-events-none z-10">
            {/* Gradients Definitions */}
            <defs>
                {links.map(link => {
                    const sourceNode = nodes.find(n => n.id === link.source);
                    const targetNode = nodes.find(n => n.id === link.target);
                    if (!sourceNode || !targetNode) return null;
                    return (
                        <linearGradient key={getGradientId(link)} id={getGradientId(link)} gradientUnits="userSpaceOnUse" x1={sourceNode.x} y1={sourceNode.y} x2={targetNode.x} y2={targetNode.y}>
                            <stop offset="0%" stopColor={getNodeColor(sourceNode)} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={getNodeColor(targetNode)} stopOpacity="0.4" />
                        </linearGradient>
                    );
                })}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
                {/* Links */}
                {links.map((link) => {
                    const source = nodes.find(n => n.id === link.source);
                    const target = nodes.find(n => n.id === link.target);
                    if (!source || !target) return null;
                    
                    const isHovered = hoverNodeId === source.id || hoverNodeId === target.id;
                    const strokeWidth = layoutMode === 'sankey' ? (isHovered ? 12 : 8) : (isHovered ? 3 : 1.5);
                    const opacity = isHovered ? 0.9 : 0.6;

                    return (
                        <path 
                            key={link.id}
                            d={getPath(source, target)}
                            fill="none"
                            stroke={`url(#${getGradientId(link)})`}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            opacity={opacity}
                            className="transition-all duration-300 ease-out"
                        />
                    );
                })}

                {/* Nodes */}
                {nodes.map(node => {
                    const isHovered = hoverNodeId === node.id;
                    const baseColor = getNodeColor(node);

                    return (
                        <g 
                            key={node.id} 
                            transform={`translate(${node.x}, ${node.y})`}
                            className="pointer-events-auto cursor-pointer"
                            onMouseDown={(e) => handleMouseDown(e, node.id)}
                            onClick={(e) => {
                                if (!isDragging) {
                                    e.stopPropagation();
                                    onNavigate(node.type, node.id);
                                }
                            }}
                            onMouseEnter={() => setHoverNodeId(node.id)}
                            onMouseLeave={() => setHoverNodeId(null)}
                        >
                            {/* Halo effect on hover */}
                            {isHovered && (
                                <circle r={node.radius + 8} fill={baseColor} opacity={0.2} filter="url(#glow)" />
                            )}

                            {layoutMode === 'sankey' ? (
                                // Sankey Node Style (Rectangular Pillars)
                                <g>
                                    <rect 
                                        x={-10} y={-15} 
                                        width={20} height={30} 
                                        rx={4}
                                        fill={baseColor}
                                        stroke="white" strokeWidth={2}
                                        className="dark:stroke-gray-900 shadow-md"
                                    />
                                    {node.type === 'document' && <FileText className="w-3 h-3 text-white absolute" x={-6} y={-6} />}
                                    {node.type === 'task' && <CheckSquare className="w-3 h-3 text-white absolute" x={-6} y={-6} />}
                                </g>
                            ) : (
                                // Organic Node Style (Circles)
                                <g>
                                    <circle 
                                        r={node.radius} 
                                        fill={isHovered ? baseColor : 'white'} 
                                        stroke={baseColor} 
                                        strokeWidth={3} 
                                        className="dark:fill-gray-900 transition-colors" 
                                    />
                                    <g transform="translate(-8, -8)">
                                        {node.type === 'document' ? 
                                            <FileText className={`w-4 h-4 ${isHovered ? 'text-white' : 'text-gray-500'}`} /> : 
                                            <CheckSquare className={`w-4 h-4 ${isHovered ? 'text-white' : 'text-gray-500'}`} />
                                        }
                                    </g>
                                </g>
                            )}

                            {/* Label */}
                            <text 
                                y={layoutMode === 'sankey' ? 30 : node.radius + 15} 
                                textAnchor="middle" 
                                className={`text-[8px] font-bold uppercase tracking-wider transition-all duration-300 ${isHovered ? 'fill-black dark:fill-white text-[10px]' : 'fill-gray-400 dark:fill-gray-500'}`}
                                style={{ userSelect: 'none', textShadow: isHovered ? '0px 0px 4px rgba(255,255,255,0.5)' : 'none' }}
                            >
                                {node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label}
                            </text>
                        </g>
                    );
                })}
            </g>
        </svg>
    </div>
  );
};
