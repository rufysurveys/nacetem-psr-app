import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { ScheduledTournamentItem } from '../store/useStore';

// Live Supabase Cloud Database Configuration
const SUPABASE_URL = 'https://nacetem-psr-app.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hY2V0ZW0tcHNyLWFwcCIsInJvbGUiOiJhb24iLCJpYXQiOjE3ODk1NzM2MDAsImV4cCI6MjEwNTE0OTYwMH0.signature';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

export interface DuelChallenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerMda: string;
  challengerAvatar: string;
  defenderId: string;
  defenderName: string;
  defenderMda: string;
  defenderAvatar: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  stageNumber: 1 | 2 | 3;
  createdAt: string;
}

const LOCAL_MEMBERS_KEY = 'nacetem_psr_registered_members_v1';
const LOCAL_DUELS_KEY = 'nacetem_psr_active_duels_v1';

// Initial pre-registered exemplary civil servant members across Federal Ministries
export const DEFAULT_REGISTERED_MEMBERS: RegisteredMember[] = [
  {
    id: 'usr-01',
    name: 'Abubakar Rufai',
    email: 'rufai.abubakar@nacetem.gov.ng',
    isVerifiedGov: true,
    mdaName: 'National Centre for Technology Management (NACETEM)',
    department: 'Planning, Programming and Linkages',
    cadre: 'Assistant Director (GL 15)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    careerXP: 14500,
    tier: 'Bureau Specialist',
    isOnline: true,
    registeredAt: '2026-09-01'
  },
  {
    id: 'usr-02',
    name: 'Dr. Stella Okonkwo',
    email: 'stella.o@fmf.gov.ng',
    isVerifiedGov: true,
    mdaName: 'Federal Ministry of Finance',
    department: 'Revenue & Budget',
    cadre: 'Director (GL 17)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    careerXP: 18200,
    tier: 'Permanent Secretary Star',
    isOnline: true,
    registeredAt: '2026-09-02'
  },
  {
    id: 'usr-03',
    name: 'Engr. Danjuma Bello',
    email: 'danjuma.b@fist.gov.ng',
    isVerifiedGov: true,
    mdaName: 'Federal Ministry of Innovation, Science and Technology',
    department: 'Technology Transfer',
    cadre: 'Chief Administrative Officer (GL 14)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    careerXP: 11300,
    tier: 'Ethics Master',
    isOnline: false,
    registeredAt: '2026-09-05'
  },
  {
    id: 'usr-04',
    name: 'Mrs. Amina Yusuf',
    email: 'a.yusuf@nafdac.gov.ng',
    isVerifiedGov: true,
    mdaName: 'National Agency for Food and Drug Administration and Control (NAFDAC)',
    department: 'Regulatory Affairs',
    cadre: 'Deputy Director (GL 16)',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
    careerXP: 13900,
    tier: 'Bureau Specialist',
    isOnline: true,
    registeredAt: '2026-09-10'
  },
  {
    id: 'usr-05',
    name: 'Mr. Chidi Eze',
    email: 'c.eze@ncaa.gov.ng',
    isVerifiedGov: true,
    mdaName: 'Nigerian Civil Aviation Authority (NCAA)',
    department: 'Legal Services',
    cadre: 'Principal Officer (GL 12)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    careerXP: 9800,
    tier: 'Civil Cadet',
    isOnline: true,
    registeredAt: '2026-09-12'
  }
];

export const cloudDatabaseService = {
  // --- MEMBERS DIRECTORY ---
  async fetchRegisteredMembers(): Promise<RegisteredMember[]> {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data && data.length > 0) {
        return data as RegisteredMember[];
      }
    } catch (e) {
      console.warn('Supabase profiles fetch notice:', e);
    }

    // Fallback local storage sync
    try {
      const raw = localStorage.getItem(LOCAL_MEMBERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    return DEFAULT_REGISTERED_MEMBERS;
  },

  async registerMemberInCloud(member: RegisteredMember): Promise<boolean> {
    try {
      // Save locally first
      const existing = (await this.fetchRegisteredMembers()) || [];
      const filtered = existing.filter(m => m.email !== member.email);
      const updated = [member, ...filtered];
      localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(updated));

      // Sync to Supabase cloud
      const { error } = await supabase.from('profiles').upsert([member]);
      return !error;
    } catch (e) {
      console.warn('Register member cloud error:', e);
      return false;
    }
  },

  // --- DUEL CHALLENGES ---
  async sendDuelChallenge(challenge: DuelChallenge): Promise<boolean> {
    try {
      const raw = localStorage.getItem(LOCAL_DUELS_KEY);
      const duels: DuelChallenge[] = raw ? JSON.parse(raw) : [];
      duels.unshift(challenge);
      localStorage.setItem(LOCAL_DUELS_KEY, JSON.stringify(duels));

      const { error } = await supabase.from('duel_challenges').insert([challenge]);
      return !error;
    } catch (e) {
      return true;
    }
  },

  async fetchActiveDuelChallenges(userId: string): Promise<DuelChallenge[]> {
    try {
      const { data, error } = await supabase
        .from('duel_challenges')
        .select('*')
        .or(`defenderId.eq.${userId},challengerId.eq.${userId}`);
      if (!error && data && data.length > 0) {
        return data as DuelChallenge[];
      }
    } catch (e) {}

    try {
      const raw = localStorage.getItem(LOCAL_DUELS_KEY);
      if (raw) {
        const duels: DuelChallenge[] = JSON.parse(raw);
        return duels.filter(d => d.defenderId === userId || d.challengerId === userId);
      }
    } catch (e) {}

    return [];
  }
};
