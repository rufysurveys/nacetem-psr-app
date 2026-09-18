import { create } from 'zustand';
import { UserProfile, Question, Tournament, LeaderboardEntry, AntiCheatLog, MDA, ChapterAnalytics, QuizAttempt, CompetitionMode } from '../types';
import { INITIAL_USER, INITIAL_QUESTIONS, INITIAL_TOURNAMENTS, INITIAL_LEADERBOARD, INITIAL_ANTI_CHEAT_LOGS, INITIAL_MDAS, INITIAL_CHAPTER_ANALYTICS } from '../data/mockData';
import { cloudSyncService } from '../services/cloudSync';

export type ActivePage = 'tournaments' | 'schedule' | 'remotematch' | 'quiz' | 'knockout' | 'sjt' | 'practice' | 'leaderboard' | 'profile' | 'admin';
export type ExtendedCompMode = 'intra_dept' | 'inter_agency';

export interface ScheduledTournamentItem {
  id: string;
  title: string;
  competitionMode: ExtendedCompMode;
  targetOrg: string;
  startDateTime: string;
  cutoffDateTime: string;
  winnerBadgeTitle: string;
  registeredCount: number;
  isSubscribed: boolean;
  createdBy: string;
  description: string;
}

interface AppState {
  // Navigation & User
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  isAdminMode: boolean;
  setIsAdminMode: (isAdmin: boolean) => void;

  // Competition Mode
  competitionMode: ExtendedCompMode;
  setCompetitionMode: (mode: ExtendedCompMode) => void;

  // Data Collections
  mdas: MDA[];
  questions: Question[];
  tournaments: Tournament[];
  scheduledTournaments: ScheduledTournamentItem[];
  activeTournament: Tournament | null;
  activeStageNumber: 1 | 2 | 3;
  leaderboard: LeaderboardEntry[];
  antiCheatLogs: AntiCheatLog[];
  chapterAnalytics: ChapterAnalytics[];
  userAttempts: QuizAttempt[];

  // Practice & Matchmaking State
  activePracticeChapter: string | null;
  setActivePracticeChapter: (chapter: string | null) => void;
  registeredMembers: any[];
  setRegisteredMembers: (members: any[]) => void;
  addRegisteredMember: (member: any) => void;
  selectedOpponent: any | null;
  setSelectedOpponent: (opponent: any | null) => void;

  // Actions
  loginWithDomain: (email: string, name: string, mdaName: string, cadre: any, department?: string, avatar?: string, userId?: string) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  logout: () => void;
  startTournamentStage: (tournamentId: string, stageNumber: 1 | 2 | 3) => void;
  recordQuizResult: (score: number, accuracy: number, avgTimeMs: number, passed: boolean, answers: any[], stageNumber: 1 | 2 | 3) => void;
  logAntiCheatEvent: (eventType: 'tab_switch' | 'rapid_guessing' | 'duplicate_ip' | 'pasting_input', details: string, severity: 'low' | 'medium' | 'high') => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (question: Question) => void;
  deleteQuestion: (questionId: string) => void;
  addTournament: (tournament: Tournament) => void;
  addScheduledTournament: (item: ScheduledTournamentItem) => void;
  subscribeToTournament: (id: string) => void;
  setScheduledTournaments: (items: ScheduledTournamentItem[]) => void;
}

