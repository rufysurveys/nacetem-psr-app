import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../services/supabase';
import { contestRpc, getRoomState, remainingSeconds, RoomState } from '../../services/remoteContest';
import { copyTournamentLink, tournamentLink } from '../../services/roomLinks';
import { Clock, Copy, RefreshCw, Trophy, Users } from 'lucide-react';

export const LegacyRemoteMatchRoom: React.FC = () => {
  const { selectedOpponent, user, setActivePage } = useStore();
  const gameId = selectedOpponent?.gameId as string | undefined;
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ questionId: string; option: number; correct: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(0);
  const [live, setLive] = useState(false);
  const [presenceIds, setPresenceIds] = useState<Set<string>>(new Set());
  const clientId = useRef(crypto.randomUUID());
  const mounted = useRef(false);
  const loading = useRef(false);
  const submitting = useRef(false);
  const clock = useRef({ server: 0, local: 0 });
  const nextBoundary = useRef(0);

  const refresh = useCallback(async () => {
    if (!gameId || loading.current) return;
    loading.current = true;
    const sent = performance.now();
    try {
      const state = await getRoomState(gameId, clientId.current);
      if (!mounted.current) return;
      const received = performance.now();
      clock.current = { server: Date.parse(state.server_now) + (received - sent) / 2, local: received };
      setNow(clock.current.server); setRoom(state); setError('');
      if (state.answer && state.question) setAnswer({ questionId: state.question.id, option: state.answer.selected_option, correct: state.answer.is_correct });
      nextBoundary.current = state.question
        ? Date.parse(state.question.opens_at) + (state.game.question_seconds + state.game.reveal_seconds) * 1000
        : state.game.started_at && state.game.status === 'active' ? Date.parse(state.game.started_at) : 0;
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Cannot reach the match server. Reconnectingâ€¦');
    } finally { loading.current = false; }
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !user) return;
    mounted.current = true;
    void refresh();
    let debounce: ReturnType<typeof setTimeout>;
    const queueRefresh = () => { clearTimeout(debounce); debounce = setTimeout(() => void refresh(), 150); };
    const channel = supabase.channel(`remote-room:${gameId}`, { config: { presence: { key: user.id } } })
      .on('presence', { event: 'sync' }, () => {
        if (!mounted.current) return;
        setPresenceIds(new Set(Object.keys(channel.presenceState()))); queueRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, queueRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` }, queueRefresh)
      .subscribe(status => {
        if (!mounted.current) return;
        setLive(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') { void channel.track({ user_id: user.id }); queueRefresh(); }
      });
    const poll = setInterval(() => void refresh(), 5000);
    const tick = setInterval(() => {
      if (!clock.current.server) return;
      const serverNow = clock.current.server + performance.now() - clock.current.local;
      setNow(serverNow);
      if (nextBoundary.current && serverNow >= nextBoundary.current) { nextBoundary.current = 0; void refresh(); }
    }, 100);
    const resume = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', resume);
    return () => {
      mounted.current = false;
      clearTimeout(debounce); clearInterval(poll); clearInterval(tick);
      window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', resume);
      void supabase.removeChannel(channel);
      void contestRpc('leave_remote_room', { p_game_id: gameId, p_client_id: clientId.current }).catch(() => {});
    };
  }, [gameId, user?.id, refresh]);

  const start = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try { await contestRpc('start_remote_game', { p_game_id: gameId }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to start match'); }
    finally { submitting.current = false; setBusy(false); }
  };
  const select = async (option: number) => {
    const q = room?.question;
    if (!q || submitting.current || answer?.questionId === q.id || now >= Date.parse(q.closes_at)) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const result = await contestRpc<{ is_correct: boolean }>('submit_player_answer', {
        p_game_id: gameId, p_question_id: q.id, p_selected_option: option, p_response_time_ms: 0,
      });
      if (mounted.current) { setAnswer({ questionId: q.id, option, correct: result.is_correct }); await refresh(); }
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Answer could not be saved. Retry before the deadline.'); }
    finally { submitting.current = false; if (mounted.current) setBusy(false); }
  };
  const copyLink = async () => {
    try {
      await copyTournamentLink(gameId!); setCopied(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Select and copy the room link below.'); }
  };
  const leave = () => {
    const url = new URL(window.location.href); url.searchParams.delete('match'); window.history.replaceState({}, '', url);
    setActivePage('schedule');
  };

  if (!gameId) return <div className="p-8 text-center"><p>Select a tournament to enter its lobby.</p><button onClick={leave}>View tournaments</button></div>;
  const q = room?.question;
  const savedAnswer = q && answer?.questionId === q.id ? answer : null;
  const finished = room?.game.status === 'completed';
  const cancelled = room?.game.status === 'cancelled';
  const active = room?.game.status === 'active';
  const countdown = active && room.game.started_at ? remainingSeconds(room.game.started_at, now) : 0;
  const seconds = q ? remainingSeconds(q.closes_at, now) : 0;
  const connected = room?.players.filter(p => live && presenceIds.size > 0 ? presenceIds.has(p.user_id) : p.connected) ?? [];
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header className="bg-emerald-900 text-white rounded-3xl p-6 space-y-3">
        <div className="flex flex-wrap justify-between gap-3"><span className="text-emerald-200 text-sm font-bold">REMOTE DEPARTMENT CONTEST</span><button onClick={leave} className="underline text-sm">Leave room</button></div>
        <h1 className="text-2xl font-extrabold">{room?.game.title || selectedOpponent?.title || 'Match lobby'}</h1>
        <div className="flex flex-wrap gap-4 text-sm"><span>{live ? 'Live connection' : 'Refreshing connection every 5 seconds'}</span><button onClick={copyLink} className="flex items-center gap-2"><Copy size={16}/>{copied ? 'Link copied' : 'Copy room link'}</button></div>
        <label className="block text-xs text-emerald-100">Tournament room link
          <input aria-label="Tournament room link" readOnly value={tournamentLink(gameId)} onFocus={e => e.target.select()} className="mt-1 block w-full rounded-lg bg-white/10 p-2 text-white border border-white/20" />
        </label>
      </header>
      {error && <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl">{error}<button onClick={() => void refresh()} className="ml-3 underline">Retry connection</button></div>}
      {!room ? <div className="p-10 text-center"><RefreshCw className="animate-spin mx-auto mb-2"/>Connecting to the shared lobbyâ€¦</div> : (
        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white border rounded-3xl p-6 space-y-5">
            {finished ? <><Trophy className="text-amber-500" size={40}/><h2 className="text-2xl font-bold">Match completed</h2><p>Final scores and accuracy are saved. Rankings include every registered participant; unanswered questions score zero.</p></> : cancelled ? <h2 className="text-xl font-bold">This tournament was cancelled.</h2> : !active ? <>
              <h2 className="text-xl font-bold">Waiting in the lobby</h2>
              <p>Everyone receives the same questions and the same {room.game.question_seconds}-second answer window. Correct answers earn 100 points plus up to 375 points for speed.</p>
              <p className="text-sm text-slate-600">Scheduled start: {new Date(room.game.start_datetime).toLocaleString()}. The host can start as soon as one other participant is connected, even before this time.</p>
              {room.game.host_id === user?.id ? <button onClick={start} disabled={busy || connected.length < 2} className="bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50">{busy ? 'Startingâ€¦' : 'Start contest for everyone'}</button> : <p className="font-bold text-emerald-700">Waiting for the host to start.</p>}
              <p className="text-sm text-slate-500">The host counts as participant 1. One connected guest makes 2; only the host can start. Share the room link with your department.</p>
            </> : countdown > 0 ? <div className="text-center py-12"><h2 className="text-xl font-bold">Everyone starts in</h2><p className="text-6xl font-black text-emerald-700 mt-4">{countdown}</p></div> : q ? <>
              <div className="flex justify-between font-bold"><span>Question {q.question_order + 1} of {room.question_count}</span><span className="flex items-center gap-2"><Clock size={18}/>{seconds}s</span></div>
              <h2 className="text-xl font-bold">{q.question_text}</h2>
              <div className="space-y-3">{q.options.map((option, i) => <button key={i} onClick={() => void select(i)} disabled={busy || !!savedAnswer || seconds === 0} className={`w-full text-left border-2 p-4 rounded-xl disabled:cursor-default ${savedAnswer?.option === i ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-emerald-400'}`}>{option}</button>)}</div>
              <p role="status" className="font-semibold text-emerald-800">{busy ? 'Saving answerâ€¦' : savedAnswer ? savedAnswer.correct ? 'Correct â€” answer saved.' : 'Answer saved â€” incorrect.' : seconds === 0 ? 'Time is up. Unanswered questions score zero.' : 'Choose one answer before time runs out.'}</p>
              {(savedAnswer || seconds === 0) && <p className="text-sm text-slate-500">The next question opens automatically for everyone.</p>}
            </> : <p>Synchronizing the next questionâ€¦</p>}
          </section>
          <aside className="bg-white border rounded-3xl p-5 space-y-4">
            <h2 className="font-bold flex gap-2 items-center"><Users size={20}/>Connected Room Participants ({connected.length})</h2>
            <p className="text-xs text-slate-500">{room.players.length} registered / {room.game.max_players} capacity. {live ? 'Presence updates live.' : 'Disconnected participants expire within 25 seconds.'}</p>
            {connected.length === 0 && <p className="text-sm text-slate-500">Connecting participantsâ€¦</p>}
            <ul className="space-y-3 max-h-[32rem] overflow-y-auto">{room.players.map(p => <li key={p.user_id} className="border-b pb-3 text-sm">
              <div className="flex justify-between gap-3"><strong>{finished && p.rank ? `#${p.rank} ` : ''}{p.full_name}{p.user_id === room.game.host_id ? ' (Host)' : ''}{p.user_id === user?.id ? ' (You)' : ''}</strong><strong>{p.current_score}</strong></div>
              <div className="flex justify-between gap-2 text-xs text-slate-500 mt-1"><span>{p.department}</span><span>{(live ? presenceIds.has(p.user_id) : p.connected) ? 'Connected' : 'Offline'}</span></div>
              {finished && <p className="text-xs mt-1">Accuracy: {p.total_accuracy ?? 0}%</p>}
            </li>)}</ul>
          </aside>
        </div>
      )}
    </div>
  );
};

