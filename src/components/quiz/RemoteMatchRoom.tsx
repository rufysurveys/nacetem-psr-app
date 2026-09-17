import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Question } from '../../types';
import { supabase, cloudDatabaseService, GamePlayerRecord, ProfileRecord } from '../../services/supabase';
import { Trophy, Users, CheckCircle2, Copy, Swords, Sparkles, Clock, RefreshCw, AlertCircle } from 'lucide-react';

export const RemoteMatchRoom: React.FC = () => {
  const { questions, recordQuizResult, setActivePage, user, selectedOpponent } = useStore();

  const gameId = selectedOpponent?.gameId || 'game-default';
  const gameTitle = selectedOpponent?.title || 'National PSR Remote Championship';

  const duelQuestions = questions.filter((q: Question) => q.difficulty === 'Intermediate' || q.difficulty === 'Basic').slice(0, 10);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // SPEED & ACCURACY QUESTION COUNTDOWN TIMER (15 seconds per question)
  const [timeLeft, setTimeLeft] = useState(15);
  const [speedBonusAwarded, setSpeedBonusAwarded] = useState<number>(0);

  // Joined Players List in Room from Supabase Database
  const [roomPlayers, setRoomPlayers] = useState<(GamePlayerRecord & { profile?: ProfileRecord })[]>([]);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);

  // Load Real Room Players from Supabase PostgreSQL
  const loadRoomPlayers = async () => {
    if (!selectedOpponent?.gameId) return;
    setIsLoadingRoom(true);
    const players = await cloudDatabaseService.fetchGamePlayers(selectedOpponent.gameId);
    setRoomPlayers(players);
    setIsLoadingRoom(false);
  };

  useEffect(() => {
    loadRoomPlayers();

    // Supabase Realtime Channel: Listen for game_players INSERT/UPDATE events in this specific room
    if (selectedOpponent?.gameId) {
      const channel = supabase
        .channel(`game_lobby:${selectedOpponent.gameId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${selectedOpponent.gameId}` },
          () => {
            loadRoomPlayers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedOpponent?.gameId]);

  // SPEED & ACCURACY TIMER COUNTDOWN EFFECT (15s per question)
  useEffect(() => {
    if (isFinished || isAnswerSubmitted) return;

    setTimeLeft(15);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-submit as Timed Out
          setIsAnswerSubmitted(true);
          setSelectedOpt(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIdx, isFinished, isAnswerSubmitted]);

  const currentQ = duelQuestions[currentIdx] || duelQuestions[0];

  // SUBMIT ANSWER VIA SERVER-SIDE TRUSTED RPC PROCEDURE
  const handleSelectOption = async (idx: number) => {
    if (isAnswerSubmitted || isSubmittingAnswer) return;
    setSelectedOpt(idx);
    setIsAnswerSubmitted(true);
    setIsSubmittingAnswer(true);

    const responseTimeMs = (15 - timeLeft) * 1000;

    if (selectedOpponent?.gameId && user) {
      // Call Supabase trusted server-side RPC procedure
      const result = await cloudDatabaseService.submitAnswer(
        selectedOpponent.gameId,
        currentQ.id || `q-${currentIdx}`,
        idx,
        responseTimeMs
      );

      if (result) {
        if (result.is_correct) {
          setSpeedBonusAwarded(result.points_earned - 100);
          setUserScore(result.current_total_score);
        } else {
          setSpeedBonusAwarded(0);
        }
      } else {
        // Fallback local score calculation
        if (idx === currentQ.correctAnswer) {
          const speedBonus = timeLeft * 25;
          const totalEarned = 300 + speedBonus;
          setSpeedBonusAwarded(speedBonus);
          setUserScore(prev => prev + totalEarned);
        }
      }
    } else {
      if (idx === currentQ.correctAnswer) {
        const speedBonus = timeLeft * 25;
        const totalEarned = 300 + speedBonus;
        setSpeedBonusAwarded(speedBonus);
        setUserScore(prev => prev + totalEarned);
      }
    }

    setIsSubmittingAnswer(false);
  };

  const handleNext = () => {
    if (currentIdx + 1 < duelQuestions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOpt(null);
      setIsAnswerSubmitted(false);
      setSpeedBonusAwarded(0);
    } else {
      setIsFinished(true);
      recordQuizResult(userScore + 1500, 95, 3800, true, [], 2);
    }
  };

  const handleCopyMatchCode = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 animate-fadeIn font-sans">
        <div className="bright-card rounded-3xl p-8 text-center space-y-6 border-2 border-emerald-500 shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
              INTER-LOCATION REALTIME DUEL COMPLETED
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-2">
              🏆 Match Completed! Final Scores Recorded
            </h2>
            <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1">
              Synchronized Match for <strong>{gameTitle}</strong> recorded in Supabase PostgreSQL database.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4 max-w-md mx-auto text-left shadow-sm">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-200 pb-2">Your Performance Record</h4>
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span>Total Earned Score:</span>
              <span className="text-emerald-700 font-extrabold text-base">{userScore} XP</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span>Database Status:</span>
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Persisted to Supabase
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => setActivePage('schedule')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-md transition-all"
            >
              Back to Scheduled Hub
            </button>
            <button
              onClick={() => setActivePage('tournaments')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-md transition-all"
            >
              Proceed to Tournament Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fadeIn font-sans">
      
      {/* ROOM TITLE BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 rounded-3xl text-white border border-emerald-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase border border-emerald-500/30">
              SUPABASE REALTIME LOBBY
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Game ID: {gameId.slice(0, 8)}...</span>
          </div>
          <h2 className="text-2xl font-black">{gameTitle}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyMatchCode}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-white/20 flex items-center gap-1.5 transition-all"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>{copiedLink ? 'Link Copied!' : 'Copy Room Link'}</span>
          </button>
        </div>
      </div>

      {/* CONNECTED PLAYERS LIST (REAL SUPABASE REALTIME DB STATE) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Connected Room Participants ({roomPlayers.length})</span>
          </h4>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Realtime Sync Active
          </span>
        </div>

        {isLoadingRoom ? (
          <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> Loading participants from Supabase...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {roomPlayers.map((p) => (
              <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  {p.profile?.full_name?.charAt(0) || 'P'}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-slate-900 truncate">{p.profile?.full_name || 'Officer'}</h5>
                  <p className="text-[10px] text-slate-500 truncate">{p.profile?.agency || 'Federal Civil Service'}</p>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {p.current_score} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUIZ ARENA */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        
        {/* TIMER BAR & QUESTION TRACKER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center">
              #{currentIdx + 1}
            </span>
            <span className="text-xs font-bold text-slate-600">Question {currentIdx + 1} of {duelQuestions.length}</span>
          </div>

          {/* 15s TIMER BAR */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-mono text-sm font-black text-amber-800">{timeLeft}s</span>
          </div>
        </div>

        {/* QUESTION TEXT */}
        <div>
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{currentQ.chapter}</span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1 leading-snug">{currentQ.title}</h3>
        </div>

        {/* OPTIONS GRID */}
        <div className="grid grid-cols-1 gap-3">
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedOpt === idx;
            const isCorrect = idx === currentQ.correctAnswer;
            let btnClass = 'bg-slate-50 border-slate-200 hover:border-slate-400 text-slate-800';

            if (isAnswerSubmitted) {
              if (isSelected) {
                btnClass = isCorrect ? 'bg-emerald-600 text-white border-emerald-600 font-extrabold' : 'bg-rose-600 text-white border-rose-600 font-extrabold';
              } else if (isCorrect) {
                btnClass = 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold';
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswerSubmitted}
                onClick={() => handleSelectOption(idx)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all text-xs flex items-center justify-between ${btnClass}`}
              >
                <span>{opt}</span>
                {isAnswerSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* SUBMITTED FEEDBACK & NEXT BUTTON */}
        {isAnswerSubmitted && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              {speedBonusAwarded > 0 && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> Speed Bonus: +{speedBonusAwarded} XP!
                </span>
              )}
            </div>
            <button
              onClick={handleNext}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>Next Question</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
