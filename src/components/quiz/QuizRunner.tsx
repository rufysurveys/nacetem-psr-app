import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Question } from '../../types';
import { WheelOfRules, WheelSegment } from '../gameshow/WheelOfRules';
import { HostDialogue } from '../gameshow/HostDialogue';
import { Lifelines } from '../gameshow/Lifelines';
import { playCorrectSound, playBuzzerSound, playFanfareSound } from '../../utils/audio';
import { Clock, AlertTriangle, CheckCircle2, Trophy, Shield, Maximize, AlertOctagon, Eye } from 'lucide-react';
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

  // GLOBAL STANDARD PROCTORING STATE
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [proctoringWarning, setProctoringWarning] = useState<string | null>(null);
  const [mouseLeftViewport, setMouseLeftViewport] = useState(false);

  // Lifelines state
  const [used5050, setUsed5050] = useState(false);
  const [usedPeek, setUsedPeek] = useState(false);
  const [usedExtraTime, setUsedExtraTime] = useState(false);
  const [hiddenOptionIndices, setHiddenOptionIndices] = useState<number[]>([]);
  const [showPeekCitation, setShowPeekCitation] = useState(false);

  const questionStartTimeRef = useRef<number>(Date.now());
  const currentQ: Question = stageQuestions[currentIdx] || stageQuestions[0];

  // Request Fullscreen Proctoring Mode
  const handleEnableFullscreen = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } catch (e) {}
  };

  // GLOBAL PROCTORING SUITE (Fullscreen, Tab Focus, Mouse Boundary & Shortcut Prevention)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeFS = !!document.fullscreenElement;
      setIsFullscreen(activeFS);
      if (!activeFS && gameState === 'answering') {
        setProctoringWarning('⚠️ Proctoring Alert: Fullscreen Exited! Please maintain fullscreen during official competitions.');
        setTabSwitchCount(prev => prev + 1);
        logAntiCheatEvent('tab_switch', 'Participant exited fullscreen proctoring mode', 'medium');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && gameState === 'answering') {
        setTabSwitchCount(prev => prev + 1);
        setProctoringWarning('⚠️ Proctoring Violation: Focus lost / Tab switch detected!');
        logAntiCheatEvent(
          'tab_switch',
          `Participant switched tab during Question #${currentIdx + 1}`,
          'high'
        );
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        if (gameState === 'answering') {
          setMouseLeftViewport(true);
          setProctoringWarning('⚠️ Proctoring Warning: Mouse cursor left the active exam window!');
          setTimeout(() => setMouseLeftViewport(false), 3000);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Copy, Paste, Cut, F12 Developer Tools
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 'a')) ||
        (e.metaKey && (e.key === 'c' || e.key === 'v')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        setProctoringWarning('⚠️ Proctoring Alert: Clipboard & Developer shortcuts are disabled during official competitions.');
        logAntiCheatEvent('pasting_input', 'Attempted unauthorized copy/paste or shortcut', 'medium');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('keydown', handleKeyDown);
    };
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
      setGameState('wheel_spin');
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
      <div className="max-w-3xl mx-auto px-4 py-12 animate-fadeIn space-y-6 select-none">
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
              <span className="text-xs text-slate-500 font-bold">Accuracy</span>
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{totalCorrect} / {stageQuestions.length}</span>
              <span className="text-xs text-slate-500 font-bold">Correct Answers</span>
            </div>
            <div>
              <span className="block text-2xl font-black text-rose-600">{tabSwitchCount}</span>
              <span className="text-xs text-slate-500 font-bold">Proctoring Flagged</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => setActivePage('tournaments')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-md transition-all"
            >
              Return to Tournament Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fadeIn font-sans select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {/* GLOBAL STANDARD PROCTORING STATUS HEADER BANNER */}
      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs border border-slate-800 shadow-md">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="font-extrabold text-emerald-300">PROCTORING ACTIVE</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300 font-semibold">Integrity: <strong className="text-white">{Math.max(0, 100 - (tabSwitchCount * 15))}%</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${tabSwitchCount > 0 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
            Strikes: {tabSwitchCount} / 3
          </span>

          {!isFullscreen && (
            <button
              onClick={handleEnableFullscreen}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1 rounded-xl text-[11px] transition-all flex items-center gap-1 border border-emerald-500"
            >
              <Maximize className="w-3 h-3" />
              <span>Fullscreen</span>
            </button>
          )}
        </div>
      </div>

      {/* PROCTORING ALERT OVERLAY WARNING BANNER */}
      {proctoringWarning && (
        <div className="bg-rose-600 text-white p-3 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 shrink-0" />
            <span>{proctoringWarning}</span>
          </div>
          <button
            onClick={() => setProctoringWarning(null)}
            className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* WHEEL SPIN PHASE */}
      {gameState === 'wheel_spin' && (
        <div className="space-y-6 text-center">
          <HostDialogue message="Spin the Wheel of Rules to determine your next competition category!" />
          <WheelOfRules onSpinComplete={handleWheelSpinComplete} />
        </div>
      )}

      {/* ANSWERING PHASE */}
      {gameState === 'answering' && (
        <div className="bright-card rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-xl border border-slate-200">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {currentQ.chapter}
            </span>

            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="font-mono text-sm font-black text-amber-800">{timeLeft}s</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">{currentQ.title}</h3>
          </div>

          <Lifelines
            onUse5050={handleUse5050}
            onUsePeek={handleUsePeek}
            onUseExtraTime={handleUseExtraTime}
            used5050={used5050}
            usedPeek={usedPeek}
            usedExtraTime={usedExtraTime}
            disabled={isAnswerSubmitted}
          />

          {showPeekCitation && currentQ.psrCitation && (
            <div className="bg-amber-50 border border-amber-300 p-3 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-amber-900 block">PSR Citation Rule {currentQ.psrCitation.ruleNumber}:</span>
              <p className="text-amber-800 italic">{currentQ.psrCitation.excerpt}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((opt, idx) => {
              if (hiddenOptionIndices.includes(idx)) return null;

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
                  onClick={() => handleAnswerSelect(idx)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all text-xs flex items-center justify-between ${btnClass}`}
                >
                  <span>{opt}</span>
                  {isAnswerSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {isAnswerSubmitted && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleNextQuestion}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-md transition-all flex items-center gap-2"
              >
                <span>Next Question &amp; Spin Wheel</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
