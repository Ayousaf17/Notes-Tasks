
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Document, Task, TaskStatus } from '../types';
import { FileText, CheckSquare, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

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
}

interface Link {
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

  // --- 1. Graph Construction ---
  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const centerX = width / 2;
    const centerY = height / 2;

    const newNodes: Node[] = [];
    const newLinks: Link[] = [];

    // Create Nodes
    documents.forEach(doc => {
        // Reuse existing position if possible to avoid reset
        const existing = nodes.find(n => n.id === doc.id);
        newNodes.push({
            id: doc.id,
            type: 'document',
            label: doc.title || 'Untitled',
            x: existing ? existing.x : centerX + (Math.random() - 0.5) * 200,
            y: existing ? existing.y : centerY + (Math.random() - 0.5) * 200,
            vx: 0,
            vy: 0,
            data: doc,
            radius: 25
        });
    });

    tasks.forEach(task => {
        const existing = nodes.find(n => n.id === task.id);
        newNodes.push({
            id: task.id,
            type: 'task',
            label: task.title,
            x: existing ? existing.x : centerX + (Math.random() - 0.5) * 300,
            y: existing ? existing.y : centerY + (Math.random() - 0.5) * 300,
            vx: 0,
            vy: 0,
            data: task,
            radius: 15
        });
    });

    // Create Links
    // 1. Task -> Doc (Promotion)
    tasks.forEach(task => {
        if (task.linkedDocumentId) {
            newLinks.push({ source: task.id, target: task.linkedDocumentId, type: 'promotion' });
        }
        // 2. Task -> Task (Dependency)
        if (task.dependencies) {
            task.dependencies.forEach(depId => {
                if (tasks.find(t => t.id === depId)) {
                    newLinks.push({ source: task.id, target: depId, type: 'dependency' });
                }
            });
        }
    });

    // 3. Doc -> Doc/Task (Wiki Links & Mentions)
    documents.forEach(doc => {
        // Nexus Links
        const regex = /nexus:\/\/(document|task)\/([a-zA-Z0-9-.]+)/g;
        let match;
        while ((match = regex.exec(doc.content)) !== null) {
            const targetType = match[1];
            const targetId = match[2];
            const exists = targetType === 'document' ? documents.find(d => d.id === targetId) : tasks.find(t => t.id === targetId);
            if (exists) {
                newLinks.push({ source: doc.id, target: targetId, type: 'wiki' });
            }
        }

        // Wiki Links [[Title]]
        const regexWiki = /\[\[(.*?)\]\]/g;
        let wikiMatch;
        while ((wikiMatch = regexWiki.exec(doc.content)) !== null) {
            const title = wikiMatch[1];
            const foundDoc = documents.find(d => d.title.toLowerCase() === title.toLowerCase());
            if (foundDoc && foundDoc.id !== doc.id) {
                newLinks.push({ source: doc.id, target: foundDoc.id, type: 'wiki' });
            }
        }
    });

