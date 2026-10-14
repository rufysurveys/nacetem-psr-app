import React, { useState } from 'react';
import dgPhoto from '../assets/dg_photo.webp';
import { Trophy, ChevronDown } from 'lucide-react';

export const DGWelcomeBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 rounded-2xl text-white shadow-lg relative overflow-hidden border border-emerald-600/30">
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Compact announcement bar */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="dg-message"
          className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 text-left hover:bg-white/5 transition-colors"
        >
          <img
            src={dgPhoto}
            alt="Director-General / CEO, NACETEM"
            className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl object-cover object-top ring-2 ring-amber-400/80 bg-emerald-950"
          />
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-wider text-amber-300">DG / CEO Message</span>
            <span className="block font-extrabold text-sm sm:text-base text-white truncate">🎮 Welcome to the NACETEM PSR Challenge!</span>
            <span className="hidden md:block text-xs text-emerald-200 truncate">Learn the Public Service Rules. Play the Challenge. Master the Rules.</span>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-emerald-100 bg-white/10 px-3 py-1.5 rounded-xl">
            <span className="hidden sm:inline">{isExpanded ? 'Hide message' : 'Read message'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </span>
        </button>

        <div id="dg-message" className="px-4 sm:px-5">
          {isExpanded && (
            <div className="space-y-4 py-4 text-xs sm:text-sm text-emerald-100 leading-relaxed border-t border-emerald-700/50 animate-fadeIn">
              <p className="text-[11px] font-semibold text-emerald-300">Dr. Olushola Odusanya · Director-General / CEO, NACETEM</p>
              <p className="text-slate-100 font-medium">
                Welcome to the <strong>NACETEM Public Service Rules (PSR) Gamification App</strong> — an interactive platform designed to make learning the Public Service Rules engaging, competitive and rewarding.
              </p>

              <div className="bg-emerald-950/70 border border-emerald-500/30 p-3.5 rounded-2xl text-amber-200 font-bold text-xs sm:text-sm">
                ✨ Forget memorising pages of rules. Learn by playing.
              </div>

              <p>
                Challenge yourself with PSR questions, earn points, climb the leaderboard and compete with colleagues while strengthening your knowledge of the rules that guide Nigeria’s Public Service.
              </p>

              {/* Your Mission Grid */}
              <div className="pt-2">
                <h3 className="font-extrabold text-amber-300 text-sm flex items-center gap-1.5 mb-3 uppercase tracking-wider">
                  <Trophy className="w-4 h-4 text-amber-400" /> Your Mission: Answer. Earn. Compete. Master.
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs text-emerald-100 font-semibold">
                  <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <span className="text-base">🧠</span> <span>Learn something new</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <span className="text-base">🎯</span> <span>Test your knowledge</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <span className="text-base">⭐</span> <span>Earn points & rewards</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <span className="text-base">🏆</span> <span>Climb the leaderboard</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <span className="text-base">🤝</span> <span>Compete with colleagues</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <span className="text-base">📚</span> <span>Master the Public Service Rules</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 font-black text-amber-300 text-sm flex items-center gap-2">
                🚀 Ready to Play?
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
