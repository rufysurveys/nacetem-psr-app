import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Question } from '../../types';
import { Users, Trophy, CheckCircle2, ArrowRight } from 'lucide-react';

export const KnockoutLobby: React.FC = () => {
  const { questions, recordQuizResult, setActivePage, user } = useStore();
  
  const knockoutQuestions = questions.filter((q: Question) => q.difficulty === 'Intermediate' || q.difficulty === 'Basic');
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [peers, setPeers] = useState([
    { id: 'p1', name: 'Dr. Adeyemi', mda: 'OHCSF', score: 1450 },
    { id: 'p2', name: 'Chidi Nnamdi', mda: 'FCSC', score: 1380 },
    { id: 'p3', name: 'Fatima A.', mda: 'BPP', score: 1290 },
    { id: 'p4', name: 'Emmanuel O.', mda: 'MOJ', score: 1210 },
  ]);

  const currentQ = knockoutQuestions[currentIdx] || knockoutQuestions[0];

  useEffect(() => {
    if (isFinished || isAnswerSubmitted) return;
    const interval = setInterval(() => {
      setPeers(prev => prev.map(p => ({
        ...p,
        score: p.score + Math.floor(Math.random() * 40)
      })));
    }, 2500);
    return () => clearInterval(interval);
  }, [isFinished, isAnswerSubmitted]);

  const handleSelect = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOpt(idx);
    setIsAnswerSubmitted(true);

    if (idx === currentQ.correctAnswer) {
      setUserScore(prev => prev + 350);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < knockoutQuestions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOpt(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsFinished(true);
      recordQuizResult(userScore + 2000, 85, 5200, true, [], 2);
    }
  };

  if (isFinished) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-6 animate-fadeIn">
        <div className="bright-card rounded-3xl p-8 border-amber-400 space-y-6">
          <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 border-2 border-amber-500 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">Stage 2 Knockout Complete!</h2>
          <p className="text-sm text-slate-600">
            You placed in the <strong className="text-emerald-700">Top 15%</strong> of the live knockout lobby and advanced to the Grand Finale!
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-around text-center">
            <div>
              <span className="block text-2xl font-bold text-emerald-600">#2</span>
              <span className="text-[10px] text-slate-500 uppercase">Lobby Rank</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-slate-900">{userScore + 2000}</span>
              <span className="text-[10px] text-slate-500 uppercase">Knockout Points</span>
            </div>
          </div>

          <button
            onClick={() => setActivePage('schedule')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md"
          >
            Proceed to Stage 3: Grand Finale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 font-extrabold text-xs">
                STAGE 2 KNOCKOUT
              </span>
              <span className="text-xs text-slate-600 font-semibold">
                Question {currentIdx + 1} of {knockoutQuestions.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
              <Users className="w-4 h-4" /> Live Multiplayer Lobby
            </div>
          </div>

          <div className="bright-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{currentQ.chapter}</span>
              <h3 className="text-xl font-bold text-slate-900 leading-snug">{currentQ.title}</h3>
            </div>

            <div className="space-y-3">
              {currentQ.options.map((opt: string, idx: number) => {
                const isSelected = selectedOpt === idx;
                const isCorrect = idx === currentQ.correctAnswer;
                
                let style = "bg-white border-slate-200 text-slate-800 hover:border-amber-500 hover:bg-amber-50/40";
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
                <span className="text-xs font-extrabold text-emerald-800">CITATION: {currentQ.psrCitation.ruleNumber}</span>
                <p className="text-xs text-slate-700">{currentQ.explanation}</p>
                <button
                  onClick={handleNext}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md mt-2"
                >
                  Next Knockout Question
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bright-card p-5 rounded-3xl space-y-4">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>Live Standings</span>
          </h4>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>You ({user?.name || 'Officer'})</span>
                <span className="text-emerald-700">{userScore} pts</span>
              </div>
              <span className="text-[10px] text-emerald-800">{user?.mdaName}</span>
            </div>

            {peers.map((peer) => (
              <div key={peer.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>{peer.name}</span>
                  <span className="text-slate-500">{peer.score} pts</span>
                </div>
                <span className="text-[10px] text-slate-400">{peer.mda}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
