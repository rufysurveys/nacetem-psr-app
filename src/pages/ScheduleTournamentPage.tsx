import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { supabase, cloudDatabaseService, GameRecord } from '../services/supabase';
import { Calendar, Clock, Trophy, Users, CheckCircle2, Plus, Building2, Sparkles, RefreshCw } from 'lucide-react';

const LOCAL_GAMES_KEY = 'nacetem_psr_scheduled_games_v5';

export const DEFAULT_GAMES: GameRecord[] = [
  {
    id: 'sched-01',
    host_id: '00000000-0000-4000-8000-000000000001',
    title: '2026 National Inter-Agency Championship',
    competition_mode: 'inter_agency',
    target_org: 'National All Agencies',
    start_datetime: '2026-09-25T09:00:00.000Z',
    cutoff_datetime: '2026-09-24T23:59:00.000Z',
    max_players: 50,
    status: 'scheduled',
    description: 'Nationwide public service tournament ranking all federal ministries and agencies.',
    created_at: new Date().toISOString()
  },
  {
    id: 'sched-02',
    host_id: '00000000-0000-4000-8000-000000000002',
    title: 'NACETEM Inter-Departmental Challenge Cup',
    competition_mode: 'intra_dept',
    target_org: 'National Centre for Technology Management (NACETEM)',
    start_datetime: '2026-09-20T10:00:00.000Z',
    cutoff_datetime: '2026-09-19T23:59:00.000Z',
    max_players: 50,
    status: 'scheduled',
    description: 'Departmental challenge inside NACETEM testing PPL, Research, Technology Transfer, and Finance officers.',
    created_at: new Date().toISOString()
  }
];

