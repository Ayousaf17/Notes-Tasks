
import React, { useEffect, useState } from 'react';
import { useMascot } from '../contexts/MascotContext';
import { X, MessageSquare } from 'lucide-react';

interface AasaniMascotProps {
  className?: string;
  fixed?: boolean;
  onClick?: () => void;
}

export const AasaniMascot: React.FC<AasaniMascotProps> = ({ className = '', fixed = false, onClick }) => {
  const { mood, message, setMessage } = useMascot();
  const [isHovered, setIsHovered] = useState(false);
  const [blink, setBlink] = useState(false);

  // Auto-blink logic
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Eye Styles based on mood
  const getEyeShape = () => {
    if (blink) return <path d="M12 22h10" stroke="black" strokeWidth="3" strokeLinecap="round" />;
    
    switch (mood) {
      case 'happy':
        return (
          <>
            <path d="M10 20 Q15 15 20 20" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M28 20 Q33 15 38 20" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case 'thinking':
        return (
          <>
            <circle cx="15" cy="18" r="3" fill="black" />
            <circle cx="35" cy="16" r="4" fill="black" />
          </>
        );
      case 'surprised':
        return (
          <>
            <circle cx="15" cy="18" r="4" fill="black" />
            <circle cx="33" cy="18" r="4" fill="black" />
            <circle cx="24" cy="28" r="3" fill="black" />
          </>
        );
      case 'sleeping':
        return (
           <>
            <path d="M12 20h6" stroke="black" strokeWidth="2" />
            <path d="M30 20h6" stroke="black" strokeWidth="2" />
            <text x="35" y="10" fontSize="10" className="animate-pulse">z</text>
           </>
        );
      default: // Idle
        return (
          <>
            <circle cx="16" cy="18" r="3.5" fill="black" />
            <circle cx="32" cy="18" r="3.5" fill="black" />
          </>
        );
    }
  };

  return (
    <div 
      className={`transition-all duration-500 ease-in-out z-[150] pointer-events-none 
      ${fixed ? 'fixed bottom-[5.5rem] right-4 md:bottom-8 md:right-8' : 'relative'} 
      ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Container wraps interaction events */}
      <div 
        className="relative group pointer-events-auto cursor-pointer transform transition-transform md:hover:scale-110 active:scale-95 origin-bottom-right"
        onClick={onClick}
      >
        
        {/* Speech Bubble - Optimized positioning */}
        {message && (
          <div className="absolute bottom-full right-0 mb-2 w-48 md:w-56 bg-white dark:bg-zinc-800 text-black dark:text-white p-3 rounded-2xl rounded-br-none shadow-xl border border-gray-100 dark:border-gray-700 text-xs font-medium animate-in slide-in-from-bottom-2 fade-in z-20">
            {message}
            <button 
              onClick={(e) => { e.stopPropagation(); setMessage(null); }}
              className="absolute -top-2 -right-2 bg-gray-200 dark:bg-gray-600 rounded-full p-1 hover:bg-red-500 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* The Sticker Container - Scaled down slightly on mobile */}
        <div className={`relative w-14 h-14 md:w-20 md:h-20 transition-transform duration-300 ${mood === 'thinking' ? 'animate-bounce-slow' : 'hover:-translate-y-2'}`}>
            
            {/* White Sticker Border/Stroke Layer */}
            <svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full drop-shadow-lg filter hover:drop-shadow-xl transition-all">
                <defs>
                    <filter id="sticker-border">
                        <feMorphology in="SourceAlpha" result="DILATED" operator="dilate" radius="2.5" />
                        <feFlood floodColor="white" floodOpacity="1" result="WHITE" />
                        <feComposite in="WHITE" in2="DILATED" operator="in" result="OUTLINE" />
                        <feMerge>
                            <feMergeNode in="OUTLINE" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                
                {/* Character Body */}
                <g filter="url(#sticker-border)">
                    {/* Main Shape */}
                    <path 
                        d="M24 4 C10 4, 4 14, 4 26 C4 38, 14 44, 24 44 C34 44, 44 38, 44 26 C44 14, 38 4, 24 4 Z" 
                        fill={mood === 'thinking' ? '#8b5cf6' : mood === 'happy' ? '#10b981' : mood === 'surprised' ? '#f59e0b' : '#000000'}
                        className="transition-colors duration-500"
                    />
                    
                    {/* Inner Face Background */}
                    <path 
                        d="M24 8 C14 8, 8 16, 8 26 C8 36, 16 40, 24 40 C32 40, 40 36, 40 26 C40 16, 36 8, 24 8 Z" 
                        fill="white"
                        className="dark:fill-gray-200"
                    />

                    {/* Face Features */}
                    {getEyeShape()}

                    {/* Mouth - Changes slightly with mood */}
                    {mood === 'happy' && <path d="M18 28 Q24 34 30 28" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" />}
                    {mood === 'surprised' && <circle cx="24" cy="30" r="3" fill="none" stroke="black" strokeWidth="2" />}
                    {mood === 'idle' && <path d="M20 29 Q24 31 28 29" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" opacity="0.5" />}
                </g>
            </svg>
            
            {/* Call to Action Indicator (small badge) */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-600 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center animate-pulse md:hidden">
               <MessageSquare className="w-2.5 h-2.5 text-white" />
            </div>
        </div>
      </div>
    </div>
  );
};
