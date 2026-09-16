import React from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';

interface HostProps {
  message: string;
  hostName?: string;
}

export const HostDialogue: React.FC<HostProps> = ({ message, hostName = 'Host Director-General' }) => {
  return (
    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 border border-emerald-300 p-4 rounded-2xl flex items-start gap-3.5 shadow-sm animate-fadeIn">
      
      {/* Host Avatar Badge */}
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shrink-0 font-extrabold text-lg shadow-md">
        🎙️
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">{hostName}</span>
          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
            <Sparkles className="w-3 h-3" /> GAME SHOW LIVE
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed italic">
          "{message}"
        </p>
      </div>

    </div>
  );
};
