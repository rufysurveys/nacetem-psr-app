import React, { useState } from 'react';
import dgPhoto from '../assets/dg_photo.webp';
import { Sparkles, Trophy, Target, Award, Users, BookOpen, Rocket, ChevronDown, ChevronUp } from 'lucide-react';

export const DGWelcomeBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-emerald-600/30">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        
        {/* DG Portrait Frame */}
        <div className="shrink-0 flex flex-col items-center space-y-2 self-center md:self-start">
          <div className="relative group">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden ring-4 ring-amber-400/80 shadow-2xl bg-emerald-950">
              <img 
                src={dgPhoto} 
                alt="Director-General / CEO, NACETEM" 
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300" 
              />
            </div>
            <div className="absolute -bottom-2 inset-x-0 flex justify-center">
              <span className="bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full shadow-lg border border-amber-300">
                DG / CEO Message
              </span>
            </div>
          </div>
          <div className="text-center pt-2">
            <h4 className="font-extrabold text-sm text-white">Dr. Olushola Odusanya</h4>
            <p className="text-[11px] text-emerald-200 font-medium">Director-General / CEO, NACETEM</p>
          </div>
        </div>

        {/* DG Welcome Content */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>OFFICIAL EXECUTIVE WELCOME</span>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-emerald-200 hover:text-white flex items-center gap-1 font-bold bg-white/10 px-3 py-1 rounded-xl transition-all"
            >
              <span>{isExpanded ? 'Collapse Message' : 'Read Full Message'}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              🎮 Welcome to the NACETEM PSR Challenge!
            </h2>
            <p className="text-emerald-300 font-extrabold text-sm sm:text-base mt-1">
              Learn the Public Service Rules. Play the Challenge. Master the Rules.
            </p>
          </div>

          {isExpanded && (
            <div className="space-y-4 pt-2 text-xs sm:text-sm text-emerald-100 leading-relaxed border-t border-emerald-700/50 animate-fadeIn">
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
