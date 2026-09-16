import React from 'react';
import { HelpCircle, BookOpen, Clock, CheckCircle2 } from 'lucide-react';

interface LifelineProps {
  used5050: boolean;
  usedPeek: boolean;
  usedExtraTime: boolean;
  onUse5050: () => void;
  onUsePeek: () => void;
  onUseExtraTime: () => void;
  disabled?: boolean;
}

export const Lifelines: React.FC<LifelineProps> = ({
  used5050,
  usedPeek,
  usedExtraTime,
  onUse5050,
  onUsePeek,
  onUseExtraTime,
  disabled = false
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">
      <span className="text-xs font-bold text-slate-500 px-2 uppercase tracking-wider">Game Lifelines:</span>

      {/* 50:50 */}
      <button
        disabled={used5050 || disabled}
        onClick={onUse5050}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
          used5050 
            ? 'bg-slate-100 text-slate-400 border border-slate-200 line-through' 
            : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 shadow-sm'
        }`}
      >
        <span>💡 50:50</span>
      </button>

      {/* Rulebook Peek */}
      <button
        disabled={usedPeek || disabled}
        onClick={onUsePeek}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
          usedPeek 
            ? 'bg-slate-100 text-slate-400 border border-slate-200 line-through' 
            : 'bg-teal-50 text-teal-700 border border-teal-300 hover:bg-teal-100 shadow-sm'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>Rulebook Peek</span>
      </button>

      {/* Extra Time */}
      <button
        disabled={usedExtraTime || disabled}
        onClick={onUseExtraTime}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
          usedExtraTime 
            ? 'bg-slate-100 text-slate-400 border border-slate-200 line-through' 
            : 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 shadow-sm'
        }`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>+15s Time Freeze</span>
      </button>
    </div>
  );
};
