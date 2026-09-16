import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Question } from '../../types';
import { Trophy, Users, ShieldCheck, CheckCircle2, Play, Zap, Globe, MapPin, Copy, Check, ArrowRight, Swords } from 'lucide-react';

export const RemoteMatchRoom: React.FC = () => {
  const { questions, recordQuizResult, setActivePage, user } = useStore();

  const duelQuestions = questions.filter((q: Question) => q.difficulty === 'Intermediate' || q.difficulty === 'Basic').slice(0, 10);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Simulated Remote Player Status
  const [remotePlayer, setRemotePlayer] = useState({
    name: 'Dr. Samuel Ojo',
    title: 'Deputy Director (GL 16)',
    mdaName: 'NACETEM (Lagos Office)',
    location: 'Lagos Branch, Nigeria',
    score: 0,
    status: 'Connected',
    answersCount: 0,
    isAnswering: false
  });

  const currentQ = duelQuestions[currentIdx] || duelQuestions[0];

  // Simulate Remote Player Answering Questions dynamically
  useEffect(() => {
    if (isFinished) return;

    const timer = setTimeout(() => {
      const isCorrect = Math.random() > 0.25;
      const pts = isCorrect ? 350 : 0;
      setRemotePlayer(prev => ({
        ...prev,
        score: prev.score + pts,
        answersCount: Math.min(currentIdx + 1, duelQuestions.length),
        isAnswering: true
      }));
    }, 3000 + Math.random() * 2000);

    return () => clearTimeout(timer);
  }, [currentIdx, isFinished]);

  const handleSelect = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOpt(idx);
    setIsAnswerSubmitted(true);

    if (idx === currentQ.correctAnswer) {
      setUserScore(prev => prev + 400);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < duelQuestions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOpt(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsFinished(true);
      recordQuizResult(userScore + 1500, 92, 4800, true, [], 2);
    }
  };

  const handleCopyMatchCode = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isFinished) {
    const isUserWinner = userScore >= remotePlayer.score;

    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 animate-fadeIn">
        <div className="bright-card rounded-3xl p-8 text-center space-y-6 border-2 border-emerald-500 shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
              INTER-LOCATION DUEL RESULT
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-2">
              {isUserWinner ? '🏆 Victory! You Won the Remote Duel!' : '🤝 Great Match! Remote Match Complete'}
            </h2>
            <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1">
              Synchronized 2-Player Scheduled Match between <strong>NACETEM HQ (Abuja)</strong> &amp; <strong>NACETEM Branch (Lagos)</strong>.
            </p>
          </div>

          {/* HEAD TO HEAD COMPARISON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
            <div className={`p-5 rounded-2xl border ${isUserWinner ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-extrabold text-emerald-800 uppercase">You (Player 1)</span>
                {isUserWinner && <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded">WINNER</span>}
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">{user?.name}</h4>
              <p className="text-xs text-slate-500">{user?.department} • NACETEM HQ</p>
              <div className="mt-3 text-2xl font-black text-emerald-700">{userScore} XP</div>
            </div>

            <div className={`p-5 rounded-2xl border ${!isUserWinner ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-extrabold text-slate-700 uppercase">Remote Player 2</span>
                {!isUserWinner && <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded">WINNER</span>}
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">{remotePlayer.name}</h4>
              <p className="text-xs text-slate-500">{remotePlayer.mdaName}</p>
              <div className="mt-3 text-2xl font-black text-slate-800">{remotePlayer.score} XP</div>
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
              Proceed to Stage 2 Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      
      {/* REMOTE MATCH ROOM HEADER */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-emerald-200 text-xs font-extrabold">
            <Globe className="w-3.5 h-3.5" />
            <span>REMOTE 2-PLAYER MATCH ROOM • SYNCHRONIZED MATCHMAKING</span>
          </div>
          <h2 className="text-2xl font-extrabold">Scheduled Head-to-Head Matchroom</h2>
          <p className="text-xs text-emerald-100">Live 2-Player battle between remote offices &amp; agencies across Nigeria.</p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 border border-white/20 p-2.5 rounded-2xl">
          <span className="text-xs font-mono font-bold text-amber-300">MATCH-CODE: NACETEM-DUEL-8942</span>
          <button
            onClick={handleCopyMatchCode}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
            title="Copy Match Invite Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2-PLAYER REMOTE CONNECTIONS DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Player 1 (You) */}
        <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-2xl space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-emerald-600 text-white">
              PLAYER 1 (HOST / YOU)
            </span>
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              🟢 Connected (Abuja HQ)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <img src={user?.avatar} alt={user?.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-600" />
            <div>
              <h4 className="font-black text-slate-900 text-sm">{user?.name}</h4>
              <p className="text-xs text-slate-500">{user?.cadre} • {user?.department}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-emerald-200 text-xs font-bold text-emerald-900">
            <span>Score: <strong className="text-base text-emerald-700">{userScore} XP</strong></span>
            <span>Question {currentIdx + 1} of {duelQuestions.length}</span>
          </div>
        </div>

        {/* Player 2 (Remote Opponent) */}
        <div className="bg-slate-50 border-2 border-slate-300 p-4 rounded-2xl space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-slate-900 text-white">
              PLAYER 2 (REMOTE OPPONENT)
            </span>
            <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              🟢 Connected ({remotePlayer.location})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-700 text-white font-extrabold flex items-center justify-center text-sm shadow">
              SO
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-sm">{remotePlayer.name}</h4>
              <p className="text-xs text-slate-500">{remotePlayer.title} • {remotePlayer.mdaName}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-bold text-slate-800">
            <span>Score: <strong className="text-base text-slate-900">{remotePlayer.score} XP</strong></span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> Remote Live Progress: {remotePlayer.answersCount}/{duelQuestions.length}
            </span>
          </div>
        </div>
      </div>

      {/* QUIZ QUESTION CARD */}
      <div className="bright-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">{currentQ.chapter}</span>
          <span className="text-xs font-bold text-slate-500">PSR Rule {currentQ.psrCitation.ruleNumber}</span>
        </div>

        <h3 className="text-xl font-bold text-slate-900 leading-snug">{currentQ.title}</h3>

        <div className="space-y-3">
          {currentQ.options.map((opt: string, idx: number) => {
            const isSelected = selectedOpt === idx;
            const isCorrect = idx === currentQ.correctAnswer;

            let style = "bg-white border-slate-200 text-slate-800 hover:border-emerald-500 hover:bg-emerald-50/40";
            if (isAnswerSubmitted) {
              if (isCorrect) style = "bg-emerald-50 border-emerald-600 text-emerald-900 font-bold";
              else if (isSelected) style = "bg-rose-50 border-rose-500 text-rose-900";
              else style = "bg-slate-50 text-slate-400 border-slate-200";
            }

            return (
              <button
                key={idx}
                disabled={isAnswerSubmitted}
                onClick={() => handleSelect(idx)}
                className={`w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-center justify-between ${style}`}
              >
                <span>{opt}</span>
                {isAnswerSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {isAnswerSubmitted && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 animate-fadeIn">
            <span className="text-xs font-extrabold text-emerald-800">PSR EXPLANATION:</span>
            <p className="text-xs text-slate-700">{currentQ.explanation}</p>
            <button
              onClick={handleNext}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md mt-2 flex items-center justify-center gap-2"
            >
              <span>Next Match Question</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
