import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, RefreshCw, Users, Calendar, BookOpen, ClipboardList, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AdminData, AdminQuestion, getAdminData } from '../services/admin';
import { contestRpc } from '../services/remoteContest';
import { copyTournamentLink } from '../services/roomLinks';
import { ProctorReview } from '../components/quiz/ProctorPanel';

type Tab = 'members' | 'games' | 'questions' | 'audit';
type QuestionForm = { id: string | null; text: string; chapter: string; options: string[]; correct: number; explanation: string; section: string; rule: string; excerpt: string; kind: 'quiz' | 'scenario'; tier: number; source: string };
const emptyQuestion = (): QuestionForm => ({ id: null, text: '', chapter: '', options: ['', '', '', ''], correct: 0, explanation: '', section:'',rule:'',excerpt:'',kind:'quiz',tier:1,source:'' });
const buttonClass = 'border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold hover:bg-slate-100 disabled:opacity-40';

export const AdminDashboard: React.FC = () => {
  const { user, setActivePage, fetchCloudGames } = useStore();
  const [tab, setTab] = useState<Tab>('members');
  const [reviewGame, setReviewGame] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<QuestionForm | null>(null);
  const sequence = useRef(0);
  const mutation = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    try { const next = await getAdminData(search, page); if (request === sequence.current) { setData(next); setError(''); } }
    catch (e) { if (request === sequence.current) setError(e instanceof Error ? e.message : 'Could not load admin data'); }
    finally { if (request === sequence.current) setLoading(false); }
  }, [search, page]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 250); return () => { clearTimeout(timer); sequence.current++; }; }, [refresh]);

  const act = async (rpc: string, args: Record<string, unknown>, message: string, confirmation?: string) => {
    if (mutation.current || (confirmation && !window.confirm(confirmation))) return false;
    mutation.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await contestRpc(rpc, args);
      setNotice(message);
      await refresh(); void fetchCloudGames(); return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); return false; }
    finally { mutation.current = false; setBusy(false); }
  };
  const memberAction = (id: string, action: string, name: string) => void act('admin_member_action', { p_user_id: id, p_action: action }, 'Member updated.',
    action === 'delete' ? `Delete ${name} from the app? Access will be blocked. You can restore the member here; contest history is retained.` :
    action === 'make_admin' ? `Give ${name} full administrator access to members, tournaments and questions?` :
    action === 'make_member' ? `Remove administrator access from ${name}?` : action === 'suspend' ? `Suspend app access for ${name}?` : undefined);
  const gameAction = (id: string, action: string, title: string) => void act('admin_game_action', { p_game_id: id, p_action: action }, 'Tournament updated.',
    action === 'delete' ? `Delete "${title}"? It will disappear from listings and its room link will stop working. You can restore it here.` : action === 'cancel' ? `Cancel "${title}" for all participants? This stops the contest.` : undefined);
  const editQuestion = (q: AdminQuestion) => setForm({ id: q.id, text: q.question_text, chapter: q.chapter, options: [...q.options], correct: q.correct_option_index, explanation: q.explanation || '',section:q.section_key||'',rule:q.rule_ref||'',excerpt:q.rule_excerpt||'',kind:q.question_kind||'quiz',tier:q.challenge_tier||1,source:q.source_file||'' });
  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form) return;
    if (await act('admin_save_contest_question', { p_id: form.id, p_text: form.text, p_chapter: form.chapter, p_options: form.options, p_correct: form.correct, p_explanation: form.explanation,p_section:form.section,p_rule:form.rule,p_excerpt:form.excerpt,p_kind:form.kind,p_tier:form.tier,p_source:form.source }, 'Question saved to the shared contest bank.')) setForm(null);
  };
  const copyRoom = async (id: string) => {
    try { await copyTournamentLink(id); setNotice('Tournament room link copied.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not copy link'); }
  };

  return <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
    <header className="bg-emerald-950 text-white p-6 rounded-3xl flex flex-wrap justify-between gap-5">
      <div><p className="text-emerald-200 flex gap-2 items-center text-sm"><ShieldCheck size={18}/>Administrator</p><h1 className="text-3xl font-extrabold mt-2">Manage the PSR platform</h1><p className="text-sm text-emerald-100 mt-2">Signed in as {user?.email}. Changes are saved centrally for all devices.</p></div>
      <button onClick={() => void refresh()} disabled={loading || busy} className="flex gap-2 items-center"><RefreshCw className={loading ? 'animate-spin' : ''} size={18}/>Refresh</button>
    </header>
    <nav className="flex flex-wrap gap-2">{([
      ['members', 'Members', Users], ['games', 'Tournaments', Calendar], ['questions', 'Contest questions', BookOpen], ['audit', 'Admin activity', ClipboardList],
    ] as const).map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${tab === id ? 'bg-emerald-700 text-white' : 'bg-white border'}`}><Icon size={18}/>{label}</button>)}</nav>
    {error && <div role="alert" className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800">{error}</div>}
    {notice && <div role="status" className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800">{notice}</div>}
    {tab !== 'audit' && <input aria-label="Search admin records" placeholder="Search by name, email, tournament or question..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="w-full border rounded-xl p-3 bg-white"/>}
    {loading && !data ? <p className="p-10 text-center">Loading administrator records...</p> : data && <>
      {tab === 'members' && <section className="bg-white border rounded-2xl p-5 space-y-4">
        <div><h2 className="text-xl font-bold">Members ({data.members.length})</h2><p className="text-sm text-slate-500">Delete blocks access and preserves history. Restore brings the member back. Showing up to 500 matches; use search to find anyone.</p></div>
        {!data.members.length && <p>No matching members.</p>}
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b"><th className="p-3">Member</th><th className="p-3">Organization</th><th className="p-3">Access</th><th className="p-3">Actions</th></tr></thead><tbody>{data.members.map(m => <tr key={m.user_id} className="border-b align-top">
          <td className="p-3"><strong>{m.full_name}</strong><p className="text-slate-500">{m.email}</p></td><td className="p-3">{m.agency}<p className="text-slate-500">{m.department}</p></td><td className="p-3">{m.role}<p>{m.deleted_at ? 'Deleted' : m.suspended ? 'Suspended' : 'Active'}</p></td>
          <td className="p-3"><div className="flex flex-wrap gap-2">{m.user_id === user?.id ? <span className="text-slate-500">Your administrator account</span> : m.deleted_at ? <button className={buttonClass} disabled={busy} onClick={() => memberAction(m.user_id, 'restore', m.full_name)}>Restore member</button> : <>
            <button className={buttonClass} disabled={busy} onClick={() => memberAction(m.user_id, m.suspended ? 'resume' : 'suspend', m.full_name)}>{m.suspended ? 'Resume access' : 'Suspend'}</button>
            <button className={buttonClass} disabled={busy} onClick={() => memberAction(m.user_id, m.role === 'admin' ? 'make_member' : 'make_admin', m.full_name)}>{m.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>
            <button className={`${buttonClass} text-rose-700`} disabled={busy} onClick={() => memberAction(m.user_id, 'delete', m.full_name)}>Delete member</button>
          </>}</div></td>
        </tr>)}</tbody></table></div>
      </section>}
      {tab === 'games' && <section className="space-y-4">
        <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Tournaments ({data.games.length})</h2><button className={buttonClass} onClick={() => setActivePage('schedule')}>Schedule a tournament</button></div>
        {!data.games.length && <p className="bg-white p-6 rounded-xl">No matching tournaments.</p>}
        <div className="grid md:grid-cols-2 gap-4">{data.games.map(g => <article key={g.id} className="bg-white border rounded-2xl p-5 space-y-3">
          <div className="flex justify-between gap-3"><h3 className="font-bold text-lg">{g.title}</h3><span className="text-xs font-bold">{g.deleted_at ? 'DELETED' : g.status.toUpperCase()}</span></div>
          <p className="text-sm">Host: {g.host_name || 'No host assigned'} · {g.participant_count} participants (including host)</p><p className="text-sm text-slate-500">{new Date(g.start_datetime).toLocaleString()} · {g.target_org}</p>
          <div className="flex flex-wrap gap-2">{g.deleted_at ? <button className={buttonClass} disabled={busy} onClick={() => gameAction(g.id, 'restore', g.title)}>Restore tournament</button> : <>
            <button className={buttonClass} onClick={() => void copyRoom(g.id)}>Copy room link</button>
            <button className={buttonClass} onClick={() => setReviewGame(reviewGame===g.id?null:g.id)}>Review proctoring</button>
            {!['completed', 'cancelled'].includes(g.status) && <button className={buttonClass} disabled={busy} onClick={() => gameAction(g.id, 'cancel', g.title)}>Cancel contest</button>}
            <button className={`${buttonClass} text-rose-700`} disabled={busy} onClick={() => gameAction(g.id, 'delete', g.title)}>Delete tournament</button>
          </>}</div>
        </article>)}</div>
        {reviewGame && <div className="bg-white border rounded-2xl p-5"><ProctorReview gameId={reviewGame}/></div>}
      </section>}
      {tab === 'questions' && <section className="space-y-4">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Shared contest question bank ({data.question_total})</h2><p className="text-sm text-slate-500">Changes apply to future contests. Started matches keep their original questions.</p></div><button className={buttonClass} onClick={() => setForm(emptyQuestion())}><Plus size={16} className="inline mr-1"/>Add question</button></div>
        {!data.questions.length && <p>No matching questions.</p>}
        {data.questions.map(q => <article key={q.id} className="bg-white border rounded-2xl p-5 space-y-3">
          <p className="text-xs text-slate-500">{q.chapter}{q.is_archived ? ' · ARCHIVED' : ''}</p><h3 className="font-bold">{q.question_text}</h3>
          <ol className="grid sm:grid-cols-2 gap-2 text-sm">{q.options.map((option, i) => <li key={i} className={i === q.correct_option_index ? 'text-emerald-700 font-bold' : ''}>{String.fromCharCode(65 + i)}. {option}{i === q.correct_option_index ? ' (correct)' : ''}</li>)}</ol>
          <div className="flex gap-2"><button className={buttonClass} disabled={busy} onClick={() => editQuestion(q)}>Edit question</button><button className={buttonClass} disabled={busy} onClick={() => void act('admin_archive_question', { p_id: q.id, p_archived: !q.is_archived }, q.is_archived ? 'Question restored.' : 'Question archived.', q.is_archived ? undefined : 'Archive this question so future contests cannot select it?')}>{q.is_archived ? 'Restore question' : 'Archive question'}</button></div>
        </article>)}
        <div className="flex items-center justify-center gap-4"><button className={buttonClass} disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(data.question_total / 25))}</span><button className={buttonClass} disabled={(page + 1) * 25 >= data.question_total || loading} onClick={() => setPage(p => p + 1)}>Next</button></div>
      </section>}
      {tab === 'audit' && <section className="bg-white border rounded-2xl p-5 space-y-4"><h2 className="text-xl font-bold">Latest 100 administrator actions</h2>{!data.audit.length && <p>No administrator actions recorded yet.</p>}<ul className="divide-y">{data.audit.map(a => <li key={a.id} className="py-3 text-sm"><strong>{a.actor_name || 'Administrator'}</strong> · {a.action.split('_').join(' ')}<p className="text-slate-500">{new Date(a.created_at).toLocaleString()} · Record {a.target_id}</p></li>)}</ul></section>}
    </>}
    {form && <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 overflow-y-auto flex items-start justify-center"><form onSubmit={saveQuestion} className="bg-white rounded-3xl p-6 max-w-2xl w-full my-8 space-y-4">
      <h2 className="font-bold text-xl">{form.id ? 'Edit question' : 'Add contest question'}</h2>
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      <label className="block text-sm font-bold">Chapter<input required value={form.chapter} onChange={e => setForm({ ...form, chapter: e.target.value })} className="mt-1 w-full border rounded-xl p-3"/></label>
      <p className="text-sm text-slate-600">Verify the answer against the cited source before saving. A section needs at least five eligible questions of its type to appear on the wheel. An empty section means this question is excluded pending review.</p>
      {(['section','rule','source'] as const).map(key=><label key={key} className="block text-sm font-bold">{key==='section'?'Wheel section (for example Chapter 12 Section 2)':key==='rule'?'PSR rule reference':'Source document / sheet'}<input required value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1 w-full border rounded-xl p-3"/></label>)}
      <label className="block text-sm font-bold">Rulebook Peek excerpt<textarea required value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})} className="mt-1 w-full border rounded-xl p-3"/></label>
      <div className="flex gap-3"><label>Question type<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value as 'quiz'|'scenario'})} className="block border rounded-lg p-2"><option value="quiz">Round 1 quiz</option><option value="scenario">Round 2/3 scenario</option></select></label><label>Difficulty<select value={form.tier} onChange={e=>setForm({...form,tier:Number(e.target.value)})} className="block border rounded-lg p-2"><option value={1}>Foundation</option><option value={2}>Intermediate</option><option value={3}>Advanced</option></select></label></div>
      <label className="block text-sm font-bold">Question<textarea required value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} className="mt-1 w-full border rounded-xl p-3"/></label>
      {form.options.map((option, i) => <label key={i} className="block text-sm font-bold">Option {String.fromCharCode(65 + i)}<input required value={option} onChange={e => setForm({ ...form, options: form.options.map((v, j) => j === i ? e.target.value : v) })} className="mt-1 w-full border rounded-xl p-3"/></label>)}
      <label className="block text-sm font-bold">Correct answer<select value={form.correct} onChange={e => setForm({ ...form, correct: Number(e.target.value) })} className="mt-1 w-full border rounded-xl p-3">{form.options.map((_, i) => <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>)}</select></label>
      <label className="block text-sm font-bold">Explanation<textarea value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} className="mt-1 w-full border rounded-xl p-3"/></label>
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} className={buttonClass} onClick={() => setForm(null)}>Cancel</button><button disabled={busy} className="bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold disabled:opacity-50">{busy ? 'Saving...' : 'Save question'}</button></div>
    </form></div>}
  </div>;
};
