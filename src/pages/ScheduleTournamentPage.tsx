import React, { useState, useEffect } from 'react';
import { useStore, ScheduledTournamentItem } from '../store/useStore';
import { cloudSyncService } from '../services/cloudSync';
import { Calendar, Clock, Trophy, Users, CheckCircle2, Plus, Globe, Building2, Sparkles, Award, Swords, RefreshCw } from 'lucide-react';

export const ScheduleTournamentPage: React.FC = () => {
  const { user, scheduledTournaments, addScheduledTournament, subscribeToTournament, setScheduledTournaments, setActivePage } = useStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Real-time Cloud Sync across devices
  const syncTournaments = async () => {
    setIsSyncing(true);
    const remoteList = await cloudSyncService.fetchCloudTournaments();
    if (remoteList && remoteList.length > 0) {
      // Merge remote tournaments with local state
      const currentList = useStore.getState().scheduledTournaments;
      const mergedMap = new Map<string, ScheduledTournamentItem>();
      
      // Add existing preset/local items
      currentList.forEach(item => mergedMap.set(item.id, item));
      // Merge cloud items (overwrite or add new)
      remoteList.forEach(item => {
        const existing = mergedMap.get(item.id);
        if (existing) {
          mergedMap.set(item.id, {
            ...item,
            isSubscribed: existing.isSubscribed || item.isSubscribed,
            registeredCount: Math.max(existing.registeredCount, item.registeredCount)
          });
        } else {
          mergedMap.set(item.id, item);
        }
      });

      const sortedMerged = Array.from(mergedMap.values());
      setScheduledTournaments(sortedMerged);
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    // Initial fetch
    syncTournaments();

    // Auto-poll every 2.5 seconds for instant real-time 2-device sync
    const intervalId = setInterval(syncTournaments, 2500);

    return () => {
      clearInterval(intervalId);
    };
  }, [setScheduledTournaments]);

  const [title, setTitle] = useState('2026 NACETEM Inter-Departmental Championship');
  const [competitionMode, setCompMode] = useState<'intra_dept' | 'inter_agency'>('intra_dept');
  const [targetOrg, setTargetOrg] = useState('National Centre for Technology Management (NACETEM)');
  const [startDateTime, setStartDateTime] = useState('2026-09-22T10:00');
  const [cutoffDateTime, setCutoffDateTime] = useState('2026-09-21T23:59');
  const [badgeTitle, setBadgeTitle] = useState('🏆 2026 NACETEM Inter-Dept Champion Trophy');
  const [description, setDescription] = useState('Official 3-stage competition testing Public Service Rules mastery across departments.');

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: ScheduledTournamentItem = {
      id: `sched-${Date.now()}`,
      title,
      competitionMode,
      targetOrg: competitionMode === 'inter_agency' ? 'National Inter-Agency' : targetOrg,
      startDateTime,
      cutoffDateTime,
      winnerBadgeTitle: badgeTitle,
      registeredCount: 1,
      isSubscribed: true,
      createdBy: user?.name ? `${user.name} (${user.mdaName || 'NACETEM'})` : 'Administrator',
      description
    };
    addScheduledTournament(newItem);
    setIsModalOpen(false);
    
    // Publish immediately to global cloud
    await cloudSyncService.publishScheduledTournament(newItem);
    await syncTournaments();
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-emerald-800 via-emerald-900 to-teal-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>TOURNAMENT SCHEDULING & SUBSCRIPTION HUB</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Live Global Sync Active</span>
            </div>
            <button
              onClick={syncTournaments}
              title="Force Refresh Remote Schedules"
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-emerald-300 transition-all flex items-center justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>


          <h1 className="text-3xl sm:text-4xl font-extrabold">Scheduled Tournaments</h1>
          <p className="text-xs text-emerald-100 mt-1 max-w-2xl">
            Schedule future Inter-Agency & Inter-Departmental competitions with date & time filters, or subscribe to upcoming events to reserve your competitive seat.
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
                <p className="text-xs text-slate-500 mt-0.5">Set the exact date, time, and rules for officers to subscribe.</p>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Competition Scope</label>
                  <select
                    value={competitionMode}
                    onChange={(e) => setCompMode(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="intra_dept">Intra-Agency (Inter-Dept)</option>
                    <option value="inter_agency">Inter-Agency (National)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Organization</label>
                  <input
                    type="text"
                    disabled={competitionMode === 'inter_agency'}
                    value={competitionMode === 'inter_agency' ? 'National All Agencies' : targetOrg}
                    onChange={(e) => setTargetOrg(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* DATE AND TIME PICKER FEATURES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200">
                <div>
                  <label className="block font-extrabold text-emerald-900 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Tournament Start Date & Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-emerald-900 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Registration Cutoff Date & Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={cutoffDateTime}
                    onChange={(e) => setCutoffDateTime(e.target.value)}
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Winner Badge / Trophy Title</label>
                <input
                  type="text"
                  required
                  value={badgeTitle}
                  onChange={(e) => setBadgeTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description & Guidelines</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl shadow-md transition-all"
                >
                  Publish Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULED TOURNAMENTS LIST */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span>Upcoming Scheduled Competitions ({scheduledTournaments.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Subscribe now to reserve your entry pass</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scheduledTournaments.map((tourn) => {
            const formattedStart = new Date(tourn.startDateTime).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={tourn.id} 
                className={`bright-card p-6 rounded-3xl space-y-4 flex flex-col justify-between border-slate-200 ${
                  tourn.isSubscribed ? 'ring-2 ring-emerald-500 bg-emerald-50/30' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-lg ${
                      tourn.competitionMode === 'inter_agency'
                        ? 'bg-teal-100 text-teal-800 border border-teal-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {tourn.competitionMode === 'inter_agency' ? '🌐 Inter-Agency League' : '🏢 Intra-Org Challenge'}
                    </span>

                    <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Scheduled
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">{tourn.title}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Target: {tourn.targetOrg}</p>
                  </div>

                  {/* SCHEDULED DATE & TIME BANNER */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Scheduled Start Date & Time:</span>
                      <span className="font-extrabold text-emerald-800 font-mono">{formattedStart}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Organizer:</span>
                      <span className="font-bold text-slate-700">{tourn.createdBy}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {tourn.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100/70 p-2.5 rounded-xl">
                    <Award className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Reward: <strong>{tourn.winnerBadgeTitle}</strong></span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>{tourn.registeredCount.toLocaleString()} Subscribed</span>
                  </div>

                  {tourn.isSubscribed ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-emerald-600 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>Subscribed & Reserved</span>
                      </span>
                      <button
                        onClick={() => setActivePage('remotematch')}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all shadow flex items-center gap-1"
                      >
                        <Swords className="w-3.5 h-3.5 text-amber-300" />
                        <span>Play 2-Player Remote Duel</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => subscribeToTournament(tourn.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Subscribe / Apply to Join</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
