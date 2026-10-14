import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck, RefreshCw, Users, Calendar, BookOpen, ClipboardList, Plus, Download, PauseCircle, X, LayoutGrid, Table2, CheckCircle2, Search, MoreVertical, Link2, Video, Ban, Trash2, RotateCcw, Lock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AdminData, AdminGame, AdminMember, AdminQuestion, AuditCategory, AuditEntry, AuditLog, QuestionStatus, getAdminData, getAuditLog } from '../services/admin';
import { contestRpc } from '../services/remoteContest';
import { copyTournamentLink } from '../services/roomLinks';
import { ProctorReview } from '../components/quiz/ProctorPanel';

type Tab = 'members' | 'games' | 'questions' | 'audit';
type QuestionForm = { id: string | null; text: string; chapter: string; options: string[]; correct: number; explanation: string; section: string; rule: string; excerpt: string; kind: 'quiz' | 'scenario'; tier: number; source: string };
const emptyQuestion = (): QuestionForm => ({ id: null, text: '', chapter: '', options: ['', '', '', ''], correct: 0, explanation: '', section:'',rule:'',excerpt:'',kind:'quiz',tier:1,source:'' });
const buttonClass = 'border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold hover:bg-slate-100 disabled:opacity-40';
const pillClass = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset';
const memberStatus = (m: AdminMember) => m.deleted_at ? 'Deleted' : m.suspended ? 'Suspended' : 'Active';
const statusPill = { Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Suspended: 'bg-amber-50 text-amber-800 ring-amber-200', Deleted: 'bg-rose-50 text-rose-700 ring-rose-200' };
const questionStatus = (q: AdminQuestion): QuestionStatus => q.is_archived ? 'archived' : q.section_key?.trim() ? 'active' : 'draft';
const questionStatusPill: Record<QuestionStatus, string> = { active: 'bg-emerald-50 text-emerald-700 ring-emerald-200', draft: 'bg-amber-50 text-amber-800 ring-amber-200', archived: 'bg-slate-100 text-slate-600 ring-slate-300' };
const QuestionTags: React.FC<{ q: AdminQuestion }> = ({ q }) => <div className="flex flex-wrap gap-1.5">
  {q.chapter && <span className={`${pillClass} bg-emerald-700 text-white ring-emerald-700`}>{q.chapter}</span>}
  {q.section_key?.trim() && <span className={`${pillClass} bg-indigo-600 text-white ring-indigo-600`}>{q.section_key}</span>}
