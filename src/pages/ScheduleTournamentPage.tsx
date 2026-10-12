import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore, ExtendedCompMode } from '../store/useStore';
import { supabase, cloudDatabaseService, GameRecord } from '../services/supabase';
import { rememberTournamentLink } from '../services/roomLinks';
import { DGWelcomeBanner } from '../components/DGWelcomeBanner';
import { Calendar, Clock, Users, Plus, Building2, RefreshCw, AlertCircle, X, Search, LayoutGrid, List, ShieldCheck, ShieldOff, ArrowRight, BarChart3, Crown, Globe } from 'lucide-react';

type StatusFilter = 'all' | 'upcoming' | 'live' | 'completed';
type TypeFilter = 'all' | 'proctored' | 'standard';
type ViewMode = 'grid' | 'list';

const statusGroup = (status: GameRecord['status']): Exclude<StatusFilter, 'all'> =>
  status === 'active' ? 'live' : status === 'completed' || status === 'cancelled' ? 'completed' : 'upcoming';

const modeLabel = (mode: string) =>
  mode === 'inter_team' ? 'Inter-Team' : mode === 'inter_agency' ? 'Inter-Agency' : 'Inter-Departmental';

const audienceLabel = (g: GameRecord) =>
  g.audience_type === 'agency' ? g.audience_value
    : g.audience_type === 'department' ? `${g.audience_value}, ${g.audience_agency}`
    : g.audience_type === 'person' ? 'Invited person'
    : 'Everyone';

const formatStart = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const VIEW_KEY = 'psr_schedule_view';

const StatusBadge: React.FC<{ status: GameRecord['status'] }> = ({ status }) => {
  const group = statusGroup(status);
  if (group === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-200">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-rose-500 opacity-75 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-rose-500" />
        </span>
        Live now
      </span>
    );
  }
  if (group === 'completed') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
        {status === 'cancelled' ? 'Cancelled' : 'Completed'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
      {status === 'full' ? 'Full' : status === 'open' ? 'Open' : 'Scheduled'}
    </span>
  );
};

