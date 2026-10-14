import { GameRecord, QuestionRecord } from './supabase';
import { contestRpc } from './remoteContest';

export interface AdminMember {
  user_id: string; full_name: string; email: string; agency: string; department: string;
  role: 'member' | 'admin'; suspended: boolean; deleted_at: string | null;
}
export type AdminGame = GameRecord & { deleted_at: string | null; host_name: string; participant_count: number };
export type AdminQuestion = QuestionRecord & { is_archived: boolean; correct_option_index: number; section_key: string | null; rule_ref: string | null; rule_excerpt: string | null; question_kind: 'quiz' | 'scenario'; challenge_tier: number; source_file: string | null };
export interface AdminData {
  members: AdminMember[]; games: AdminGame[]; questions: AdminQuestion[]; question_total: number;
  question_filters: { chapters: string[]; sections: string[] };
  audit: { id: number; actor_name: string; action: string; target_id: string; created_at: string }[];
}
export type AuditCategory = 'deletion' | 'permission' | 'access' | 'restore' | 'content';
export interface AuditEntry {
  id: number; action: string; category: AuditCategory; created_at: string; actor_id: string; actor_name: string | null; actor_email: string | null;
  target_id: string; target_type: 'member' | 'game' | 'question'; target_label: string | null; target_detail: string | null;
}
export interface AuditLog { entries: AuditEntry[]; actors: { actor_id: string; actor_name: string }[]; total: number }
// limit is capped at 5000 by the server (used for exports).
export const getAuditLog = (search: string, actor: string, category: AuditCategory | '', limit: number) =>
  contestRpc<AuditLog>('admin_audit_log', { p_search: search, p_actor: actor || null, p_category: category, p_limit: limit });
export type QuestionStatus = 'active' | 'draft' | 'archived';
// filter: '' (all), 'chapter:<name>' or 'section:<wheel section>'.
export const getAdminData = (search: string, page: number, filter = '', status: QuestionStatus | 'all' = 'all') =>
  contestRpc<AdminData>('admin_dashboard', { p_search: search, p_question_page: page, p_question_filter: filter, p_question_status: status });
