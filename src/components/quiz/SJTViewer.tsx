import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Question } from '../../types';
import { Award, BookOpen, CheckCircle2, Trophy, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SJTViewer: React.FC = () => {
  const { questions, recordQuizResult, setActivePage } = useStore();

  const sjtQuestions = questions.filter((q: Question) => q.type === 'sjt');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ: Question = sjtQuestions[currentIdx] || sjtQuestions[0];

  const handleSelect = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOpt(idx);
    setIsAnswerSubmitted(true);

    if (idx === currentQ.correctAnswer) {
      setTotalScore(prev => prev + 1200);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < sjtQuestions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOpt(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsFinished(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      recordQuizResult(totalScore + 3000, 92, 4500, true, [], 3);
    }
  };

  if (isFinished) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-6 animate-fadeIn">
        <div className="glass-card rounded-3xl p-8 border-amber-500/50 space-y-6">
          <div className="w-24 h-24 rounded-full bg-amber-500/20 text-amber-400 border-2 border-amber-500 flex items-center justify-center mx-auto shadow-2xl">
            <Award className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">Grand Finale SJT Completed!</h2>
          <p className="text-sm text-slate-300">
            You achieved maximum accuracy in Situational Judgment Tests and earned the title <strong className="text-amber-400">Grand Chancellor of Public Service Rules</strong>!
          </p>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-around text-center">
            <div>
              <span className="block text-2xl font-black text-amber-400">92%</span>
              <span className="text-[10px] text-slate-400 uppercase">SJT Accuracy</span>
            </div>
            <div>
              <span className="block text-2xl font-black text-emerald-400">{totalScore + 3000}</span>
              <span className="text-[10px] text-slate-400 uppercase">Grand Finale XP</span>
            </div>
          </div>

          <button
            onClick={() => setActivePage('profile')}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-xl"
          >
            Claim Grand Chancellor Certification & Badges
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 border border-amber-500/30 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-amber-950 text-amber-400 border border-amber-800 font-extrabold text-xs">
            STAGE 3 GRAND FINALE
          </span>
          <span className="text-xs text-slate-300 font-semibold">
            Case Scenario {currentIdx + 1} of {sjtQuestions.length}
          </span>
        </div>
        <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
          <ShieldCheck className="w-4 h-4" /> SJT Executive Scenario
        </span>
      </div>

      {/* Case Study Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border-amber-500/20">
        <div className="space-y-3">
          <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">{currentQ.chapter}</span>
          <h3 className="text-2xl font-bold text-white leading-snug">{currentQ.title}</h3>
          
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Administrative Workplace Scenario:</span>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              "{currentQ.scenario}"
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedOpt === idx;
            const isCorrect = idx === currentQ.correctAnswer;

            let style = "bg-slate-900 border-slate-800 text-slate-200 hover:border-amber-500/40";
            if (isAnswerSubmitted) {
              if (isCorrect) style = "bg-emerald-950 border-emerald-500 text-emerald-300 font-bold";
              else if (isSelected) style = "bg-rose-950 border-rose-500 text-rose-300";
              else style = "bg-slate-950 text-slate-600 border-slate-900";
            }

            return (
              <button
                key={idx}
                disabled={isAnswerSubmitted}
                onClick={() => handleSelect(idx)}
                className={`w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-start justify-between gap-3 ${style}`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </div>
                {isAnswerSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Detailed Citation & Commentary */}
        {isAnswerSubmitted && (
          <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3 animate-fadeIn">
            <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span>STATUTORY CITATION: {currentQ.psrCitation.ruleNumber}</span>
            </span>

            <p className="text-xs text-slate-200 italic bg-slate-950 p-3 rounded-xl border border-amber-900">
              "{currentQ.psrCitation.excerpt}"
            </p>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-amber-400">Administrative Due Process Analysis:</strong> {currentQ.explanation}
            </p>

            <button
              onClick={handleNext}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-lg mt-2"
            >
              Next SJT Case Study
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