export const ScheduleTournamentPage: React.FC = () => {
  const { user, setActivePage, setSelectedOpponent, dbGames, isLoadingGames, gamesError, fetchCloudGames } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProctored, setIsProctored] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(200);
  const [audienceType, setAudienceType] = useState<'all' | 'agency' | 'department' | 'person'>('all');
  const [audienceValue, setAudienceValue] = useState(user?.mdaName || '');
  const [audienceAgency, setAudienceAgency] = useState(user?.mdaName || '');
  const [audienceDepartment, setAudienceDepartment] = useState(user?.department || '');
  const [groupCompetition, setGroupCompetition] = useState(true);
  const [groupCategorySet, setGroupCategorySet] = useState('PSR Innovation Teams');
  const [groupLabelsText, setGroupLabelsText] = useState('Innovators, Inventors, Diffusers');
  const invitationAttempted = useRef(false);

  // Toolbar state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'; } catch (e) { return 'grid'; }
  });
  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, viewMode); } catch (e) {}
  }, [viewMode]);
  const localDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  useEffect(() => {
    fetchCloudGames();
  }, [fetchCloudGames]);

  const [title, setTitle] = useState('2026 PSR Inter-Team Innovation Championship');
  const [competitionMode, setCompMode] = useState<ExtendedCompMode>('inter_team');
  const [targetOrg, setTargetOrg] = useState('NACETEM Innovation Teams');
  const [startDateTime, setStartDateTime] = useState(() => localDate(new Date(Date.now() + 3600000)));
  const [description, setDescription] = useState('Official Inter-Team competition automatically grouping participants into Innovators, Inventors, and Diffusers.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setScheduleError(null);

    try {
      const hostUserId = user?.id;
      if (!hostUserId) {
        throw new Error('You must be signed in to schedule a tournament.');
      }

      const createdGame = await cloudDatabaseService.createGame({
        host_id: hostUserId,
        is_proctored: isProctored,
        title,
        competition_mode: competitionMode,
        target_org: competitionMode === 'inter_agency' ? 'National Inter-Agency' : targetOrg,
        start_datetime: new Date(startDateTime).toISOString(),
        cutoff_datetime: new Date(startDateTime).toISOString(),
        max_players: maxPlayers,
        status: 'scheduled',
        description,
        audience_type: audienceType,
        audience_value: audienceType === 'department' ? audienceDepartment : audienceValue,
        audience_agency: audienceType === 'department' ? audienceAgency : null,
        group_competition: groupCompetition,
        group_category_set: groupCompetition ? groupCategorySet : null,
        group_labels: groupCompetition ? groupLabelsText.split(',').map(label => label.trim()).filter(Boolean) : []
      });

      // Re-query database to show new game across store
      await fetchCloudGames();
      setIsModalOpen(false);
      rememberTournamentLink(createdGame.id);
      setSelectedOpponent({ gameId: createdGame.id, title: createdGame.title });
      setActivePage('remotematch');
    } catch (err: any) {
      console.error('Schedule creation failed:', err);
      setScheduleError(err.message || 'Failed to publish tournament to central database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinGame = async (game: Pick<GameRecord, 'id'> & Partial<GameRecord>) => {
    if (joiningId || !user) return;
    setJoiningId(game.id); setJoinError('');
    try {
      await cloudDatabaseService.joinGame(game.id, user.id);
      rememberTournamentLink(game.id);
      setSelectedOpponent({ gameId: game.id, title: game.title });
      setActivePage('remotematch');
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Unable to join this match. Please retry.');
    } finally { setJoiningId(null); }
  };

  useEffect(() => {
    const match = new URLSearchParams(window.location.search).get('match');
    if (match && user && !invitationAttempted.current) {
      invitationAttempted.current = true;
      void handleJoinGame({ id: match });
    }
  }, [user?.id]);

  const statusCounts = useMemo(() => {
    const counts = { all: dbGames.length, upcoming: 0, live: 0, completed: 0 };
    dbGames.forEach(g => { counts[statusGroup(g.status)] += 1; });
    return counts;
  }, [dbGames]);

  const visibleGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dbGames.filter(g => {
      if (statusFilter !== 'all' && statusGroup(g.status) !== statusFilter) return false;
      if (typeFilter === 'proctored' && !g.is_proctored) return false;
      if (typeFilter === 'standard' && g.is_proctored) return false;
      if (!q) return true;
      return [g.title, g.target_org, g.audience_value, g.audience_agency]
        .some(field => (field || '').toLowerCase().includes(q));
    });
  }, [dbGames, searchQuery, statusFilter, typeFilter]);

  const openScheduleForm = () => {
    setIsProctored(false);
    setScheduleError(null);
    setIsModalOpen(true);
  };

  const ctaFor = (g: GameRecord) => {
    const isHost = g.host_id !== null && user?.id === g.host_id;
    const completed = statusGroup(g.status) === 'completed';
    const label = joiningId === g.id
      ? 'Joining...'
      : completed ? 'View Match Results' : isHost ? 'Enter Host Lobby' : 'Join Match / Enter Lobby';
    return { isHost, completed, label };
  };

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'live', label: 'Live' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 animate-fadeIn">
      <DGWelcomeBanner />
      
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Scheduled Competitions</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Inter-Agency &amp; Inter-Departmental competitions, shared across every officer's device.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className={`w-2 h-2 rounded-full ${gamesError ? 'bg-rose-500' : isLoadingGames ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          <span>{gamesError ? 'Connection needs attention' : isLoadingGames ? 'Syncing tournaments...' : 'Synced'}</span>
          <button
            onClick={fetchCloudGames}
            title="Refresh schedules"
            aria-label="Refresh schedules"
            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGames ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tournaments by name or agency..."
              aria-label="Search tournaments"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              aria-label="Tournament type"
              className="flex-1 lg:flex-initial bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="all">All types</option>
              <option value="proctored">Proctored</option>
              <option value="standard">Standard</option>
            </select>
            <button
              onClick={openScheduleForm}
              className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-md shadow-emerald-600/20 hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Schedule Tournament
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div role="tablist" aria-label="Tournament status" className="flex flex-wrap gap-1">
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={statusFilter === tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  statusFilter === tab.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.id === 'live' && statusCounts.live > 0 && <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'live' ? 'bg-white' : 'bg-rose-500'}`} />}
                {tab.label}
                <span className={`text-[10px] px-1.5 rounded-md ${statusFilter === tab.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{statusCounts[tab.id]}</span>
              </button>
            ))}
          </div>

          <div role="radiogroup" aria-label="Layout" className="flex shrink-0 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button role="radio" aria-checked={viewMode === 'grid'} aria-label="Card grid" title="Card grid" onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button role="radio" aria-checked={viewMode === 'list'} aria-label="Table list" title="Table list" onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {joinError && <div role="alert" className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800">{joinError}</div>}
      {/* SCHEDULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div role="dialog" aria-modal="true" aria-labelledby="schedule-title" className="bg-white rounded-2xl max-w-sm w-full max-h-[min(76dvh,600px)] shadow-2xl border border-slate-200 animate-fadeIn flex flex-col overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-100 px-5 py-4 shrink-0">
              <div>
                <h3 id="schedule-title" className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{isProctored ? 'Schedule Proctored Tournament' : 'Schedule New Tournament'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Choose the match settings.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close schedule form"
                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="min-h-0 flex-1 flex flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-3 text-xs">
                {scheduleError && (
                  <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2 break-words">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{scheduleError}</span>
                  </div>
                )}
                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer">
                  <span>
                    <span className="block font-bold text-slate-800">Proctored match</span>
                    <span className="block text-[11px] text-slate-500">Camera and screen monitoring for participants</span>
                  </span>
                  <input type="checkbox" checked={isProctored} onChange={e => setIsProctored(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                </label>
                <p className="bg-emerald-50 rounded-xl p-3">{isProctored ? 'Proctored five-round match. Participants consent to camera and full-screen sharing, fullscreen checks, face monitoring, and reviewable flags.' : 'Five timed rounds with a shared rules wheel, lifelines, scenario decisions, and a virtual jackpot. No camera or screen monitoring.'}</p>
                <div className="grid grid-cols-[1fr_2fr] gap-3">
                  <label className="block font-bold text-slate-700">Players
                    <input type="number" required min={2} max={1000} value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} className="mt-1 w-full bg-slate-50 border rounded-lg px-3 py-2 font-medium" />
                  </label>
                  <label className="block font-bold text-slate-700">Tournament title
                    <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full bg-slate-50 border rounded-lg px-3 py-2 font-medium" />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block font-bold text-slate-700">Competition mode
                    <select
                      value={competitionMode}
                      onChange={(e) => {
                        const nextMode = e.target.value as ExtendedCompMode;
                        setCompMode(nextMode);
                        if (nextMode === 'inter_team') {
                          setGroupCompetition(true);
                          setGroupCategorySet('PSR Innovation Teams');
                          setGroupLabelsText('Innovators, Inventors, Diffusers');
                        }
                      }}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                    >
                      <option value="inter_team">🚀 Inter-Team (Innovators, Inventors, Diffusers)</option>
                      <option value="intra_dept">🏢 Inter-Departmental</option>
                      <option value="inter_agency">🌐 Inter-Agency</option>
                    </select>
                  </label>
                  <label className="block font-bold text-slate-700">Target organization
                    <input
                      type="text"
                      required
                      value={targetOrg}
                      onChange={(e) => setTargetOrg(e.target.value)}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                    />
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Start date &amp; time
                  <input
                    type="datetime-local"
                    required
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                  />
                  </label>
                </div>

                <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 font-bold text-slate-700">Who can see and join this tournament?</legend>
                <select
                  value={audienceType}
                  onChange={e => {
                    const nextAudience = e.target.value as typeof audienceType;
                    setAudienceType(nextAudience);
                    if (nextAudience === 'person') setAudienceValue(user?.email || '');
                    if (nextAudience === 'agency') setAudienceValue(user?.mdaName || '');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="all">Everyone</option>
                  <option value="agency">One organization</option>
                  <option value="department">One department</option>
                  <option value="person">One person</option>
                </select>
                {audienceType === 'agency' && <input required readOnly={user?.role !== 'admin'} aria-label="Organization allowed to join" placeholder="Organization name" value={audienceValue} onChange={e => setAudienceValue(e.target.value)} className="w-full border rounded-xl px-3 py-2 read-only:bg-slate-100" />}
                {audienceType === 'department' && <div className="grid gap-3 sm:grid-cols-2"><input required readOnly={user?.role !== 'admin'} aria-label="Organization allowed to join" placeholder="Organization name" value={audienceAgency} onChange={e => setAudienceAgency(e.target.value)} className="w-full border rounded-xl px-3 py-2 read-only:bg-slate-100" /><input required readOnly={user?.role !== 'admin'} aria-label="Department allowed to join" placeholder="Department name" value={audienceDepartment} onChange={e => setAudienceDepartment(e.target.value)} className="w-full border rounded-xl px-3 py-2 read-only:bg-slate-100" /></div>}
                {audienceType === 'person' && <input required readOnly={user?.role !== 'admin'} type="email" aria-label="Person allowed to join" placeholder="Registered user's email" value={audienceValue} onChange={e => setAudienceValue(e.target.value)} className="w-full border rounded-xl px-3 py-2 read-only:bg-slate-100" />}
                <p className="text-[11px] text-slate-500">{user?.role === 'admin' ? 'Administrator scheduling can target any organization, department, or registered person.' : 'You can schedule for everyone or limit participation to your own organization, department, or account.'}</p>
                </fieldset>

                <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 font-bold text-slate-700">Competition format</legend>
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={groupCompetition} onChange={e => setGroupCompetition(e.target.checked)} />
                  Enable balanced group competition
                </label>
                {groupCompetition && <>
                  <label className="block">Category set
                    <input required value={groupCategorySet} onChange={e => setGroupCategorySet(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" placeholder="e.g. PSR Core" />
                  </label>
                  <label className="block">Group names, comma separated
                    <input required value={groupLabelsText} onChange={e => setGroupLabelsText(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" placeholder="North, South" />
                  </label>
                  <p className="text-[11px] text-slate-500">Participants are assigned to the smallest group as they join. Use 2 to 8 unique names.</p>
                </>}
                </fieldset>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tournament description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 shrink-0 bg-white">
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

      {/* ERROR BANNER IF DATABASE ERROR */}
      {gamesError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-extrabold text-sm">Central Database Connection Error</p>
            <p className="text-xs text-rose-700 mt-0.5">{gamesError}</p>
          </div>
        </div>
      )}

      {/* GAMES */}
      {isLoadingGames && dbGames.length === 0 ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Syncing scheduled competitions...</span>
        </div>
      ) : dbGames.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Scheduled Tournaments Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">Create the first competition for your colleagues.</p>
          <button onClick={openScheduleForm} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md">
            <Plus className="w-4 h-4 stroke-[3]" /> Schedule Tournament
          </button>
        </div>
      ) : visibleGames.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm">
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800">No tournaments match these filters</h3>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); setTypeFilter('all'); }}
            className="mt-3 text-sm font-bold text-emerald-700 hover:text-emerald-900"
          >
            Clear filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleGames.map((g) => {
            const { isHost, completed, label } = ctaFor(g);
            const isAdminNoHost = g.host_id === null;
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={g.status} />
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                    {isHost ? <><Crown className="w-3.5 h-3.5 text-amber-500" /> You're hosting</>
                      : isAdminNoHost ? <><Globe className="w-3.5 h-3.5 text-blue-500" /> Admin scheduled</>
                      : modeLabel(g.competition_mode)}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-snug">{g.title}</h3>
                  {(isHost || isAdminNoHost) && <p className="text-xs font-semibold text-emerald-700 mt-0.5">{modeLabel(g.competition_mode)}</p>}
                  {g.description && <p className="text-xs text-slate-500 leading-relaxed mt-1.5 line-clamp-2">{g.description}</p>}
                </div>

                <dl className="grid grid-cols-2 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100 text-xs">
                  <div className="bg-slate-50 p-3">
                    <dt className="flex items-center gap-1 text-slate-500 font-semibold"><Clock className="w-3.5 h-3.5 text-amber-500" /> Start</dt>
                    <dd className="mt-1 font-bold text-slate-900">{formatStart(g.start_datetime)}</dd>
                  </div>
                  <div className="bg-slate-50 p-3 min-w-0">
                    <dt className="flex items-center gap-1 text-slate-500 font-semibold"><Building2 className="w-3.5 h-3.5 text-emerald-600" /> Target Org</dt>
                    <dd className="mt-1 font-bold text-slate-900 truncate" title={g.target_org}>{g.target_org}</dd>
                  </div>
                  <div className="bg-slate-50 p-3">
                    <dt className="flex items-center gap-1 text-slate-500 font-semibold"><Users className="w-3.5 h-3.5 text-emerald-600" /> Max Players</dt>
                    <dd className="mt-1 font-bold text-slate-900">{g.max_players}</dd>
                  </div>
                  <div className="bg-slate-50 p-3">
                    <dt className="flex items-center gap-1 text-slate-500 font-semibold">
                      {g.is_proctored ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <ShieldOff className="w-3.5 h-3.5 text-slate-400" />} Proctoring
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">{g.is_proctored ? 'Camera & screen' : 'None'}</dd>
                  </div>
                </dl>

                <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-slate-500 truncate" title={`Audience: ${audienceLabel(g)}`}>
                    Audience: <strong className="text-slate-700">{audienceLabel(g)}</strong>
                  </span>
                  <button
                    onClick={() => handleJoinGame(g)}
                    disabled={joiningId !== null}
                    className={`shrink-0 inline-flex items-center gap-1.5 font-bold px-4 py-2.5 rounded-xl text-xs transition-all disabled:opacity-60 ${
                      completed
                        ? 'border border-slate-300 text-slate-700 bg-white hover:border-emerald-500 hover:text-emerald-800'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 hover:-translate-y-0.5'
                    }`}
                  >
                    {completed ? <BarChart3 className="w-4 h-4" /> : isHost ? <Crown className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    {label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Tournament</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Start</th>
                  <th className="px-4 py-3">Target Org</th>
                  <th className="px-4 py-3 text-right">Players</th>
                  <th className="px-4 py-3">Proctoring</th>
                  <th className="px-4 py-3"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleGames.map((g) => {
                  const { isHost, completed } = ctaFor(g);
                  return (
                    <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 min-w-[14rem]">
                        <span className="block font-bold text-slate-900">{g.title}</span>
                        <span className="text-xs text-slate-500">{modeLabel(g.competition_mode)}{isHost ? ' · You\'re hosting' : ''}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">{formatStart(g.start_datetime)}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 max-w-[12rem] truncate" title={g.target_org}>{g.target_org}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 text-right">{g.max_players}</td>
                      <td className="px-4 py-3 text-xs">
                        {g.is_proctored
                          ? <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><ShieldCheck className="w-3.5 h-3.5" /> Proctored</span>
                          : <span className="text-slate-500">Standard</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleJoinGame(g)}
                          disabled={joiningId !== null}
                          className={`inline-flex items-center gap-1 font-bold px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all disabled:opacity-60 ${
                            completed
                              ? 'border border-slate-300 text-slate-700 bg-white hover:border-emerald-500 hover:text-emerald-800'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {completed ? 'View Results' : isHost ? 'Host Lobby' : 'Join'}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
