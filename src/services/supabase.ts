import { createClient } from '@supabase/supabase-js';

// Production Supabase Cloud Credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ksothbeqmxguyxygfzeu.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzb3RoYmVxbXhndXl4eWdmemV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTQ0NTMsImV4cCI6MjEwNTIzMDQ1M30.l_1-5oXTboiOYvyVIcBrMMr_ASdApSnUAqsP-LUs2Kc';

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
  host_id: string | null;
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

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export function ensureValidUUID(id?: string): string {
  if (!id) return '00000000-0000-4000-8000-000000000001';
  if (isUUID(id)) return id;
  const hex = Array.from(id).map(c => c.charCodeAt(0).toString(16)).join('').padEnd(12, '0').slice(0, 12);
  return '00000000-0000-4000-8000-' + hex;
}

export const cloudDatabaseService = {
  // --- AUTH & PROFILES ---
  async fetchProfileByUserId(userId: string): Promise<ProfileRecord | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', ensureValidUUID(userId))
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
    const validProfile = {
      ...profile,
      user_id: ensureValidUUID(profile.user_id)
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(validProfile, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Upsert profile notice:', error.message);
    }
    return (data as ProfileRecord) || (validProfile as ProfileRecord);
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
      registeredAt: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
    }));
  },

  async registerMemberInCloud(member: RegisteredMember): Promise<boolean> {
    const res = await this.upsertProfile({
      user_id: ensureValidUUID(member.id),
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
      const filePath = `avatars/${ensureValidUUID(userId)}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.warn('Storage upload notice:', uploadError.message);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (e) {
      console.warn('Upload exception:', e);
      return null;
    }
  },

  // --- GAMES ---
  async fetchAvailableGames(): Promise<GameRecord[]> {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .in('status', ['scheduled', 'open', 'active'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetchAvailableGames error:', error.message);
      throw new Error(`Central Database fetch failed: ${error.message}`);
    }

    return (data || []) as GameRecord[];
  },

  async createGame(game: Omit<GameRecord, 'id' | 'created_at'>): Promise<GameRecord> {
    const isHostPresent = Boolean(game.host_id);
    const validHostId = isHostPresent ? ensureValidUUID(game.host_id!) : null;

    if (validHostId) {
      // 1. Ensure Host Profile exists in public.profiles before FK constraint check
      const existingProfile = await this.fetchProfileByUserId(validHostId);
      if (!existingProfile) {
        await this.upsertProfile({
          user_id: validHostId,
          full_name: 'Civil Servant Officer',
          email: `officer_${validHostId.slice(0, 8)}@gov.ng`,
          ministry: 'Federal Civil Service',
          agency: game.target_org || 'Federal Civil Service Headquarters',
          department: 'Administration',
          cadre: 'Senior Executive Officer (GL 10)'
        });
      }
    }

    const gameToInsert = {
      ...game,
      host_id: validHostId
    };

    // 2. Insert Game into central Supabase database
    const { data, error } = await supabase
      .from('games')
      .insert(gameToInsert)
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase createGame failed:', error?.message);
      throw new Error(`Failed to create tournament in central database: ${error?.message || 'Unknown database error'}`);
    }

    const createdGame = data as GameRecord;

    // 3. Automatically insert Host into game_players relationship table if regular host tournament
    if (validHostId) {
      try {
        await supabase.from('game_players').insert({
          game_id: createdGame.id,
          user_id: validHostId,
          status: 'joined',
          current_score: 0
        });
      } catch (e) {
        console.warn('Host auto-join relationship warning:', e);
      }
    }

    return createdGame;
  },

  async updateGameStatus(gameId: string, status: GameRecord['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('games')
        .update({ status })
        .eq('id', gameId);

      return !error;
    } catch (e) {
      return false;
    }
  },

  // --- GAME PLAYERS ---
  async joinGame(gameId: string, userId: string): Promise<GamePlayerRecord> {
    const validUserId = ensureValidUUID(userId);

    // 1. Check if user is already a joined player in this tournament instance
    const { data: existing } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', validUserId)
      .maybeSingle();

    if (existing) {
      return existing as GamePlayerRecord;
    }

    // 2. Insert player membership record into central database
    const playerToInsert = {
      game_id: gameId,
      user_id: validUserId,
      status: 'joined' as const,
      current_score: 0
    };

    const { data, error } = await supabase
      .from('game_players')
      .insert(playerToInsert)
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase joinGame failed:', error?.message);
      throw new Error(`Failed to join tournament in central database: ${error?.message || 'Database insert error'}`);
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
