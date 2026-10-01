import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { supabase, cloudDatabaseService, GameRecord } from '../services/supabase';
import { rememberTournamentLink } from '../services/roomLinks';
import { DGWelcomeBanner } from '../components/DGWelcomeBanner';
import { Calendar, Clock, Trophy, Users, CheckCircle2, Plus, Building2, Sparkles, RefreshCw, AlertCircle, X } from 'lucide-react';

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
  const [groupCompetition, setGroupCompetition] = useState(false);
  const [groupCategorySet, setGroupCategorySet] = useState('PSR Core');
  const [groupLabelsText, setGroupLabelsText] = useState('North, South');
  const invitationAttempted = useRef(false);
  const localDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  useEffect(() => {
    fetchCloudGames();
  }, [fetchCloudGames]);

  const [title, setTitle] = useState('2026 PSR Inter-Agency Championship');
  const [competitionMode, setCompMode] = useState<'intra_dept' | 'inter_agency'>('intra_dept');
  const [targetOrg, setTargetOrg] = useState('National Centre for Technology Management (NACETEM)');
  const [startDateTime, setStartDateTime] = useState(() => localDate(new Date(Date.now() + 3600000)));
  const [description, setDescription] = useState('Official competition testing Public Service Rules mastery across federal agencies.');
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <DGWelcomeBanner />
      
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
              <span>{gamesError ? 'Cloud connection needs attention' : isLoadingGames ? 'Syncing tournaments...' : 'Shared tournament directory'}</span>
            </div>
            <button
              onClick={fetchCloudGames}
              title="Refresh Remote Schedules"
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-emerald-300 transition-all flex items-center justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGames ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold">Scheduled Competitions</h1>
          <p className="text-xs text-emerald-100 mt-1 max-w-2xl">
            Schedule future Inter-Agency &amp; Inter-Departmental competitions. Created games synchronize across devices for all officers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 self-start md:self-auto">
          <button
            onClick={() => { setIsProctored(false); setScheduleError(null); setIsModalOpen(true); }}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-5 py-3 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Schedule Tournament</span>
          </button>
          <button onClick={() => { setIsProctored(true); setScheduleError(null); setIsModalOpen(true); }} className="bg-white text-emerald-950 font-extrabold px-4 py-3 rounded-xl text-xs shadow-lg">Proctored</button>
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
                      onChange={(e) => setCompMode(e.target.value as 'intra_dept' | 'inter_agency')}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                    >
                      <option value="intra_dept">Inter-Departmental</option>
                      <option value="inter_agency">Inter-Agency</option>
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

      {/* GAMES GRID */}
      {isLoadingGames && dbGames.length === 0 ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Syncing scheduled competitions...</span>
        </div>
      ) : dbGames.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Scheduled Tournaments Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Schedule New Tournament" above to create the first competition.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dbGames.map((g) => {
            const isAdminNoHost = g.host_id === null;
            const isHost = !isAdminNoHost && user?.id === g.host_id;

            return (
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

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-slate-900">{g.title}</h3>
                    {isAdminNoHost ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
                        🌐 Admin Scheduled (No Host)
                      </span>
                    ) : isHost ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        👑 Host
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                        ⚔️ Open Challenge
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-emerald-700">{g.is_proctored ? 'Proctored tournament · Camera and screen required' : 'Standard tournament · No proctoring'}</p>
                  <p className="text-xs font-semibold text-slate-600">Audience: {g.audience_type === 'agency' ? g.audience_value : g.audience_type === 'department' ? `${g.audience_value}, ${g.audience_agency}` : g.audience_type === 'person' ? 'Invited person' : 'Everyone'}</p>
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
                    disabled={joiningId !== null}
                    className={`font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all ${
                      isHost
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {joiningId === g.id ? 'Joining...' : g.status === 'completed' ? 'View match results' : isHost ? 'Enter host lobby' : 'Join match / Enter lobby'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