</div>;
const readQuestionView = (): 'cards' | 'table' => { try { return localStorage.getItem('admin-question-view') === 'table' ? 'table' : 'cards'; } catch { return 'cards'; } };
const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
const downloadCsv = (name: string, rows: (string | null | undefined)[][]) => {
  const blob = new Blob([rows.map(r => r.map(v => csvCell(v || '')).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${name}-${new Date().toISOString().slice(0, 10)}.csv` });
  link.click(); URL.revokeObjectURL(link.href);
};
const exportMembersCsv = (members: AdminMember[]) => downloadCsv('psr-members', [['Name', 'Email', 'Agency', 'Department / Unit', 'Role', 'Status'],
  ...members.map(m => [m.full_name, m.email, m.agency, m.department, m.role, memberStatus(m)])]);

type GameBucket = 'all' | 'active' | 'scheduled' | 'completed' | 'cancelled' | 'deleted';
const gameBucket = (g: AdminGame): Exclude<GameBucket, 'all'> => g.deleted_at ? 'deleted'
  : g.status === 'active' ? 'active' : g.status === 'completed' ? 'completed' : g.status === 'cancelled' ? 'cancelled' : 'scheduled';
const gameBuckets: [GameBucket, string][] = [['all', 'All'], ['active', 'Active'], ['scheduled', 'Scheduled'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['deleted', 'Deleted']];
const gameStatusPill: Record<Exclude<GameBucket, 'all'>, string> = {
  active: 'bg-emerald-600 text-white ring-emerald-600', scheduled: 'bg-sky-50 text-sky-700 ring-sky-200', completed: 'bg-slate-100 text-slate-700 ring-slate-300',
  cancelled: 'bg-amber-50 text-amber-800 ring-amber-200', deleted: 'bg-rose-50 text-rose-700 ring-rose-200',
};
const gameScopes: Record<AdminGame['competition_mode'], { label: string; pill: string }> = {
  inter_team: { label: 'Inter-Team', pill: 'bg-violet-50 text-violet-700 ring-violet-200' },
  intra_dept: { label: 'Intra-Agency', pill: 'bg-teal-50 text-teal-700 ring-teal-200' },
  inter_agency: { label: 'Inter-Agency', pill: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
};
const menuItemClass = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 disabled:opacity-40';
const auditActions: Record<string, string> = {
  member_suspend: 'Suspended member', member_resume: 'Resumed member access', member_delete: 'Deleted member', member_restore: 'Restored member',
  member_make_admin: 'Granted administrator access', member_make_member: 'Removed administrator access',
  game_delete: 'Deleted tournament', game_restore: 'Restored tournament', game_cancel: 'Cancelled tournament',
  question_create: 'Created question', question_update: 'Edited question', question_archive: 'Archived question', question_restore: 'Restored question',
};
const auditCategories: [AuditCategory, string][] = [['deletion', 'Deletions and cancellations'], ['permission', 'Permission changes'], ['access', 'Suspensions and access'], ['restore', 'Restorations'], ['content', 'Content edits']];
type Severity = 'critical' | 'warning' | 'routine';
const auditSeverity = (action: string): Severity =>
  ['member_delete', 'member_make_admin', 'game_delete'].includes(action) ? 'critical'
  : ['member_suspend', 'member_make_member', 'game_cancel', 'question_archive'].includes(action) ? 'warning' : 'routine';
const severityStyle: Record<Severity, { border: string; pill: string; label: string }> = {
  critical: { border: 'border-l-rose-500', pill: 'bg-rose-50 text-rose-700 ring-rose-200', label: 'Critical' },
  warning: { border: 'border-l-amber-400', pill: 'bg-amber-50 text-amber-800 ring-amber-200', label: 'Warning' },
  routine: { border: 'border-l-slate-200', pill: 'bg-slate-50 text-slate-600 ring-slate-200', label: 'Routine' },
};
const targetTypes: Record<AuditEntry['target_type'], { label: string; pill: string }> = {
  member: { label: 'Member', pill: 'bg-sky-50 text-sky-700 ring-sky-200' },
  game: { label: 'Tournament', pill: 'bg-violet-50 text-violet-700 ring-violet-200' },
  question: { label: 'Question', pill: 'bg-teal-50 text-teal-700 ring-teal-200' },
};
const auditTitle = (a: AuditEntry) => auditActions[a.action] || a.action.split('_').join(' ');
const exportAuditCsv = (entries: AuditEntry[]) => downloadCsv('psr-admin-activity', [
  ['Date and time (UTC)', 'Administrator', 'Administrator email', 'Action', 'Activity type', 'Severity', 'Target type', 'Target', 'Target detail', 'Target ID', 'Log ID'],
  ...entries.map(a => [a.created_at, a.actor_name || 'Administrator', a.actor_email, auditTitle(a), auditCategories.find(([c]) => c === a.category)?.[1],
    severityStyle[auditSeverity(a.action)].label, targetTypes[a.target_type]?.label || a.target_type, a.target_label || 'Record no longer available', a.target_detail, a.target_id, String(a.id)])]);

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
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [questionView, setQuestionView] = useState<'cards' | 'table'>(readQuestionView);
  const [questionFilter, setQuestionFilter] = useState('');
  const [questionStatusFilter, setQuestionStatusFilter] = useState<QuestionStatus | 'all'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActor, setAuditActor] = useState('');
  const [auditCategory, setAuditCategory] = useState<AuditCategory | ''>('');
  const [auditLimit, setAuditLimit] = useState(100);
  const [audit, setAudit] = useState<AuditLog | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const auditSequence = useRef(0);
  const [gameFilter, setGameFilter] = useState<GameBucket>('all');
  const [gameMenu, setGameMenu] = useState<string | null>(null);
  const sequence = useRef(0);
  const mutation = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    try { const next = await getAdminData(search, page, questionFilter, questionStatusFilter); if (request === sequence.current) { setData(next); setError(''); } }
    catch (e) { if (request === sequence.current) setError(e instanceof Error ? e.message : 'Could not load admin data'); }
    finally { if (request === sequence.current) setLoading(false); }
  }, [search, page, questionFilter, questionStatusFilter]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 250); return () => { clearTimeout(timer); sequence.current++; }; }, [refresh]);
  // Reloads with the filters, and after every dashboard refresh so new admin actions appear.
  useEffect(() => {
    if (tab !== 'audit') return;
    const request = ++auditSequence.current;
    setAuditLoading(true);
    const timer = setTimeout(() => void getAuditLog(auditSearch, auditActor, auditCategory, auditLimit)
      .then(next => { if (request === auditSequence.current) { setAudit(next); setError(''); } })
      .catch(e => { if (request === auditSequence.current) setError(e instanceof Error ? e.message : 'Could not load admin activity'); })
      .finally(() => { if (request === auditSequence.current) setAuditLoading(false); }), 250);
    return () => { clearTimeout(timer); auditSequence.current++; };
  }, [tab, auditSearch, auditActor, auditCategory, auditLimit, data]);
  const exportAudit = async () => {
    setExporting(true); setError('');
    try {
      const all = await getAuditLog(auditSearch, auditActor, auditCategory, 5000);
      exportAuditCsv(all.entries);
      setNotice(all.total > all.entries.length ? `Exported the latest ${all.entries.length} of ${all.total} matching records. Narrow the filters to export older activity.` : `Exported ${all.entries.length} activity record${all.entries.length === 1 ? '' : 's'}.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not export admin activity'); }
    finally { setExporting(false); }
  };

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
  const agencies = useMemo(() => {
    const counts = new Map<string, number>();
    data?.members.forEach(m => m.agency && counts.set(m.agency, (counts.get(m.agency) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [data]);
  const members = useMemo(() => (data?.members || []).filter(m => agencyFilter === 'all' || m.agency === agencyFilter), [data, agencyFilter]);
  const parentAgency = agencyFilter !== 'all' ? agencyFilter : agencies.length === 1 ? agencies[0] : 'All agencies';
  const selectedMembers = members.filter(m => selected.has(m.user_id));
  const suspendable = selectedMembers.filter(m => m.user_id !== user?.id && !m.deleted_at && !m.suspended);
  const allSelected = members.length > 0 && selectedMembers.length === members.length;
  // Drop selections that are no longer visible (search, agency filter or refresh).
  useEffect(() => setSelected(prev => {
    const ids = new Set(members.map(m => m.user_id));
    const next = new Set([...prev].filter(id => ids.has(id)));
    return next.size === prev.size ? prev : next;
  }), [members]);
  const toggleMember = (id: string) => setSelected(prev => { const next = new Set(prev); if (!next.delete(id)) next.add(id); return next; });
  const bulkSuspend = async () => {
    const count = suspendable.length, skipped = selectedMembers.length - count, plural = count === 1 ? '' : 's';
    if (await act('admin_bulk_member_action', { p_user_ids: suspendable.map(m => m.user_id), p_action: 'suspend' }, `${count} member${plural} suspended.`,
      `Suspend app access for ${count} selected member${plural}?${skipped ? ` ${skipped} already suspended, deleted or your own account will be skipped.` : ''}`)) setSelected(new Set());
  };
  const gameCounts = useMemo(() => {
    const counts: Record<GameBucket, number> = { all: 0, active: 0, scheduled: 0, completed: 0, cancelled: 0, deleted: 0 };
    data?.games.forEach(g => { counts.all++; counts[gameBucket(g)]++; });
    return counts;
  }, [data]);
  const games = (data?.games || []).filter(g => gameFilter === 'all' || gameBucket(g) === gameFilter);
  // Close the open actions menu on outside click or Escape.
  useEffect(() => {
    if (!gameMenu) return;
    const close = (e: Event) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !(e.target as Element).closest?.('[data-game-menu]')) setGameMenu(null); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [gameMenu]);
  const menuAction = (id: string, action: string, title: string) => { setGameMenu(null); gameAction(id, action, title); };
  const switchQuestionView = (view: 'cards' | 'table') => { setQuestionView(view); try { localStorage.setItem('admin-question-view', view); } catch { /* preference only */ } };
  const archiveQuestion = (q: AdminQuestion) => void act('admin_archive_question', { p_id: q.id, p_archived: !q.is_archived }, q.is_archived ? 'Question restored.' : 'Question archived.', q.is_archived ? undefined : 'Archive this question so future contests cannot select it?');
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-xl font-bold">Members ({members.length})</h2><p className="text-sm font-semibold text-emerald-800">{parentAgency}</p>
            <p className="text-sm text-slate-500">Delete blocks access and preserves history. Restore brings the member back. Showing up to 500 matches; use search to find anyone.</p></div>
          {agencies.length > 1 && <label className="text-xs font-bold text-slate-600">Agency<select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} className="mt-1 block max-w-xs border rounded-lg p-2 text-sm font-normal">
            <option value="all">All agencies</option>{agencies.map(a => <option key={a} value={a}>{a}</option>)}</select></label>}
        </div>
        {selectedMembers.length > 0 && <div role="toolbar" aria-label="Bulk member actions" className="sticky top-16 z-30 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-950 text-white px-4 py-3 shadow-lg">
          <span className="text-sm font-bold">{selectedMembers.length} selected</span>
          <button className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20 disabled:opacity-40" disabled={busy || !suspendable.length} onClick={() => void bulkSuspend()}><PauseCircle size={16}/>Suspend selected</button>
          <button className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20" onClick={() => exportMembersCsv(selectedMembers)}><Download size={16}/>Export CSV</button>
          <button className="ml-auto flex items-center gap-1 text-xs font-bold text-emerald-100 hover:text-white" onClick={() => setSelected(new Set())}><X size={16}/>Clear selection</button>
        </div>}
        {!members.length && <p>No matching members.</p>}
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b">
          <th className="p-3 w-10"><input type="checkbox" aria-label="Select all members" className="h-4 w-4 accent-emerald-700" checked={allSelected}
            ref={el => { if (el) el.indeterminate = selectedMembers.length > 0 && !allSelected; }} onChange={() => setSelected(allSelected ? new Set() : new Set(members.map(m => m.user_id)))}/></th>
          <th className="p-3">Member</th><th className="p-3">Department / Unit</th><th className="p-3">Access</th><th className="p-3">Actions</th></tr></thead><tbody>{members.map(m => <tr key={m.user_id} className={`border-b align-top ${selected.has(m.user_id) ? 'bg-emerald-50/60' : ''}`}>
          <td className="p-3"><input type="checkbox" aria-label={`Select ${m.full_name}`} className="h-4 w-4 accent-emerald-700" checked={selected.has(m.user_id)} onChange={() => toggleMember(m.user_id)}/></td>
          <td className="p-3"><strong>{m.full_name}</strong><p className="text-slate-500">{m.email}</p></td>
          <td className="p-3" title={m.agency}>{m.department || '—'}</td>
          <td className="p-3"><div className="flex flex-wrap gap-1.5">{m.role === 'admin' && <span className={`${pillClass} bg-indigo-50 text-indigo-700 ring-indigo-200`}><ShieldCheck size={12}/>Admin</span>}
            <span className={`${pillClass} ${statusPill[memberStatus(m)]}`}>{memberStatus(m)}</span></div></td>
          <td className="p-3"><div className="flex flex-wrap gap-2">{m.user_id === user?.id ? <span className="text-slate-500">Your administrator account</span> : m.deleted_at ? <button className={buttonClass} disabled={busy} onClick={() => memberAction(m.user_id, 'restore', m.full_name)}>Restore member</button> : <>
            <button className={buttonClass} disabled={busy} onClick={() => memberAction(m.user_id, m.suspended ? 'resume' : 'suspend', m.full_name)}>{m.suspended ? 'Resume access' : 'Suspend'}</button>
            <button className={buttonClass} disabled={busy} onClick={() => memberAction(m.user_id, m.role === 'admin' ? 'make_member' : 'make_admin', m.full_name)}>{m.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>
            <button className={`${buttonClass} text-rose-700`} disabled={busy} onClick={() => memberAction(m.user_id, 'delete', m.full_name)}>Delete member</button>
          </>}</div></td>
        </tr>)}</tbody></table></div>
      </section>}
      {tab === 'games' && <section className="space-y-4">
        <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Tournaments ({data.games.length})</h2><button className={buttonClass} onClick={() => setActivePage('schedule')}>Schedule a tournament</button></div>
        <div role="tablist" aria-label="Filter tournaments by status" className="flex flex-wrap gap-2">{gameBuckets.map(([bucket, label]) => {
          const selected = gameFilter === bucket;
          return <button key={bucket} role="tab" aria-selected={selected} onClick={() => setGameFilter(bucket)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold ${selected ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
            {label}<span className={`rounded-full px-2 py-0.5 text-xs ${selected ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{gameCounts[bucket]}</span></button>;
        })}</div>
        {!games.length && <p className="bg-white border p-6 rounded-xl text-center text-slate-500">{data.games.length ? 'No tournaments with this status.' : 'No matching tournaments.'}</p>}
        <div className="grid md:grid-cols-2 gap-4">{games.map(g => {
          const bucket = gameBucket(g), scope = gameScopes[g.competition_mode], ended = ['completed', 'cancelled'].includes(g.status);
          return <article key={g.id} className={`bg-white border rounded-2xl p-5 space-y-3 ${g.deleted_at ? 'opacity-75' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`${pillClass} capitalize ${gameStatusPill[bucket]}`}>{bucket === 'scheduled' && g.status !== 'scheduled' ? g.status : bucket}</span>
                  {scope && <span className={`${pillClass} ${scope.pill}`}>{scope.label}</span>}
                  {g.is_proctored && <span className={`${pillClass} bg-slate-50 text-slate-700 ring-slate-300`}><Lock size={11}/>Proctored</span>}
                </div>
                <h3 className="font-bold text-lg leading-snug">{g.title}</h3>
              </div>
              <div className="relative shrink-0" data-game-menu>
                <button aria-label={`Actions for ${g.title}`} aria-haspopup="menu" aria-expanded={gameMenu === g.id} onClick={() => setGameMenu(gameMenu === g.id ? null : g.id)}
                  className="rounded-lg border border-transparent p-1.5 text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800"><MoreVertical size={18}/></button>
                {gameMenu === g.id && <div role="menu" className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border bg-white py-1 shadow-lg">
                  {g.deleted_at ? <button role="menuitem" className={menuItemClass} disabled={busy} onClick={() => menuAction(g.id, 'restore', g.title)}><RotateCcw size={16}/>Restore tournament</button> : <>
                    {!ended && <button role="menuitem" className={`${menuItemClass} text-amber-800`} disabled={busy} onClick={() => menuAction(g.id, 'cancel', g.title)}><Ban size={16}/>Cancel contest</button>}
                    <button role="menuitem" className={`${menuItemClass} text-rose-700`} disabled={busy} onClick={() => menuAction(g.id, 'delete', g.title)}><Trash2 size={16}/>Delete tournament</button>
                  </>}
                </div>}
              </div>
            </div>
            <p className="text-sm">Host: {g.host_name || 'No host assigned'} · {g.participant_count} participants (including host)</p><p className="text-sm text-slate-500">{new Date(g.start_datetime).toLocaleString()} · {g.target_org}</p>
            {g.deleted_at ? <p className="text-xs text-slate-500">Deleted {new Date(g.deleted_at).toLocaleString()}. Restore it from the actions menu.</p> : <div className="flex flex-wrap gap-2">
              <button className={`${buttonClass} flex items-center gap-1.5`} onClick={() => void copyRoom(g.id)}><Link2 size={14}/>Copy room link</button>
              <button className={`${buttonClass} flex items-center gap-1.5 ${reviewGame === g.id ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : ''}`} aria-pressed={reviewGame === g.id} onClick={() => setReviewGame(reviewGame === g.id ? null : g.id)}><Video size={14}/>Review proctoring</button>
            </div>}
          </article>;
        })}</div>
        {reviewGame && <div className="bg-white border rounded-2xl p-5"><ProctorReview gameId={reviewGame}/></div>}
      </section>}
      {tab === 'questions' && <section className="space-y-4">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Shared contest question bank ({data.question_total})</h2><p className="text-sm text-slate-500">Changes apply to future contests. Started matches keep their original questions. Drafts have no wheel section yet, so contests cannot select them.</p></div><button className={buttonClass} onClick={() => setForm(emptyQuestion())}><Plus size={16} className="inline mr-1"/>Add question</button></div>
        <div className="flex flex-wrap items-end gap-3 bg-white border rounded-2xl p-3">
          <label className="text-xs font-bold text-slate-600">Chapter / section<select value={questionFilter} onChange={e => { setQuestionFilter(e.target.value); setPage(0); }} className="mt-1 block max-w-xs border rounded-lg p-2 text-sm font-normal bg-white">
            <option value="">All chapters and sections</option>
            {!!data.question_filters?.chapters.length && <optgroup label="Chapters">{data.question_filters.chapters.map(c => <option key={c} value={`chapter:${c}`}>{c}</option>)}</optgroup>}
            {!!data.question_filters?.sections.length && <optgroup label="Wheel sections">{data.question_filters.sections.map(c => <option key={c} value={`section:${c}`}>{c}</option>)}</optgroup>}
          </select></label>
          <label className="text-xs font-bold text-slate-600">Status<select value={questionStatusFilter} onChange={e => { setQuestionStatusFilter(e.target.value as QuestionStatus | 'all'); setPage(0); }} className="mt-1 block border rounded-lg p-2 text-sm font-normal bg-white">
            <option value="all">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
          </select></label>
          {(questionFilter || questionStatusFilter !== 'all') && <button className="text-xs font-bold text-emerald-800 underline pb-2.5" onClick={() => { setQuestionFilter(''); setQuestionStatusFilter('all'); setPage(0); }}>Clear filters</button>}
          <div role="group" aria-label="Question view" className="ml-auto inline-flex rounded-lg border bg-slate-100 p-1">
            {([['cards', 'Card view', LayoutGrid], ['table', 'Table view', Table2]] as const).map(([view, label, Icon]) => <button key={view} aria-pressed={questionView === view} title={label} onClick={() => switchQuestionView(view)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold ${questionView === view ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Icon size={16}/>{label}</button>)}
          </div>
        </div>
        {!data.questions.length && <p className="bg-white border rounded-2xl p-6 text-center text-slate-500">No matching questions.</p>}
        {questionView === 'cards' ? data.questions.map(q => <article key={q.id} className="bg-white border rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><QuestionTags q={q}/><span className={`${pillClass} capitalize ${questionStatusPill[questionStatus(q)]}`}>{questionStatus(q)}</span></div>
          <h3 className="font-bold">{q.question_text}</h3>
          <ol className="space-y-2 text-sm">{q.options.map((option, i) => {
            const correct = i === q.correct_option_index;
            return <li key={i} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${correct ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'border-slate-200'}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${correct ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{String.fromCharCode(65 + i)}</span>
              <span className={`flex-1 pt-0.5 ${correct ? 'font-semibold' : ''}`}>{option}</span>
              {correct && <CheckCircle2 size={20} className="shrink-0 text-emerald-600" aria-label="Correct answer"/>}
            </li>;
          })}</ol>
          <div className="flex gap-2"><button className={buttonClass} disabled={busy} onClick={() => editQuestion(q)}>Edit question</button><button className={buttonClass} disabled={busy} onClick={() => archiveQuestion(q)}>{q.is_archived ? 'Restore question' : 'Archive question'}</button></div>
        </article>) : !!data.questions.length && <div className="overflow-x-auto bg-white border rounded-2xl"><table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600"><tr className="border-b"><th className="p-3">Question</th><th className="p-3">Chapter / section</th><th className="p-3">Type</th><th className="p-3">Correct answer</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{data.questions.map(q => <tr key={q.id} className="border-b align-top hover:bg-slate-50">
            <td className="p-3 min-w-[18rem] max-w-md"><p className="font-semibold text-slate-900 line-clamp-2" title={q.question_text}>{q.question_text}</p>{q.rule_ref && <p className="mt-0.5 text-slate-500">{q.rule_ref}</p>}</td>
            <td className="p-3 min-w-[10rem]"><QuestionTags q={q}/></td>
            <td className="p-3 whitespace-nowrap">{q.question_kind === 'scenario' ? 'Scenario' : 'Quiz'} · Tier {q.challenge_tier || 1}</td>
            <td className="p-3 min-w-[12rem]"><p className="line-clamp-2" title={q.options[q.correct_option_index]}><span className="font-bold text-emerald-700">{String.fromCharCode(65 + q.correct_option_index)}.</span> {q.options[q.correct_option_index]}</p></td>
            <td className="p-3"><span className={`${pillClass} capitalize ${questionStatusPill[questionStatus(q)]}`}>{questionStatus(q)}</span></td>
            <td className="p-3"><div className="flex gap-1.5"><button className={buttonClass} disabled={busy} onClick={() => editQuestion(q)}>Edit</button><button className={buttonClass} disabled={busy} onClick={() => archiveQuestion(q)}>{q.is_archived ? 'Restore' : 'Archive'}</button></div></td>
          </tr>)}</tbody>
        </table></div>}
        <div className="flex items-center justify-center gap-4"><button className={buttonClass} disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(data.question_total / 25))}</span><button className={buttonClass} disabled={(page + 1) * 25 >= data.question_total || loading} onClick={() => setPage(p => p + 1)}>Next</button></div>
      </section>}
      {tab === 'audit' && <section className="bg-white border rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-[16rem]"><h2 className="text-xl font-bold">Administrator activity{audit ? ` (${audit.total})` : ''}</h2><p className="text-sm text-slate-500">Every member, tournament and question change made by an administrator. Red marks deletions and admin access grants; amber marks suspensions, cancellations and archives.</p></div>
          <button className={`${buttonClass} flex items-center gap-1.5`} disabled={exporting || !audit?.total} onClick={() => void exportAudit()}><Download size={16}/>{exporting ? 'Exporting...' : 'Export logs'}</button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="relative flex-1 min-w-[14rem]"><span className="sr-only">Search admin activity</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={auditSearch} onChange={e => { setAuditSearch(e.target.value); setAuditLimit(100); }} placeholder="Search by administrator, member, tournament, question or record ID..." className="w-full border rounded-lg py-2 pl-9 pr-3 text-sm"/></label>
          <label className="text-xs font-bold text-slate-600">Administrator<select value={auditActor} onChange={e => { setAuditActor(e.target.value); setAuditLimit(100); }} className="mt-1 block max-w-[14rem] border rounded-lg p-2 text-sm font-normal bg-white">
            <option value="">All administrators</option>{audit?.actors.map(a => <option key={a.actor_id} value={a.actor_id}>{a.actor_name}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">Action type<select value={auditCategory} onChange={e => { setAuditCategory(e.target.value as AuditCategory | ''); setAuditLimit(100); }} className="mt-1 block border rounded-lg p-2 text-sm font-normal bg-white">
            <option value="">All actions</option>{auditCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {(auditSearch || auditActor || auditCategory) && <button className="text-xs font-bold text-emerald-800 underline pb-2.5" onClick={() => { setAuditSearch(''); setAuditActor(''); setAuditCategory(''); setAuditLimit(100); }}>Clear filters</button>}
        </div>
        {!audit ? <p className="p-6 text-center text-slate-500">Loading administrator activity...</p> : !audit.entries.length ? <p className="p-6 text-center text-slate-500">No matching administrator activity.</p> :
        <ul className={`space-y-2 ${auditLoading ? 'opacity-60' : ''}`}>{audit.entries.map(a => {
          const severity = severityStyle[auditSeverity(a.action)], target = targetTypes[a.target_type];
          return <li key={a.id} className={`border border-l-4 ${severity.border} rounded-xl p-4 text-sm`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2"><strong className="text-slate-900">{auditTitle(a)}</strong>
                {target && <span className={`${pillClass} ${target.pill}`}>{target.label}</span>}
                {severity.label !== 'Routine' && <span className={`${pillClass} ${severity.pill}`}>{severity.label}</span>}</div>
              <time dateTime={a.created_at} className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</time>
            </div>
            <p className="mt-1.5 text-slate-800">{a.target_label ? <span className="font-semibold">{a.target_label}</span> : <span className="italic text-slate-500">Record no longer available</span>}
              {a.target_detail && <span className="text-slate-500"> · {a.target_detail}</span>}</p>
            <p className="mt-1 text-xs text-slate-500">By {a.actor_name || 'Administrator'}{a.actor_email ? ` (${a.actor_email})` : ''} · <span className="font-mono" title={a.target_id}>ID {a.target_id.slice(0, 8)}</span></p>
          </li>;
        })}</ul>}
        {audit && audit.entries.length < audit.total && <div className="text-center"><button className={buttonClass} disabled={auditLoading} onClick={() => setAuditLimit(l => Math.min(l + 100, 5000))}>Show older activity ({audit.total - audit.entries.length} more)</button></div>}
      </section>}
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
