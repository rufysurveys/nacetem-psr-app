import { supabase, GameRecord } from './supabase';

export interface RoomPlayer {
  user_id: string; full_name: string; department: string; current_score: number;
  connected: boolean; total_accuracy: number | null; rank: number | null;
  life_tokens: number; jackpot_balance: number;
}
export interface RoomState {
  game: GameRecord & { started_at: string | null; question_seconds: number; reveal_seconds: number; engine_version: number; is_proctored: boolean };
  phase: 'lobby' | 'countdown' | 'wheel' | 'wager' | 'answer' | 'reveal' | 'completed' | 'cancelled';
  boundary: string | null;
  round: { round_number: number; section_key: string; sections: string[] } | null;
  lifelines: { used_fifty: boolean; used_peek: boolean; hidden_options: number[] | null; peek: string | null };
  wager: number | null;
  server_now: string;
  question_count: number;
  question: { id: string; question_text: string; options: string[]; question_order: number; opens_at: string; closes_at: string; round_number: number; base_points: number; life_cost: number; rule_ref: string | null; explanation: string | null; correct_option_index: number | null; source_ref: string | null } | null;
  answer: { selected_option: number; is_correct: boolean; points_earned: number; lives_lost: number; wager_delta: number } | null;
  players: RoomPlayer[];
}
export async function contestRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args).abortSignal(AbortSignal.timeout(15000));
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Remote contests need the database update. Ask the administrator to apply migration 004_remote_contests.sql.');
    throw new Error(error.message);
  }
  return data as T;
}
export function getRoomState(gameId: string, clientId: string) {
  return contestRpc<RoomState>('remote_room_state', { p_game_id: gameId, p_client_id: clientId });
}
export function remainingSeconds(deadline: string, serverTimeMs: number): number {
  return Math.max(0, Math.ceil((Date.parse(deadline) - serverTimeMs) / 1000));
}
