import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Question } from '../../types';
import { WheelOfRules, WheelSegment } from '../gameshow/WheelOfRules';
import { HostDialogue } from '../gameshow/HostDialogue';
import { Lifelines } from '../gameshow/Lifelines';
import { playCorrectSound, playBuzzerSound, playFanfareSound } from '../../utils/audio';
import { Clock, AlertTriangle, CheckCircle2, XCircle, BookOpen, ArrowRight, Trophy, Zap, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const QuizRunner: React.FC = () => {
  const { questions, recordQuizResult, logAntiCheatEvent, setActivePage } = useStore();

  const stageQuestions = questions.filter((q: Question) => q.type !== 'sjt');
  
  // Game Show State: 'wheel_spin' | 'answering' | 'result'
  const [gameState, setGameState] = useState<'wheel_spin' | 'answering' | 'result'>('wheel_spin');
  const [activeSegment, setActiveSegment] = useState<WheelSegment | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ questionId: string; selectedAnswer: number; isCorrect: boolean; timeSpentSec: number }[]>([]);
  
  const [timeLeft, setTimeLeft] = useState(15);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Lifelines state
  const [used5050, setUsed5050] = useState(false);
  const [usedPeek, setUsedPeek] = useState(false);
  const [usedExtraTime, setUsedExtraTime] = useState(false);
  const [hiddenOptionIndices, setHiddenOptionIndices] = useState<number[]>([]);
  const [showPeekCitation, setShowPeekCitation] = useState(false);

  const questionStartTimeRef = useRef<number>(Date.now());
  const currentQ: Question = stageQuestions[currentIdx] || stageQuestions[0];

  // Anti-cheat monitoring
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameState === 'answering') {
        setTabSwitchCount(prev => prev + 1);
        logAntiCheatEvent(
          'tab_switch',
          `Participant left quiz window during Game Show Question #${currentIdx + 1}`,
          'medium'
        );
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentIdx, gameState, logAntiCheatEvent]);

  // Timer per question
  useEffect(() => {
    if (gameState !== 'answering' || isAnswerSubmitted) return;

    setTimeLeft(currentQ?.timeLimitSeconds || 15);
    questionStartTimeRef.current = Date.now();

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIdx, gameState, isAnswerSubmitted]);

  const handleTimeOut = () => {
    if (selectedOpt === null) {
      handleAnswerSelect(-1);
    }
  };

  const handleWheelSpinComplete = (segment: WheelSegment) => {
    setActiveSegment(segment);
    setTimeout(() => {
      setGameState('answering');
      questionStartTimeRef.current = Date.now();
    }, 1200);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (isAnswerSubmitted || gameState !== 'answering') return;

    const timeSpentSec = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
    const isCorrect = optionIndex === currentQ.correctAnswer;

    if (isCorrect) {
      playCorrectSound();
    } else {
      playBuzzerSound();
    }

    setSelectedOpt(optionIndex);
    setIsAnswerSubmitted(true);

    const newAns = {
      questionId: currentQ.id,
      selectedAnswer: optionIndex,
      isCorrect,
      timeSpentSec
    };

    setUserAnswers(prev => [...prev, newAns]);
  };

  // Lifeline handlers
  const handleUse5050 = () => {
    if (used5050 || isAnswerSubmitted) return;
    setUsed5050(true);
    const wrongIndices = currentQ.options
      .map((_, idx) => idx)
      .filter(idx => idx !== currentQ.correctAnswer);
    // Hide first 2 wrong options
    setHiddenOptionIndices(wrongIndices.slice(0, 2));
  };

  const handleUsePeek = () => {
    if (usedPeek || isAnswerSubmitted) return;
    setUsedPeek(true);
    setShowPeekCitation(true);
  };

  const handleUseExtraTime = () => {
    if (usedExtraTime || isAnswerSubmitted) return;
    setUsedExtraTime(true);
    setTimeLeft(prev => prev + 15);
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < stageQuestions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOpt(null);
      setIsAnswerSubmitted(false);
      setHiddenOptionIndices([]);
      setShowPeekCitation(false);
      setGameState('wheel_spin'); // Spin wheel for next round!
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setGameState('result');
    const totalCorrect = userAnswers.filter(a => a.isCorrect).length;
    const accuracy = Math.round((totalCorrect / stageQuestions.length) * 100);
    const avgTimeMs = Math.round((userAnswers.reduce((acc, a) => acc + a.timeSpentSec, 0) / stageQuestions.length) * 1000);
    const totalScore = Math.round((totalCorrect * 600) + (accuracy * 25) - (tabSwitchCount * 100));
    const passed = accuracy >= 70;

    if (passed) {
      playFanfareSound();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    }

    recordQuizResult(totalScore, accuracy, avgTimeMs, passed, userAnswers, 1);
  };

  // GAME SHOW RESULT SCREEN
  if (gameState === 'result') {
    const totalCorrect = userAnswers.filter(a => a.isCorrect).length;
    const accuracy = Math.round((totalCorrect / stageQuestions.length) * 100);
    const passed = accuracy >= 70;

    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-fadeIn space-y-6">
        <HostDialogue
          message={passed 
            ? `TREMENDOUS SHOWMANSHIP! You scored ${accuracy}% accuracy and conquered the Wheel of Public Service Rules!` 
            : `Great effort! You achieved ${accuracy}%. Review the PSR citations and spin again!`
          }
        />

        <div className="bright-card rounded-3xl p-8 text-center space-y-6">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-lg ${
            passed ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-500' : 'bg-rose-100 text-rose-600 border-2 border-rose-500'
          }`}>
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              {passed ? 'Stage 1 Qualifier Victorious!' : 'Game Show Qualifier Completed'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {passed ? 'You officially qualified to advance to Stage 2: The Knockout!' : '70% pass threshold required to advance.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="block text-2xl font-black text-emerald-600">{accuracy}%</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Accuracy</span>
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{totalCorrect} / {stageQuestions.length}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Correct</span>
            </div>
            <div>
              <span className={`block text-2xl font-black ${tabSwitchCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {tabSwitchCount}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Tab Warnings</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={() => setActivePage('tournaments')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md"
            >
              Return to Tournaments Hub
            </button>
            <button
              onClick={() => {
                setGameState('wheel_spin');
                setCurrentIdx(0);
                setUserAnswers([]);
              }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold py-3.5 rounded-xl text-sm transition-all"
            >
              Spin & Replay Qualifier
            </button>
          </div>
        </div>
      </div>
    );
  }

  // WHEEL SPIN SCREEN
  if (gameState === 'wheel_spin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
        <HostDialogue
          message={`Welcome to Round ${currentIdx + 1} of the Public Service Rules Game Show! Spin the Wheel of Rules to determine your next category & score multiplier!`}
        />

        <div className="bright-card rounded-3xl p-6 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Round {currentIdx + 1} of {stageQuestions.length} • Wheel of Rules</span>
          </div>

          <WheelOfRules onSpinComplete={handleWheelSpinComplete} />
        </div>
      </div>
    );
  }

  // ANSWERING QUESTION SCREEN
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      
      {/* Host Dialogue */}
      <HostDialogue
        message={isAnswerSubmitted 
          ? (selectedOpt === currentQ.correctAnswer ? `EXCELLENT! Spot on! Take a look at statutory citation ${currentQ.psrCitation.ruleNumber}.` : `Ooh, not quite! According to ${currentQ.psrCitation.ruleNumber}, check the explanation below.`)
          : `For Round ${currentIdx + 1}: ${activeSegment?.label || 'Public Service Rules'}! Select your answer carefully before time runs out!`
        }
      />

      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        
        {/* Lifelines */}
        <Lifelines
          used5050={used5050}
          usedPeek={usedPeek}
          usedExtraTime={usedExtraTime}
          onUse5050={handleUse5050}
          onUsePeek={handleUsePeek}
          onUseExtraTime={handleUseExtraTime}
          disabled={isAnswerSubmitted}
        />

        {/* Countdown */}
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${timeLeft <= 5 ? 'text-rose-600 animate-bounce' : 'text-emerald-600'}`} />
          <span className={`font-mono font-black text-xl ${timeLeft <= 5 ? 'text-rose-600' : 'text-slate-900'}`}>
            00:{String(timeLeft).padStart(2, '0')}
          </span>
        </div>
      </div>

      {tabSwitchCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-amber-800 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Anti-Cheat Warning: Tab switch logged ({tabSwitchCount}). Keep window focused.</span>
        </div>
      )}

      {/* Peek Lifeline Rule Excerpt */}
      {showPeekCitation && (
        <div className="bg-teal-50 border border-teal-300 p-4 rounded-2xl text-xs space-y-1 animate-fadeIn">
          <span className="font-extrabold text-teal-800">📖 RULEBOOK PEEK CITATION EXCERPT ({currentQ.psrCitation.ruleNumber}):</span>
          <p className="italic text-slate-700 bg-white p-2.5 rounded-xl border border-teal-200">
            "{currentQ.psrCitation.excerpt}"
          </p>
        </div>
      )}

      {/* Question Card */}
      <div className="bright-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">
              {currentQ.chapter}
            </span>
            {activeSegment?.multiplier && activeSegment.multiplier > 1 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[10px] shadow">
                🔥 2X DOUBLE XP ROUND
              </span>
            )}
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
            {currentQ.title}
          </h3>
          {currentQ.scenario && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 italic leading-relaxed">
              "{currentQ.scenario}"
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQ.options.map((optionText: string, idx: number) => {
            const isHidden = hiddenOptionIndices.includes(idx);
            if (isHidden) return null; // 50:50 Lifeline hiding

            const isSelected = selectedOpt === idx;
            const isCorrect = idx === currentQ.correctAnswer;
            
            let btnStyle = "bg-white border-slate-200 text-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50";
            if (isAnswerSubmitted) {
              if (isCorrect) btnStyle = "bg-emerald-50 border-emerald-600 text-emerald-900 font-bold shadow-sm";
              else if (isSelected) btnStyle = "bg-rose-50 border-rose-500 text-rose-900";
              else btnStyle = "bg-slate-50 border-slate-200 text-slate-400";
            } else if (isSelected) {
              btnStyle = "bg-emerald-50 border-emerald-600 text-emerald-900 font-bold";
            }

            return (
              <button
                key={idx}
                disabled={isAnswerSubmitted}
                onClick={() => handleAnswerSelect(idx)}
                className={`w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-start justify-between gap-3 ${btnStyle}`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{optionText}</span>
                </div>

                {isAnswerSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                {isAnswerSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Authoritative Citation Display Post Answer */}
        {isAnswerSubmitted && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>AUTHORITATIVE RULE CITATION: {currentQ.psrCitation.ruleNumber}</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">{currentQ.psrCitation.sectionTitle}</span>
            </div>
            
            <p className="text-xs text-slate-800 italic bg-white p-3 rounded-xl border border-emerald-200">
              "{currentQ.psrCitation.excerpt}"
            </p>

            <p className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-emerald-800">Practical Application:</strong> {currentQ.explanation}
            </p>

            <button
              onClick={handleNextQuestion}
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>{currentIdx + 1 < stageQuestions.length ? 'Spin Wheel for Next Round' : 'View Qualifier Game Show Results'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
