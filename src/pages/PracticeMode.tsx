import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Question } from '../types';
import { BookOpen, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Filter, Sparkles, Bookmark, BookmarkCheck, ScrollText, Play, RotateCcw } from 'lucide-react';

type ChapterFilter = 'All' | 'Bookmarked' | string; // string = chapter number, e.g. "11"

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Questions are tagged like "Chapter 11 Section 2" — group them by chapter number.
const chapterNumberOf = (q: Question) => String(q.chapter).match(/Chapter\s+(\d+)/i)?.[1] ?? 'Other';

const isCorrectOption = (q: Question, idx: number) =>
  Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(idx) : q.correctAnswer === idx;

const stripVerdict = (text: string) => (text || '').replace(/^(Correct|Wrong Answer|Wrong)[\.,\s]+/i, '').trim();

// Practice progress is a per-browser convenience; it never blocks the page if storage is unavailable.
type PracticeProgress = { answers: Record<string, number>; bookmarks: string[] };
const loadProgress = (key: string): PracticeProgress => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { answers: parsed.answers || {}, bookmarks: parsed.bookmarks || [] };
    }
  } catch (e) {}
  return { answers: {}, bookmarks: [] };
};

export const PracticeMode: React.FC = () => {
  const { questions, user } = useStore();
  const storageKey = `psr_practice_${user?.id ?? 'guest'}`;

  const [progress, setProgress] = useState<PracticeProgress>(() => loadProgress(storageKey));
  const [selectedChapter, setSelectedChapter] = useState<ChapterFilter>('All');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showRuleContext, setShowRuleContext] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch (e) {}
  }, [storageKey, progress]);

  // Chapter list derived from the question bank itself
  const chapterStats = useMemo(() => {
    const map = new Map<string, { number: string; questions: Question[]; sections: Set<string> }>();
    questions.forEach(q => {
      const num = chapterNumberOf(q);
      if (!map.has(num)) map.set(num, { number: num, questions: [], sections: new Set() });
      const entry = map.get(num)!;
      entry.questions.push(q);
      entry.sections.add(String(q.chapter));
    });
    return [...map.values()]
      .sort((a, b) => Number(a.number) - Number(b.number))
      .map(ch => {
        const answered = ch.questions.filter(q => q.id in progress.answers);
        const correct = answered.filter(q => isCorrectOption(q, progress.answers[q.id])).length;
        return { ...ch, answeredCount: answered.length, correctCount: correct };
      });
  }, [questions, progress.answers]);

  const filteredQuestions = useMemo(() => {
    if (selectedChapter === 'All') return questions;
    if (selectedChapter === 'Bookmarked') return questions.filter(q => progress.bookmarks.includes(q.id));
    return questions.filter(q => chapterNumberOf(q) === selectedChapter);
  }, [questions, selectedChapter, progress.bookmarks]);

  const total = filteredQuestions.length;
  const safeIdx = Math.min(currentIdx, Math.max(0, total - 1));
  const currentQ: Question | undefined = filteredQuestions[safeIdx];
  const chosen = currentQ ? progress.answers[currentQ.id] : undefined;
  const isAnswered = chosen !== undefined;
  const isBookmarked = currentQ ? progress.bookmarks.includes(currentQ.id) : false;

  const goTo = (idx: number) => {
    setCurrentIdx(idx);
    setShowRuleContext(false);
  };

  const changeChapter = (chapter: ChapterFilter, startIdx = 0) => {
    setSelectedChapter(chapter);
    goTo(startIdx);
  };

  const handleSelect = (idx: number) => {
    if (!currentQ || isAnswered) return;
    setProgress(p => ({ ...p, answers: { ...p.answers, [currentQ.id]: idx } }));
  };

  const toggleBookmark = () => {
    if (!currentQ) return;
    setProgress(p => ({
      ...p,
      bookmarks: p.bookmarks.includes(currentQ.id)
        ? p.bookmarks.filter(id => id !== currentQ.id)
        : [...p.bookmarks, currentQ.id],
    }));
  };

  const resetCurrentCard = () => {
    if (!currentQ) return;
    setProgress(p => {
      const { [currentQ.id]: _removed, ...rest } = p.answers;
      return { ...p, answers: rest };
    });
  };

  // "Start Practice" jumps to the first unanswered question in that chapter
  const startChapter = (chapterNumber: string) => {
    const chapterQs = questions.filter(q => chapterNumberOf(q) === chapterNumber);
    const firstOpen = chapterQs.findIndex(q => !(q.id in progress.answers));
    changeChapter(chapterNumber, firstOpen === -1 ? 0 : firstOpen);
    document.getElementById('practice-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const totalAnswered = Object.keys(progress.answers).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">

      {/* Header + chapter filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Practice & Study Mode</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Casual PSR Rulebook Drilling</h1>
          <p className="text-sm text-slate-500 mt-1">
            Drill specific PSR chapters on demand outside scheduled tournaments.{' '}
            <span className="font-semibold text-emerald-700">{totalAnswered} of {questions.length} answered.</span>
          </p>
        </div>

        <div className="w-full md:w-72">
          <label htmlFor="chapter-filter" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-600" /> Filter by Chapter
          </label>
          <select
            id="chapter-filter"
            value={selectedChapter}
            onChange={(e) => changeChapter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="All">All Chapters ({questions.length} Qs)</option>
            {chapterStats.map(ch => (
              <option key={ch.number} value={ch.number}>Chapter {ch.number} ({ch.questions.length} Qs)</option>
            ))}
            <option value="Bookmarked">★ Bookmarked ({progress.bookmarks.length})</option>
          </select>
        </div>
      </div>

      {/* Flashcard */}
      <div id="practice-card" className="max-w-3xl mx-auto space-y-4 scroll-mt-36">
        {!currentQ ? (
          <div className="bright-card rounded-3xl px-6 py-12 text-center">
            <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900">No bookmarked questions yet</h3>
            <p className="text-sm text-slate-500 mt-1">Use "Bookmark Question" on any card to save it here.</p>
            <button onClick={() => changeChapter('All')} className="mt-5 text-sm font-bold text-emerald-700 hover:text-emerald-900">
              Back to all chapters →
            </button>
          </div>
        ) : (
          <>
            <div className="bright-card rounded-3xl overflow-hidden">
              {/* Card header */}
              <div className="px-6 sm:px-8 pt-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    {currentQ.chapter}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Card <strong className="text-slate-900">{safeIdx + 1}</strong> of {total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={safeIdx + 1} aria-valuemin={1} aria-valuemax={total} aria-label="Position in deck">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300" style={{ width: `${((safeIdx + 1) / total) * 100}%` }} />
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">{currentQ.title}</h3>

                {currentQ.scenario && (
                  <p className="text-sm text-slate-700 italic bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    "{currentQ.scenario}"
                  </p>
                )}

                {/* Options */}
                <div className="space-y-3">
                  {currentQ.options.map((opt, idx) => {
                    const isCorrect = isCorrectOption(currentQ, idx);
                    const isChosen = chosen === idx;

                    let card = 'bg-white border-slate-200 text-slate-800 hover:border-emerald-500 hover:bg-emerald-50/40 hover:shadow-sm active:scale-[0.99]';
                    let label = 'bg-slate-100 text-slate-600 group-hover:bg-emerald-600 group-hover:text-white';
                    if (isAnswered) {
                      if (isCorrect) {
                        card = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold';
                        label = 'bg-emerald-600 text-white';
                      } else if (isChosen) {
                        card = 'bg-rose-50 border-rose-400 text-rose-950';
                        label = 'bg-rose-500 text-white';
                      } else {
                        card = 'bg-slate-50 border-slate-200 text-slate-400';
                        label = 'bg-slate-200 text-slate-400';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        disabled={isAnswered}
                        className={`group w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 text-sm transition-all flex items-center gap-3.5 disabled:cursor-default ${card}`}
                      >
                        <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${label}`}>
                          {OPTION_LABELS[idx] ?? idx + 1}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                        {isAnswered && isChosen && !isCorrect && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Rule context (available before answering) */}
                {showRuleContext && !isAnswered && (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-700 flex items-start gap-3">
                    <ScrollText className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">PSR Rule {currentQ.psrCitation.ruleNumber}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{currentQ.psrCitation.sectionTitle} — look up this rule in the PSR, then choose your answer.</p>
                    </div>
                  </div>
                )}

                {/* Feedback after answering */}
                {isAnswered && (() => {
                  const isUserCorrect = isCorrectOption(currentQ, chosen!);
                  const cleanText = stripVerdict(currentQ.psrCitation.excerpt || currentQ.explanation);
                  const cleanExplanation = stripVerdict(currentQ.explanation);
                  return (
                    <div className={`p-5 rounded-2xl border space-y-3 ${isUserCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`text-sm font-extrabold flex items-center gap-1.5 ${isUserCorrect ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {isUserCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {isUserCorrect ? 'Correct.' : 'Wrong Answer.'}
                        </span>
                        <span className={`text-[11px] font-semibold flex items-center gap-1 ${isUserCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                          <Sparkles className="w-3.5 h-3.5" /> PSR Rule {currentQ.psrCitation.ruleNumber} · {currentQ.psrCitation.sectionTitle}
                        </span>
                      </div>
                      <p className={`text-sm bg-white p-3 rounded-xl border ${isUserCorrect ? 'text-slate-800 border-emerald-200' : 'text-rose-950 border-rose-200'}`}>
                        {cleanText}
                      </p>
                      {cleanExplanation && cleanExplanation !== cleanText && (
                        <p className="text-xs text-slate-700">
                          <strong className={isUserCorrect ? 'text-emerald-800' : 'text-rose-900'}>Explanation:</strong> {cleanExplanation}
                        </p>
                      )}
                      <button onClick={resetCurrentCard} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">
                        <RotateCcw className="w-3.5 h-3.5" /> Try this card again
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Card navigation */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleBookmark}
                  aria-pressed={isBookmarked}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    isBookmarked
                      ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {isBookmarked ? 'Bookmarked' : 'Bookmark Question'}
                </button>
                <button
                  onClick={() => setShowRuleContext(v => !v)}
                  disabled={isAnswered}
                  aria-pressed={showRuleContext}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ScrollText className="w-4 h-4" />
                  View Rule Context
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goTo(safeIdx - 1)}
                  disabled={safeIdx === 0}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  onClick={() => goTo(safeIdx + 1 < total ? safeIdx + 1 : 0)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  {safeIdx + 1 < total ? 'Next Card' : 'Back to First Card'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chapter mastery */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" /> Chapter Mastery
          </h2>
          <span className="text-xs text-slate-500">Progress is saved on this device.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapterStats.map(ch => {
            const count = ch.questions.length;
            const percent = count ? Math.round((ch.answeredCount / count) * 100) : 0;
            const accuracy = ch.answeredCount ? Math.round((ch.correctCount / ch.answeredCount) * 100) : null;
            const isActive = selectedChapter === ch.number;
            const isDone = ch.answeredCount === count && count > 0;
            return (
              <div
                key={ch.number}
                className={`bright-card rounded-2xl p-5 flex flex-col gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${isActive ? 'ring-2 ring-emerald-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Chapter {ch.number}</h3>
                    <p className="text-xs text-slate-500">{ch.sections.size} {ch.sections.size === 1 ? 'section' : 'sections'}</p>
                  </div>
                  {accuracy !== null && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${accuracy >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {accuracy}% correct
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="text-slate-600"><strong className="text-slate-900">{ch.answeredCount}</strong> / {count} Qs completed</span>
                    <span className="font-bold text-emerald-700">{percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>

                <button
                  onClick={() => startChapter(ch.number)}
                  className={`mt-auto inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  {isDone ? 'Review Chapter' : ch.answeredCount > 0 ? 'Continue Practice' : 'Start Practice'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
