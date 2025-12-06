
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Loader2, X, Command, Activity, Zap } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { Project, Task, ViewMode } from '../types';

interface VoiceCommandOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onExecute: (type: string, data: any) => void;
}

export const VoiceCommandOverlay: React.FC<VoiceCommandOverlayProps> = ({ isOpen, onClose, projects, onExecute }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
        startListening();
    } else {
        stopListening();
        setTranscript('');
        setFeedback('');
        setIsProcessing(false);
    }
  }, [isOpen]);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
        setFeedback("Browser does not support Speech API.");
        return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onstart = () => setIsListening(true);
    
    recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            interimTranscript += event.results[i][0].transcript;
        }
        setTranscript(interimTranscript);
    };

    recognitionRef.current.onend = () => {
        setIsListening(false);
        if (transcript.trim().length > 0) {
            handleProcess(transcript);
        }
    };

    recognitionRef.current.start();
  };

  const stopListening = () => {
      if (recognitionRef.current) {
          recognitionRef.current.stop();
      }
  };

  const handleProcess = async (text: string) => {
      setIsProcessing(true);
      const result = await geminiService.parseVoiceCommand(text, projects);
      setIsProcessing(false);
      
      if (result.type !== 'unknown') {
          setFeedback(result.feedback);
          setTimeout(() => {
              onExecute(result.type, result.data);
              onClose();
          }, 1500);
      } else {
          setFeedback("Sorry, I didn't catch that intent.");
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
        <button onClick={onClose} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
            <X className="w-8 h-8" />
        </button>

        <div className="flex flex-col items-center justify-center w-full max-w-2xl text-center px-4">
            
            {/* Visualizer Orb */}
            <div className={`relative mb-12 transition-all duration-500 ${isProcessing ? 'scale-75 opacity-50' : 'scale-100'}`}>
                <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isListening ? 'bg-purple-600 shadow-[0_0_60px_rgba(147,51,234,0.6)] animate-pulse' : 'bg-gray-800'}`}>
                    {isProcessing ? (
                        <Loader2 className="w-12 h-12 text-white animate-spin" />
                    ) : (
                        <Mic className={`w-12 h-12 ${isListening ? 'text-white' : 'text-gray-400'}`} />
                    )}
                </div>
                {/* Ring Effects */}
                {isListening && (
                    <>
                        <div className="absolute inset-0 rounded-full border-2 border-purple-500/50 animate-ping" />
                        <div className="absolute -inset-4 rounded-full border border-purple-500/30 animate-[spin_3s_linear_infinite]" />
                    </>
                )}
            </div>

            {/* Transcript Area */}
            <div className="min-h-[100px] flex flex-col items-center justify-center space-y-4">
                {isListening ? (
                    <h2 className="text-3xl font-light text-white leading-relaxed">
                        {transcript || "Listening..."}
                    </h2>
                ) : isProcessing ? (
                    <h2 className="text-3xl font-light text-purple-300 animate-pulse">
                        Processing thought...
                    </h2>
                ) : feedback ? (
                    <div className="flex items-center gap-3 text-green-400">
                        <CheckCircle className="w-6 h-6" />
                        <h2 className="text-2xl font-medium">{feedback}</h2>
                    </div>
                ) : (
                    <h2 className="text-2xl text-gray-500">Tap to speak...</h2>
                )}
            </div>

            {/* Quick Hints */}
            {!transcript && !isProcessing && (
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                    <div className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" /> "Create high priority task..."
                    </div>
                    <div className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center gap-2">
                        <Command className="w-4 h-4 text-blue-500" /> "Go to Pipeline..."
                    </div>
                    <div className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-500" /> "Note: Call Sarah..."
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

// Icon helper
import { CheckCircle } from 'lucide-react';
