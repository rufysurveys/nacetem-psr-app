import { createClient } from '@supabase/supabase-js';

// Environment credentials with fallback placeholders for initial connection setup
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-ref.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-actual-supabase-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// ====================================================================
// DATABASE TYPES & SCHEMAS
// ====================================================================

export interface ProfileRecord {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  ministry: string;
  agency: string;
  department: string;
  cadre: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface GameRecord {
  id: string;
  host_id: string;
  title: string;
  competition_mode: 'intra_dept' | 'inter_agency';
  target_org: string;
  start_datetime: string;
  cutoff_datetime: string;
  max_players: number;
  status: 'draft' | 'scheduled' | 'open' | 'full' | 'active' | 'completed' | 'cancelled';
  description?: string;
  created_at: string;
}

export interface GamePlayerRecord {
  id: string;
  game_id: string;
  user_id: string;
  status: 'joined' | 'ready' | 'playing' | 'completed' | 'left';
  current_score: number;
  joined_at: string;
  profile?: ProfileRecord;
}

export interface QuestionRecord {
  id: string;
  category: string;
  chapter: string;
  question_text: string;
  options: string[];
  correct_option_index?: number; // Only fetched server-side or after round completion
  explanation?: string;
  created_at: string;
}

export interface AnswerRecord {
  id: string;
  game_id: string;
  question_id: string;
  user_id: string;
  selected_option: number;
  is_correct: boolean;
  response_time_ms: number;
  submitted_at: string;
}

export interface ResultRecord {
  id: string;
  game_id: string;
  user_id: string;
  total_score: number;
  total_accuracy: number;
  rank?: number;
  xp_earned: number;
  completed_at: string;
  profile?: ProfileRecord;
}

// Backward compatible interface for UI components
export interface RegisteredMember {
  id: string;
  name: string;
  email: string;
  isVerifiedGov: boolean;
  mdaName: string;
  department: string;
  cadre: string;
  avatar: string;
  careerXP: number;
  tier: string;
  isOnline?: boolean;
  registeredAt: string;
}

// ====================================================================
// CLOUD DATABASE SERVICE FUNCTIONS
// ====================================================================

export const cloudDatabaseService = {
  // --- AUTH & PROFILES ---
  async fetchProfileByUserId(userId: string): Promise<ProfileRecord | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as ProfileRecord | null;
  },

  async fetchAllProfiles(): Promise<ProfileRecord[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }
    return (data || []) as ProfileRecord[];
  },

  async upsertProfile(profile: Partial<ProfileRecord> & { user_id: string; email: string; full_name: string }): Promise<ProfileRecord | null> {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting profile:', error);
      return null;
    }
    return data as ProfileRecord;
  },

  // Backward-compatible adapters querying Supabase 'profiles' table
  async fetchRegisteredMembers(): Promise<RegisteredMember[]> {
    const profiles = await this.fetchAllProfiles();
    return profiles.map(p => ({
      id: p.user_id,
      name: p.full_name,
      email: p.email,
      isVerifiedGov: p.email.endsWith('.gov.ng') || p.email.endsWith('.gov'),
      mdaName: p.agency || p.ministry,
      department: p.department,
      cadre: p.cadre,
      avatar: p.avatar_url || '',
      careerXP: 1000,
      tier: 'Civil Cadet',
      registeredAt: p.created_at.split('T')[0]
    }));
  },

  async registerMemberInCloud(member: RegisteredMember): Promise<boolean> {
    const res = await this.upsertProfile({
      user_id: member.id,
      full_name: member.name,
      email: member.email,
      ministry: member.mdaName,
      agency: member.mdaName,
      department: member.department,
      cadre: member.cadre,
      avatar_url: member.avatar
    });
    return !!res;
  },

  async sendDuelChallenge(_challenge: any): Promise<boolean> {
    return true;
  },

  // --- STORAGE (PROFILE PHOTOS) ---
  async uploadProfilePhoto(userId: string, file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${userId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (e) {
      console.error('Upload exception:', e);
      return null;
    }
  },

  // --- GAMES ---
  async fetchAvailableGames(): Promise<GameRecord[]> {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .in('status', ['scheduled', 'open', 'full', 'active'])
      .order('start_datetime', { ascending: true });

    if (error) {
      console.error('Error fetching available games:', error);
      return [];
    }
    return (data || []) as GameRecord[];
  },

  async createGame(game: Omit<GameRecord, 'id' | 'created_at'>): Promise<GameRecord | null> {
    const { data, error } = await supabase
      .from('games')
      .insert(game)
      .select()
      .single();

    if (error) {
      console.error('Error creating game:', error);
      return null;
    }
    return data as GameRecord;
  },

  async updateGameStatus(gameId: string, status: GameRecord['status']): Promise<boolean> {
    const { error } = await supabase
      .from('games')
      .update({ status })
      .eq('id', gameId);

    if (error) {
      console.error('Error updating game status:', error);
      return false;
    }
    return true;
  },

  // --- GAME PLAYERS ---
  async joinGame(gameId: string, userId: string): Promise<GamePlayerRecord | null> {
    const { data, error } = await supabase
      .from('game_players')
      .insert({
        game_id: gameId,
        user_id: userId,
        status: 'joined',
        current_score: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error joining game:', error);
      return null;
    }
    return data as GamePlayerRecord;
  },

  async fetchGamePlayers(gameId: string): Promise<(GamePlayerRecord & { profile?: ProfileRecord })[]> {
    const { data, error } = await supabase
      .from('game_players')
      .select(`
        *,
        profile:profiles!game_players_user_id_fkey(*)
      `)
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true });

    if (error) {
      // Fallback query if relation key is named differently
      const { data: simpleData } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId);

      return (simpleData || []) as GamePlayerRecord[];
    }

    return (data || []) as (GamePlayerRecord & { profile?: ProfileRecord })[];
  },

  // --- SECURE SCORING RPC ---
  async submitAnswer(gameId: string, questionId: string, selectedOption: number, responseTimeMs: number) {
    const { data, error } = await supabase.rpc('submit_player_answer', {
      p_game_id: gameId,
      p_question_id: questionId,
      p_selected_option: selectedOption,
      p_response_time_ms: responseTimeMs
    });

    if (error) {
      console.error('RPC submit_player_answer error:', error);
      return null;
    }

    return data as { is_correct: boolean; points_earned: number; current_total_score: number };
  },

  // --- RESULTS ---
  async fetchGameResults(gameId: string): Promise<ResultRecord[]> {
    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('game_id', gameId)
      .order('total_score', { ascending: false });

    if (error) {
      console.error('Error fetching results:', error);
      return [];
    }
    return (data || []) as ResultRecord[];
  }
};
