import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { TerminalSquare } from 'lucide-react';

interface TerminalProps {
  logs: LogEntry[];
}

export default function Terminal({ logs }: TerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INFO': return 'text-blue-400';
      case 'WARN': return 'text-amber-400';
      case 'SYS': return 'text-slate-400';
      case 'PHYS': return 'text-emerald-400';
      default: return 'text-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1116] rounded-none overflow-hidden font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#161b22] border-b border-slate-800 flex-shrink-0">
        <TerminalSquare size={12} className="text-slate-400" />
        <span className="font-bold text-slate-300 tracking-wider">TERMINAL</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {logs.length === 0 && (
          <div className="text-slate-600 italic">Waiting for simulation stream...</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
            <span className={`font-bold shrink-0 w-10 ${getTypeColor(log.type)}`}>{log.type}</span>
            <span className="text-slate-300 break-words">: {log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0e1116; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #30363d; 
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}