export const ScheduleTournamentPage: React.FC = () => {
  const { user, setActivePage, setSelectedOpponent } = useStore();

  const getSavedLocalGames = (): GameRecord[] => {
    try {
      const raw = localStorage.getItem(LOCAL_GAMES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_GAMES;
  };

  const saveLocalGames = (items: GameRecord[]) => {
    try {
      localStorage.setItem(LOCAL_GAMES_KEY, JSON.stringify(items));
    } catch (e) {}
  };

  const [games, setGames] = useState<GameRecord[]>(getSavedLocalGames());
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch games from Supabase cloud database & merge with local cache
  const loadGames = async () => {
    setIsLoading(true);
    const remoteGames = await cloudDatabaseService.fetchAvailableGames();
    const localSaved = getSavedLocalGames();

    const mergedMap = new Map<string, GameRecord>();
    // Add remote cloud games first
    remoteGames.forEach(g => mergedMap.set(g.id, g));
    // Add local fallback games only if not present in remote
    localSaved.forEach(g => {
      if (!mergedMap.has(g.id)) {
        mergedMap.set(g.id, g);
      }
    });

    const mergedList = Array.from(mergedMap.values());
    const finalGames = mergedList.length > 0 ? mergedList : DEFAULT_GAMES;

    setGames(finalGames);
    saveLocalGames(finalGames);
    setIsLoading(false);
  };

  useEffect(() => {
    loadGames();

    // Auto-poll remote games every 4s for instant cross-device updates
    const pollInterval = setInterval(() => {
      cloudDatabaseService.fetchAvailableGames().then(remoteGames => {
        if (remoteGames.length > 0) {
          setGames(prev => {
            const map = new Map<string, GameRecord>();
            remoteGames.forEach(g => map.set(g.id, g));
            prev.forEach(g => {
              if (!map.has(g.id)) map.set(g.id, g);
            });
            return Array.from(map.values());
          });
        }
      });
    }, 4000);

    // Supabase Realtime Channel: Listen for games INSERT/UPDATE across devices
    const gamesChannel = supabase
      .channel('public:games')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        () => {
          loadGames();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(gamesChannel);
    };
  }, []);

  const [title, setTitle] = useState('2026 PSR Inter-Agency Championship');
  const [competitionMode, setCompMode] = useState<'intra_dept' | 'inter_agency'>('intra_dept');
  const [targetOrg, setTargetOrg] = useState('National Centre for Technology Management (NACETEM)');
  const [startDateTime, setStartDateTime] = useState('2026-09-22T10:00');
  const [cutoffDateTime, setCutoffDateTime] = useState('2026-09-21T23:59');
  const [description, setDescription] = useState('Official competition testing Public Service Rules mastery across federal agencies.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let newGame: GameRecord | null = null;
    try {
      newGame = await cloudDatabaseService.createGame({
        host_id: user?.id || 'usr-default',
        title,
        competition_mode: competitionMode,
        target_org: competitionMode === 'inter_agency' ? 'National Inter-Agency' : targetOrg,
        start_datetime: new Date(startDateTime).toISOString(),
        cutoff_datetime: new Date(cutoffDateTime).toISOString(),
        max_players: 50,
        status: 'scheduled',
        description
      });

      if (newGame) {
        await cloudDatabaseService.joinGame(newGame.id, user?.id || 'usr-default');
      }
    } catch (e) {
      console.warn('Schedule game notice:', e);
    }

    if (!newGame) {
      newGame = {
        id: `game-${Date.now()}`,
        host_id: user?.id || 'usr-default',
        title,
        competition_mode: competitionMode,
        target_org: competitionMode === 'inter_agency' ? 'National Inter-Agency' : targetOrg,
        start_datetime: new Date(startDateTime).toISOString(),
        cutoff_datetime: new Date(cutoffDateTime).toISOString(),
        max_players: 50,
        status: 'scheduled',
        description,
        created_at: new Date().toISOString()
      };
    }

    // PREPEND IMMEDIATELY TO STATE & LOCAL STORAGE
    const createdGame = newGame;
    setGames(prev => {
      const filtered = prev.filter(g => g.id !== createdGame.id);
      const updated = [createdGame, ...filtered];
      saveLocalGames(updated);
      return updated;
    });

    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const handleJoinGame = async (game: GameRecord) => {
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
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-emerald-800 via-emerald-900 to-teal-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>TOURNAMENT SCHEDULING HUB</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Live Cloud Sync Active</span>
            </div>
            <button
              onClick={loadGames}
              title="Refresh Remote Schedules"
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-emerald-300 transition-all flex items-center justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold">Scheduled Competitions</h1>
          <p className="text-xs text-emerald-100 mt-1 max-w-2xl">
            Schedule future Inter-Agency &amp; Inter-Departmental competitions. Created games synchronize across devices for all officers.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Schedule New Tournament</span>
        </button>
      </div>

      {/* SCHEDULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <span>Schedule Competition Event</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Set the date, time, and rules for officers to participate.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tournament Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Competition Mode</label>
                  <select
                    value={competitionMode}
                    onChange={(e) => setCompMode(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-600"
                  >
                    <option value="intra_dept">Inter-Departmental Challenge</option>
                    <option value="inter_agency">Inter-Agency Championship</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Organization</label>
                  <input
                    type="text"
                    required
                    value={targetOrg}
                    onChange={(e) => setTargetOrg(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Registration Cutoff</label>
                  <input
                    type="datetime-local"
                    required
                    value={cutoffDateTime}
                    onChange={(e) => setCutoffDateTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tournament Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-emerald-600"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Save &amp; Publish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GAMES GRID */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Syncing scheduled competitions...</span>
        </div>
      ) : games.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Scheduled Tournaments Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Schedule New Tournament" above to create the first competition.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {games.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {g.competition_mode === 'inter_agency' ? 'National Inter-Agency' : 'Inter-Departmental'}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Max {g.max_players} Players</span>
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-slate-900">{g.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{g.description || 'Public Service Rules Competition'}</p>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-700 font-medium">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Start Date:
                    </span>
                    <strong className="text-slate-900">{new Date(g.start_datetime).toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 font-medium">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Target Org:
                    </span>
                    <strong className="text-slate-900 truncate max-w-[200px]">{g.target_org}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Status: {g.status.toUpperCase()}
                </span>
                <button
                  onClick={() => handleJoinGame(g)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Join Match / Enter Lobby</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
