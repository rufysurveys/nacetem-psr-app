import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Question, PSRChapter, QuestionType } from '../types';
import { ShieldAlert, Plus, Edit2, Trash2, Calendar, BookOpen, BarChart3, AlertTriangle, CheckCircle2, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { questions, addQuestion, updateQuestion, deleteQuestion, tournaments, antiCheatLogs, chapterAnalytics, mdas } = useStore();

  const [activeTab, setActiveTab] = useState<'scheduler' | 'question_bank' | 'analytics' | 'anti_cheat'>('scheduler');

  const [isQuestionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState<PSRChapter>('Chapter 3: Discipline & Due Process');
  const [type, setType] = useState<QuestionType>('single');
  const [scenario, setScenario] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [ruleNumber, setRuleNumber] = useState('PSR 030301');
  const [sectionTitle, setSectionTitle] = useState('Discipline & Queries');
  const [excerpt, setExcerpt] = useState('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleOpenAdd = () => {
    setEditingQuestion(null);
    setTitle('');
    setScenario('');
    setOpt0('');
    setOpt1('');
    setOpt2('');
    setOpt3('');
    setCorrectAnswer(0);
    setExplanation('');
    setRuleNumber('PSR 030301');
    setSectionTitle('Queries & Due Process');
    setExcerpt('');
    setQuestionModalOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setTitle(q.title);
    setChapter(q.chapter as PSRChapter);
    setType(q.type);
    setScenario(q.scenario || '');
    setOpt0(q.options[0] || '');
    setOpt1(q.options[1] || '');
    setOpt2(q.options[2] || '');
    setOpt3(q.options[3] || '');
    setCorrectAnswer(q.correctAnswer as number);
    setExplanation(q.explanation);
    setRuleNumber(q.psrCitation.ruleNumber);
    setSectionTitle(q.psrCitation.sectionTitle);
    setExcerpt(q.psrCitation.excerpt);
    setQuestionModalOpen(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const newQ: Question = {
      id: editingQuestion ? editingQuestion.id : `q-${Date.now()}`,
      chapter,
      type,
      title,
      scenario: scenario ? scenario : undefined,
      options: [opt0, opt1, opt2, opt3].filter(Boolean),
      correctAnswer,
      explanation,
      psrCitation: {
        ruleNumber,
        sectionTitle,
        excerpt: excerpt || 'Public Service Rules Regulation'
      },
      weightage: type === 'sjt' ? 25 : 15,
      difficulty: type === 'sjt' ? 'Advanced' : 'Intermediate',
      timeLimitSeconds: type === 'sjt' ? 30 : 15
    };

    if (editingQuestion) {
      updateQuestion(newQ);
      triggerToast('Question updated in authoritative PSR Bank');
    } else {
      addQuestion(newQ);
      triggerToast('New question added to PSR Bank');
    }
    setQuestionModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Administrative Command Center</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Public Service Rules Admin Portal</h1>
          <p className="text-xs text-slate-500 mt-1">
            Schedule tournaments, manage citation question banks, analyze MDA training gaps, and monitor security logs.
          </p>
        </div>

        <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'scheduler' ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Scheduler</span>
          </button>

          <button
            onClick={() => setActiveTab('question_bank')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'question_bank' ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Question Bank ({questions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'analytics' ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>MDA Gap Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('anti_cheat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'anti_cheat' ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Anti-Cheat Logs ({antiCheatLogs.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'scheduler' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Active Tournaments</h2>
            <button
              onClick={() => triggerToast('Automated SMS & Push notifications broadcast scheduled.')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow transition-all"
            >
              <Bell className="w-4 h-4" />
              <span>Trigger Tournament Reminders</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tournaments.map((t) => (
              <div key={t.id} className="bright-card p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    {t.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500">{t.season}</span>
                </div>

                <h3 className="text-2xl font-bold text-slate-900">{t.title}</h3>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Registration Cutoff</span>
                    <span className="font-mono text-slate-800">{new Date(t.registrationCutoff).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Registered Officers</span>
                    <span className="font-bold text-emerald-700">{t.totalRegistered}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase">Stage Criteria Settings</h4>
                  {t.stages.map((stage) => (
                    <div key={stage.stageNumber} className="flex items-center justify-between text-xs p-3 rounded-xl bg-white border border-slate-200">
                      <div>
                        <span className="font-bold text-slate-900">Stage {stage.stageNumber}: {stage.name}</span>
                        <p className="text-[11px] text-slate-500">{stage.format}</p>
                      </div>
                      <span className="font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        {stage.passCriteria}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'question_bank' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Question & Rule Citation Bank</h2>
              <p className="text-xs text-slate-500">Manage questions tagged by PSR chapters and citations.</p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Question</span>
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="bright-card p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                      {q.chapter}
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {q.psrCitation.ruleNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[10px]">
                      {q.type.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{q.title}</h3>
                  <p className="text-xs text-slate-600">{q.explanation}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      deleteQuestion(q.id);
                      triggerToast('Question deleted');
                    }}
                    className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">MDA Training Gap Analytics</h2>
            <p className="text-xs text-slate-500">Identifies PSR chapters with highest failure rates across departments.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bright-card p-6 rounded-3xl space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase">Chapter Failure Rates (%)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chapterAnalytics}>
                    <XAxis dataKey="chapter" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                    <Bar dataKey="failureRate" fill="#10b981" radius={[8, 8, 0, 0]}>
                      {chapterAnalytics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.failureRate > 35 ? '#e11d48' : '#059669'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bright-card p-6 rounded-3xl space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase">MDA Accuracy Rates (%)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mdas}>
                    <XAxis dataKey="shortName" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                    <Bar dataKey="accuracyRate" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'anti_cheat' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Anti-Cheat Audit Logs</h2>
            <p className="text-xs text-slate-500">Flagged events during tournament quizzes: tab switching, rapid guessing, duplicate IPs.</p>
          </div>

          <div className="bright-card rounded-3xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Officer Name</th>
                  <th className="px-6 py-4">MDA</th>
                  <th className="px-6 py-4">Flag Event</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {antiCheatLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{log.userName}</td>
                    <td className="px-6 py-4 text-slate-700">{log.mdaName}</td>
                    <td className="px-6 py-4 font-mono text-amber-700 uppercase font-bold">{log.eventType}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                        log.severity === 'high' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        log.severity === 'medium' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">
              {editingQuestion ? 'Edit Question & Citation' : 'Add New Question & PSR Citation'}
            </h3>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Question Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Disciplinary Interdiction Salary Rules"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PSR Chapter</label>
                  <select
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    <option value="Chapter 1: Structure & Appointments">Chapter 1: Structure</option>
                    <option value="Chapter 3: Discipline & Due Process">Chapter 3: Discipline</option>
                    <option value="Chapter 7: Leave & Allowances">Chapter 7: Leave</option>
                    <option value="Chapter 10: Petitions & Appeals">Chapter 10: Petitions</option>
                    <option value="Chapter 13: Procurement & Public Ethics">Chapter 13: Procurement</option>
                    <option value="Chapter 15: Promotion & Evaluation">Chapter 15: Promotion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Format</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    <option value="single">Single Choice</option>
                    <option value="sjt">Situational Judgment Test (SJT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Practical Scenario</label>
                <textarea
                  rows={2}
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="e.g. An officer on Grade Level 12 was absent from duty..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Option A</label>
                  <input type="text" required value={opt0} onChange={(e) => setOpt0(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Option B</label>
                  <input type="text" required value={opt1} onChange={(e) => setOpt1(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Option C</label>
                  <input type="text" required value={opt2} onChange={(e) => setOpt2(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Option D</label>
                  <input type="text" required value={opt3} onChange={(e) => setOpt3(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correct Option</label>
                  <select value={correctAnswer} onChange={(e) => setCorrectAnswer(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900">
                    <option value={0}>Option A</option>
                    <option value={1}>Option B</option>
                    <option value={2}>Option C</option>
                    <option value={3}>Option D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rule Citation No.</label>
                  <input type="text" required value={ruleNumber} onChange={(e) => setRuleNumber(e.target.value)} placeholder="PSR 030402" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rulebook Section</label>
                  <input type="text" required value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="Interdiction & Salary" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rulebook Excerpt</label>
                <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Quote from PSR rulebook..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Explanation</label>
                <textarea rows={2} required value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Explain why answer is correct under due process..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setQuestionModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900">
                  Cancel
                </button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl text-xs shadow">
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
