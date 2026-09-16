import React, { useState } from 'react';
import { useStore, ExtendedCompMode } from '../store/useStore';
import { ScheduleTournamentModal } from '../components/ScheduleTournamentModal';
import { DGWelcomeBanner } from '../components/DGWelcomeBanner';
import { Trophy, Clock, CheckCircle2, Play, Award, Zap, Building2, Globe, Plus } from 'lucide-react';

export const TournamentHub: React.FC = () => {
  const { activeTournament, startTournamentStage, competitionMode, setCompetitionMode, user, questions, setActivePage } = useStore();

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  if (!activeTournament) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* DG OFFICIAL EXECUTIVE WELCOME BANNER */}
      <DGWelcomeBanner />

      {/* Schedule Tournament Modal */}
      <ScheduleTournamentModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />

      {/* Header Bar with 2 Clean Competition Mode Switchers */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
            {competitionMode === 'inter_agency' ? <Globe className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              {competitionMode === 'intra_dept' ? `NACETEM Intra-Agency Championship` : 'National Inter-Agency League'}
            </h2>
            <p className="text-xs text-slate-500">
              {competitionMode === 'intra_dept' 
                ? `Compete between departments or challenge colleagues inside ${user?.mdaName}`
                : 'Nationwide championship ranking all agencies'
              }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* 2 Clean Competition Mode Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setCompetitionMode('intra_dept')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
                competitionMode === 'intra_dept'
                  ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Intra-Agency (Inter-Dept & Peer)</span>
            </button>

            <button
              onClick={() => setCompetitionMode('inter_agency')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
                competitionMode === 'inter_agency'
                  ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Inter-Agency</span>
            </button>
          </div>

          {/* Schedule New Competition Button */}
          <button
            onClick={() => setActivePage('schedule')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Competition</span>
          </button>
        </div>
      </div>

      {/* Main Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-emerald-200 text-xs font-extrabold">
              <Trophy className="w-3.5 h-3.5" />
              <span>
                {competitionMode === 'intra_dept' ? `${user?.mdaName} Inter-Departmental Clash` : 'National Inter-Agency Championship'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {activeTournament.title}
            </h1>
            <p className="text-sm text-emerald-100 max-w-2xl flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Reward: <strong>{activeTournament.winnerBadgeTitle}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 border border-white/20 p-4 rounded-2xl backdrop-blur-md">
            <div className="text-center px-2">
              <span className="block text-2xl font-black text-white">{questions.length}</span>
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Official Questions</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center px-2">
              <span className="block text-2xl font-black text-amber-300">Stage 1</span>
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Current Phase</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 STAGES GRID */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-600" />
            <span>Tournament Stages</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Clear stages to earn the Winner Badge</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Stage 1 */}
          <div className="bright-card bright-card-hover rounded-3xl p-6 flex flex-col justify-between border-emerald-500/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                  STAGE 1 • QUALIFIER
                </span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Available Now
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">The Qualifier</h3>
                <p className="text-xs font-semibold text-emerald-700">Spin Wheel & Timed Quiz</p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  20 questions from your official Excel question bank covering appointments, leave, discipline, and promotion rules.
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Format:</span>
                  <span className="font-bold text-slate-800">20 Qs (Spin Wheel Category)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pass Mark:</span>
                  <span className="font-bold text-emerald-700">70% Required</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => startTournamentStage(activeTournament.id, 1)}
              className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Stage 1 Qualifier</span>
            </button>
          </div>

          {/* Stage 2 */}
          <div className="bright-card bright-card-hover rounded-3xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 font-extrabold text-xs">
                  STAGE 2 • KNOCKOUT
                </span>
                <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Live Multiplayer
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">The Knockout</h3>
                <p className="text-xs font-semibold text-amber-700">Concurrent Competitive Lobby</p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {competitionMode === 'intra_dept'
                    ? `Compete between internal departments and peer colleagues inside ${user?.mdaName} (${user?.department} vs others).`
                    : 'Compete against participants from other agencies nationwide in a live elimination lobby.'
                  }
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Format:</span>
                  <span className="font-bold text-slate-800">15 Live Questions</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Advancement:</span>
                  <span className="font-bold text-amber-700">Top 30% Rank Advance</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => startTournamentStage(activeTournament.id, 2)}
              className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Enter Stage 2 Knockout Lobby</span>
            </button>
          </div>

          {/* Stage 3 */}
          <div className="bright-card bright-card-hover rounded-3xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 font-extrabold text-xs">
                  STAGE 3 • GRAND FINALE
                </span>
                <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                  <Award className="w-4 h-4" /> SJT Case Studies
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">The Grand Finale</h3>
                <p className="text-xs font-semibold text-blue-700">Situational Judgment Case Studies</p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  High-stakes administrative dilemmas, procurement ethics, and conflict of interest scenarios. Winner earns the Badge!
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Format:</span>
                  <span className="font-bold text-slate-800">10 SJT Case Studies</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reward:</span>
                  <span className="font-bold text-blue-700">{activeTournament.winnerBadgeTitle}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => startTournamentStage(activeTournament.id, 3)}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Stage 3 SJT Engine</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