export const useStore = create<AppState>((set, get) => ({
  activePage: 'tournaments',
  setActivePage: (page) => set({ activePage: page }),
  user: null,
  setUser: (user) => set({ user }),
  isAdminMode: false,
  setIsAdminMode: (isAdmin) => set({ isAdminMode: isAdmin }),

  competitionMode: 'intra_dept',
  setCompetitionMode: (mode) => set({ competitionMode: mode }),

  mdas: INITIAL_MDAS,
  questions: INITIAL_QUESTIONS,
  tournaments: INITIAL_TOURNAMENTS,
  activeTournament: INITIAL_TOURNAMENTS[0],
  activeStageNumber: 1,
  leaderboard: INITIAL_LEADERBOARD,
  antiCheatLogs: INITIAL_ANTI_CHEAT_LOGS,
  chapterAnalytics: INITIAL_CHAPTER_ANALYTICS,
  userAttempts: [],

  activePracticeChapter: null,
  setActivePracticeChapter: (chapter) => set({ activePracticeChapter: chapter }),
  registeredMembers: [],
  setRegisteredMembers: (members) => set({ registeredMembers: members }),
  addRegisteredMember: (member) => set(state => ({ registeredMembers: [member, ...state.registeredMembers] })),
  selectedOpponent: null,
  setSelectedOpponent: (opponent) => set({ selectedOpponent: opponent }),

  loginWithDomain: (email, name, mdaName, cadre, department = 'Administration', avatar, userId) => {
    const isGov = email.endsWith('.gov.ng') || email.endsWith('.gov') || email.includes('@gov');
    const defaultAvatar = avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200';
    const newUser: UserProfile = {
      id: userId || `usr-${Date.now()}`,
      name: name || 'Civil Servant',
      email,
      isVerifiedGov: isGov,
      mdaId: 'mda-custom',
      mdaName: mdaName || 'Federal Ministry of Finance',
      department: department || 'Finance & Administration',
      cadre: cadre || 'Senior Executive Officer (GL 10)',
      avatar: defaultAvatar,
      careerXP: isGov ? 1200 : 500,
      tier: isGov ? 'Bureau Specialist' : 'Civil Cadet',
      tournamentPasses: 3,
      badges: isGov ? [
        {
          id: 'bdg-gov',
          title: 'Verified Member',
          description: `Verified official domain for ${mdaName}`,
          iconName: 'ShieldCheck',
          earnedAt: new Date().toISOString().split('T')[0],
          category: 'ethics'
        }
      ] : [],
      role: 'user'
    };

    set({ user: newUser, activePage: 'tournaments' });
  },

  updateUserProfile: (updates) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updates };
    set({ user: updatedUser });
  },

  logout: () => {
    set({ user: null, activePage: 'tournaments' });
  },

  startTournamentStage: (tournamentId, stageNumber) => {
    const tournament = get().tournaments.find(t => t.id === tournamentId) || get().activeTournament;
    set({
      activeTournament: tournament,
      activeStageNumber: stageNumber,
      activePage: stageNumber === 1 ? 'quiz' : stageNumber === 2 ? 'knockout' : 'sjt'
    });
  },

  recordQuizResult: (score, accuracy, avgTimeMs, passed, answers, stageNumber) => {
    const { user, leaderboard, activeTournament } = get();
    if (!user) return;

    const earnedXP = Math.round(score * (passed ? 1.5 : 0.5));
    const updatedXP = user.careerXP + earnedXP;

    let updatedBadges = [...user.badges];
    if (passed && activeTournament?.winnerBadgeTitle) {
      const alreadyHas = updatedBadges.some(b => b.title === activeTournament.winnerBadgeTitle);
      if (!alreadyHas) {
        updatedBadges.push({
          id: `bdg-winner-${Date.now()}`,
          title: activeTournament.winnerBadgeTitle,
          description: `Awarded for winning ${activeTournament.title}`,
          iconName: 'Trophy',
          earnedAt: new Date().toISOString().split('T')[0],
          category: 'winner'
        });
      }
    }

    const newAttempt: QuizAttempt = {
      id: `att-${Date.now()}`,
      userId: user.id,
      tournamentId: activeTournament?.id || 'tourn-2026-inter',
      stageNumber,
      score,
      accuracy,
      avgResponseTimeMs: avgTimeMs,
      passed,
      timestamp: new Date().toISOString(),
      flaggedAntiCheat: false,
      answers
    };

    const updatedUser: UserProfile = {
      ...user,
      careerXP: updatedXP,
      badges: updatedBadges
    };

    const userIndex = leaderboard.findIndex(e => e.userId === user.id);
    let newLeaderboard = [...leaderboard];
    if (userIndex >= 0) {
      newLeaderboard[userIndex] = {
        ...newLeaderboard[userIndex],
        score: newLeaderboard[userIndex].score + earnedXP,
        accuracy: Math.round((newLeaderboard[userIndex].accuracy + accuracy) / 2)
      };
    } else {
      newLeaderboard.push({
        rank: newLeaderboard.length + 1,
        userId: user.id,
        name: `${user.name} (You)`,
        avatar: user.avatar,
        mdaName: user.mdaName,
        department: user.department,
        cadre: user.cadre,
        score: earnedXP + 8000,
        accuracy,
        avgTimeSec: Math.round(avgTimeMs / 1000 * 10) / 10,
        isGovVerified: user.isVerifiedGov
      });
    }

    newLeaderboard.sort((a, b) => b.score - a.score);
    newLeaderboard = newLeaderboard.map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    set({
      user: updatedUser,
      userAttempts: [newAttempt, ...get().userAttempts],
      leaderboard: newLeaderboard
    });
  },

  logAntiCheatEvent: (eventType, details, severity) => {
    const { user } = get();
    const newLog: AntiCheatLog = {
      id: `log-${Date.now()}`,
      userId: user?.id || 'guest',
      userName: user?.name || 'Guest User',
      userEmail: user?.email || 'unauthenticated',
      mdaName: user?.mdaName || 'Unregistered MDA',
      timestamp: new Date().toISOString(),
      eventType,
      details,
      severity
    };
    set(state => ({ antiCheatLogs: [newLog, ...state.antiCheatLogs] }));
  },

  scheduledTournaments: [
    {
      id: 'sched-01',
      title: '2026 National Inter-Agency Championship',
      competitionMode: 'inter_agency',
      targetOrg: 'National All Agencies',
      startDateTime: '2026-09-25T09:00',
      cutoffDateTime: '2026-09-24T23:59',
      winnerBadgeTitle: '🏆 National Inter-Agency Champion Trophy',
      registeredCount: 4890,
      isSubscribed: true,
      createdBy: 'Administrator',
      description: 'Nationwide public service tournament ranking all federal ministries and agencies.'
    },
    {
      id: 'sched-02',
      title: 'NACETEM Inter-Departmental Challenge Cup',
      competitionMode: 'intra_dept',
      targetOrg: 'National Centre for Technology Management (NACETEM)',
      startDateTime: '2026-09-20T10:00',
      cutoffDateTime: '2026-09-19T23:59',
      winnerBadgeTitle: '🥇 NACETEM Intra-Org Champion Badge',
      registeredCount: 1420,
      isSubscribed: false,
      createdBy: 'Abubakar Rufai',
      description: 'Departmental challenge inside NACETEM testing PPL, Research, Technology Transfer, and Finance officers.'
    }
  ],

  addQuestion: (question) => set(state => ({ questions: [question, ...state.questions] })),

  updateQuestion: (question) => set(state => ({
    questions: state.questions.map(q => q.id === question.id ? question : q)
  })),

  deleteQuestion: (questionId) => set(state => ({
    questions: state.questions.filter(q => q.id !== questionId)
  })),

  addTournament: (tournament) => set(state => ({
    tournaments: [tournament, ...state.tournaments],
    activeTournament: tournament
  })),

  addScheduledTournament: (item) => {
    const updated = [item, ...get().scheduledTournaments];
    set({ scheduledTournaments: updated });
    cloudSyncService.saveLocalTournaments(updated);
    cloudSyncService.publishScheduledTournament(item);
  },

  subscribeToTournament: (id) => {
    let targetItem: ScheduledTournamentItem | null = null;
    const updated = get().scheduledTournaments.map(t => {
      if (t.id === id) {
        targetItem = { ...t, isSubscribed: true, registeredCount: t.registeredCount + 1 };
        return targetItem;
      }
      return t;
    });
    set({ scheduledTournaments: updated });
    cloudSyncService.saveLocalTournaments(updated);
    if (targetItem) {
      cloudSyncService.updateSubscriptionInCloud(id, targetItem);
    }
  },

  setScheduledTournaments: (items) => {
    set({ scheduledTournaments: items });
    cloudSyncService.saveLocalTournaments(items);
  }
}));

