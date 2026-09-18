import React, { useState, useEffect } from 'react';
import { useStore, ExtendedCompMode } from '../store/useStore';
import { ScheduleTournamentModal } from '../components/ScheduleTournamentModal';
import { DGWelcomeBanner } from '../components/DGWelcomeBanner';
import { supabase, cloudDatabaseService, GameRecord } from '../services/supabase';
import { Trophy, Clock, CheckCircle2, Play, Award, Zap, Building2, Globe, Plus, Calendar, Swords, Users } from 'lucide-react';

export const TournamentHub: React.FC = () => {
  const { 
    activeTournament, 
    startTournamentStage, 
    competitionMode, 
    setCompetitionMode, 
    user, 
    questions, 
    setActivePage, 
    setSelectedOpponent,
    dbGames,
    isLoadingGames,
    gamesError
  } = useStore();

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

      {/* LIVE SCHEDULED COMPETITIONS & OPEN CHALLENGES (CROSS-DEVICE CLOUD SYNC) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 font-bold border border-amber-200">
              <Swords className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>Live Scheduled Competitions &amp; Open Challenges</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Nationwide Cloud Sync
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Competitions scheduled across devices (Lagos, Abuja, etc.). Click <strong>Accept Challenge</strong> to join as Guest!
              </p>
            </div>
          </div>

          <button
            onClick={() => setActivePage('schedule')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Tournament</span>
          </button>
        </div>

        {dbGames.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">No scheduled competitions active right now</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Schedule a tournament for your department or federal agency. All logged-in officers across Nigeria will see it on their dashboard and can join your challenge!
            </p>
            <button
              onClick={() => setActivePage('schedule')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule First Tournament</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {dbGames.map(game => {
              const isHost = game.host_id === user?.id;
              return (
                <div key={game.id} className="bright-card p-5 rounded-3xl space-y-4 border-slate-200 hover:border-emerald-500/50 transition-all flex flex-col justify-between shadow-sm bg-white hover:shadow-md">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${
                        game.competition_mode === 'inter_agency' 
                          ? 'bg-purple-50 text-purple-800 border-purple-200' 
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {game.competition_mode === 'inter_agency' ? '🌐 Inter-Agency' : '🏢 Intra-Dept'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {new Date(game.start_datetime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">{game.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {game.description || `Official public service challenge testing PSR mastery.`}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="text-[11px] font-medium">Target Org:</span>
                        <strong className="text-slate-800 font-bold text-[11px] truncate max-w-[170px]">{game.target_org}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="text-[11px] font-medium">Status:</span>
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Open for Opponent
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={async () => {
                        if (user) {
                          await cloudDatabaseService.joinGame(game.id, user.id);
                        }
                        setSelectedOpponent({
                          gameId: game.id,
                          title: game.title,
                          targetOrg: game.target_org,
                          competitionMode: game.competition_mode
                        });
                        setActivePage('remotematch');
                      }}
                      className={`w-full py-3 rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2 ${
                        isHost 
                          ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-500' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500'
                      }`}
                    >
                      <Swords className="w-4 h-4" />
                      <span>{isHost ? '👑 Host Match Room (Waiting for Opponent) →' : '⚔️ Accept Challenge & Join as Guest →'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
