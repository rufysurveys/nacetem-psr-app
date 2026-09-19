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
  audit: { id: number; actor_name: string; action: string; target_id: string; created_at: string }[];
}
export const getAdminData = (search: string, page: number) => contestRpc<AdminData>('admin_dashboard', { p_search: search, p_question_page: page });