    setNodes(newNodes);
    setLinks(newLinks);
    // Only reset offset if it's the first load
    if (nodes.length === 0) setOffset({ x: 0, y: 0 });
  }, [documents, tasks]); 


  // --- 2. Simulation Loop ---
  useEffect(() => {
    let animationFrameId: number;
    
    const tick = () => {
        setNodes(prevNodes => {
            const nextNodes = prevNodes.map(n => ({ ...n }));
            const k = 0.05; // attraction strength
            const repulsion = 4000; // repulsion strength
            const drag = 0.90; // friction

            // 1. Repulsion (Node-Node)
            for (let i = 0; i < nextNodes.length; i++) {
                for (let j = i + 1; j < nextNodes.length; j++) {
                    const dx = nextNodes[i].x - nextNodes[j].x;
                    const dy = nextNodes[i].y - nextNodes[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = repulsion / (distance * distance);
                    
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;

                    nextNodes[i].vx += fx;
                    nextNodes[i].vy += fy;
                    nextNodes[j].vx -= fx;
                    nextNodes[j].vy -= fy;
                }
            }

            // 2. Attraction (Links)
            links.forEach(link => {
                const source = nextNodes.find(n => n.id === link.source);
                const target = nextNodes.find(n => n.id === link.target);
                if (source && target) {
                    const dx = target.x - source.x;
                    const dy = target.y - source.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    
                    // Spring force
                    const force = (distance - 150) * k; 
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;

                    source.vx += fx;
                    source.vy += fy;
                    target.vx -= fx;
                    target.vy -= fy;
                }
            });

            // 3. Center Gravity
            if (containerRef.current) {
                 const { width, height } = containerRef.current.getBoundingClientRect();
                 const cx = width / 2;
                 const cy = height / 2;
                 nextNodes.forEach(node => {
                     node.vx += (cx - node.x) * 0.005;
                     node.vy += (cy - node.y) * 0.005;
                 });
            }

            // 4. Update Positions
            nextNodes.forEach(node => {
                // If dragging, don't update position from physics
                if (dragNodeId === node.id) return;
                
                node.vx *= drag;
                node.vy *= drag;
                node.x += node.vx;
                node.y += node.vy;
            });

            return nextNodes;
        });
        
        animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [links, dragNodeId]);


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
      if (e.buttons === 1) { // Left click pan
         setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
      const sensitivity = 0.001;
      const newScale = Math.max(0.1, Math.min(4, scale - e.deltaY * sensitivity));
      setScale(newScale);
  };

  // --- Render Helpers ---
  const getNodeColor = (node: Node) => {
      if (node.type === 'document') return '#3b82f6'; // Blue-500
      const task = node.data as Task;
      if (task.status === TaskStatus.DONE) return '#22c55e'; // Green-500
      if (task.status === TaskStatus.IN_PROGRESS) return '#eab308'; // Yellow-500
      return '#f97316'; // Orange-500
  };

  return (
    <div 
        ref={containerRef}
        className="flex-1 h-full bg-slate-50 dark:bg-black relative overflow-hidden cursor-move select-none transition-colors duration-200"
        onMouseMove={(e) => { handleMouseMove(e); handlePan(e); }}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
    >
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button onClick={() => setScale(s => Math.min(4, s + 0.2))} className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setScale(s => Math.max(0.1, s - 0.2))} className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={() => { setScale(1); setOffset({x:0, y:0}); }} className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><RefreshCw className="w-4 h-4" /></button>
        </div>

        {/* Graph SVG */}
        <svg className="w-full h-full pointer-events-none">
            <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
                
                {/* Links */}
                {links.map((link, i) => {
                    const source = nodes.find(n => n.id === link.source);
                    const target = nodes.find(n => n.id === link.target);
                    if (!source || !target) return null;

                    const isHighlight = hoverNodeId === link.source || hoverNodeId === link.target;

                    return (
                        <line 
                            key={i}
                            x1={source.x} y1={source.y}
                            x2={target.x} y2={target.y}
                            stroke={isHighlight ? '#94a3b8' : '#e2e8f0'}
                            strokeWidth={isHighlight ? 3 : 1.5}
                            strokeDasharray={link.type === 'dependency' ? "4" : "0"}
                            className="dark:stroke-gray-700"
                        />
                    );
                })}

                {/* Nodes */}
                {nodes.map(node => (
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
                        {/* Shadow/Glow on hover */}
                        {hoverNodeId === node.id && (
                             <circle r={node.radius + 5} fill={getNodeColor(node)} opacity={0.2} />
                        )}

                        {/* Node Shape */}
                        {node.type === 'document' ? (
                            <circle r={node.radius} className="fill-white dark:fill-gray-900" stroke={getNodeColor(node)} strokeWidth={3} />
                        ) : (
                            <rect 
                                x={-node.radius} y={-node.radius} 
                                width={node.radius*2} height={node.radius*2} 
                                rx={6} 
                                className="fill-white dark:fill-gray-900"
                                stroke={getNodeColor(node)} 
                                strokeWidth={3} 
                            />
                        )}

                        {/* Icon */}
                        <g transform="translate(-8, -8)">
                             {node.type === 'document' ? 
                                <FileText className="w-4 h-4 text-slate-600 dark:text-slate-300" /> : 
                                <CheckSquare className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                             }
                        </g>

                        {/* Label */}
                        <text 
                            y={node.radius + 15} 
                            textAnchor="middle" 
                            className={`text-[10px] font-medium fill-slate-600 dark:fill-slate-400 ${hoverNodeId === node.id ? 'font-bold fill-black dark:fill-white' : ''}`}
                            style={{ userSelect: 'none' }}
                        >
                            {node.label.length > 15 ? node.label.substring(0, 14) + '...' : node.label}
                        </text>
                    </g>
                ))}
            </g>
        </svg>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-lg shadow border border-gray-100 dark:border-gray-800 p-3 text-xs space-y-2 pointer-events-none select-none text-gray-900 dark:text-gray-100">
            <div className="font-semibold mb-1">Graph Legend</div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white dark:bg-gray-800"></div>
                <span>Document</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-white dark:bg-gray-800 border-2 border-green-500"></div>
                <span>Task (Done)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-white dark:bg-gray-800 border-2 border-orange-500"></div>
                <span>Task (Active)</span>
            </div>
            <div className="w-full h-[1px] bg-gray-100 dark:bg-gray-800 my-1"></div>
            <div className="flex items-center gap-2">
                <div className="w-6 h-[2px] bg-slate-300 dark:bg-gray-600"></div>
                <span>Link / Ref</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-6 h-[2px] bg-slate-300 dark:bg-gray-600 border-b border-dashed"></div>
                <span>Dependency</span>
            </div>
        </div>
    </div>
  );
};
