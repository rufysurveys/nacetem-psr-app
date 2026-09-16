import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { PSRChapter, Question } from '../types';
import { BookOpen, CheckCircle2, ArrowRight, Filter, Sparkles } from 'lucide-react';

export const PracticeMode: React.FC = () => {
  const { questions } = useStore();

  const chapters: PSRChapter[] = [
    'Chapter 1: Structure & Appointments',
    'Chapter 3: Discipline & Due Process',
    'Chapter 7: Leave & Allowances',
    'Chapter 10: Petitions & Appeals',
    'Chapter 13: Procurement & Public Ethics',
    'Chapter 15: Promotion & Evaluation'
  ];

  const [selectedChapter, setSelectedChapter] = useState<PSRChapter | 'All'>('All');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [showCitation, setShowCitation] = useState(false);

  const filteredQuestions = selectedChapter === 'All' 
    ? questions 
    : questions.filter(q => q.chapter === selectedChapter);

  const currentQ: Question = filteredQuestions[currentIdx] || questions[0];

  const handleSelect = (idx: number) => {
    setSelectedOpt(idx);
    setShowCitation(true);
  };

  const handleNext = () => {
    if (currentIdx + 1 < filteredQuestions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOpt(null);
      setShowCitation(false);
    } else {
      setCurrentIdx(0);
      setSelectedOpt(null);
      setShowCitation(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Practice & Study Mode</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Casual PSR Rulebook Drilling</h1>
          <p className="text-xs text-slate-500 mt-1">
            Drill specific PSR chapters on demand outside scheduled tournaments.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
          <Filter className="w-4 h-4 text-emerald-600" />
          <select
            value={selectedChapter}
            onChange={(e) => {
              setSelectedChapter(e.target.value as any);
              setCurrentIdx(0);
              setSelectedOpt(null);
              setShowCitation(false);
            }}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none pr-4"
          >
            <option value="All">All PSR Chapters ({questions.length} Qs)</option>
            {chapters.map(ch => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bright-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                {currentQ.chapter}
              </span>
              <span className="text-xs text-slate-500">
                Card {currentIdx + 1} of {filteredQuestions.length}
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 leading-snug">{currentQ.title}</h3>
            
            {currentQ.scenario && (
              <p className="text-xs text-slate-700 italic bg-slate-50 p-4 rounded-2xl border border-slate-200">
                "{currentQ.scenario}"
              </p>
            )}

            <div className="space-y-3">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOpt === idx;
                const isCorrect = idx === currentQ.correctAnswer;

                let style = "bg-white border-slate-200 text-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50";
                if (showCitation) {
                  if (isCorrect) style = "bg-emerald-50 border-emerald-600 text-emerald-900 font-bold";
                  else if (isSelected) style = "bg-rose-50 border-rose-500 text-rose-900";
                  else style = "bg-slate-50 text-slate-400 border-slate-200";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={`w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-center justify-between ${style}`}
                  >
                    <span>{opt}</span>
                    {showCitation && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {showCitation && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Citation: {currentQ.psrCitation.ruleNumber}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold">{currentQ.psrCitation.sectionTitle}</span>
                </div>

                <p className="text-xs text-slate-800 italic bg-white p-3 rounded-xl border border-emerald-200">
                  "{currentQ.psrCitation.excerpt}"
                </p>

                <p className="text-xs text-slate-700">
                  <strong className="text-emerald-800">Explanation:</strong> {currentQ.explanation}
                </p>

                <button
                  onClick={handleNext}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 mt-2"
                >
                  <span>{currentIdx + 1 < filteredQuestions.length ? 'Next Practice Card' : 'Restart Chapter Drilling'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bright-card p-6 rounded-3xl space-y-4">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            PSR Chapter List
          </h4>

          <div className="space-y-3">
            {chapters.map(ch => {
              const count = questions.filter(q => q.chapter === ch).length;
              return (
                <div 
                  key={ch}
                  onClick={() => {
                    setSelectedChapter(ch);
                    setCurrentIdx(0);
                    setSelectedOpt(null);
                    setShowCitation(false);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedChapter === ch ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span className="truncate max-w-[180px]">{ch}</span>
                    <span className="text-emerald-700">{count} Qs</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, count * 35)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
