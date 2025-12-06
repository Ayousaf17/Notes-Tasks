
import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';

export type MascotMood = 'idle' | 'happy' | 'thinking' | 'surprised' | 'sleeping' | 'writing';

interface MascotContextType {
  mood: MascotMood;
  setMood: (mood: MascotMood) => void;
  message: string | null;
  setMessage: (msg: string | null) => void;
  say: (msg: string, duration?: number, mood?: MascotMood) => void;
}

const MascotContext = createContext<MascotContextType | null>(null);

export const useMascot = () => {
  const context = useContext(MascotContext);
  if (!context) throw new Error('useMascot must be used within a MascotProvider');
  return context;
};

export const MascotProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mood, setMood] = useState<MascotMood>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const say = (msg: string, duration = 4000, tempMood: MascotMood = 'happy') => {
    setMessage(msg);
    setMood(tempMood);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = window.setTimeout(() => {
      setMessage(null);
      setMood('idle');
    }, duration);
  };

  return (
    <MascotContext.Provider value={{ mood, setMood, message, setMessage, say }}>
      {children}
    </MascotContext.Provider>
  );
};
