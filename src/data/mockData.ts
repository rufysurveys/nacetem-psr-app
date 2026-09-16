import { MDA, Question, Tournament, LeaderboardEntry, AntiCheatLog, ChapterAnalytics, UserProfile } from '../types';
import excelQuestions from './excelQuestions.json';
import abubakarAvatar from '../assets/abubakar_rufai.jpg';

export const INITIAL_USER: UserProfile = {
  id: 'usr-001',
  name: 'Abubakar Rufai',
  email: 'rufai.abubakar@nacetem.gov.ng',
  isVerifiedGov: true,
  mdaId: 'mda-nacetem',
  mdaName: 'National Centre for Technology Management (NACETEM)',
  department: 'Planning, Programming and Linkages',
  cadre: 'Assistant Director (GL 15)',
  avatar: abubakarAvatar,
  careerXP: 4850,
  tier: 'Senior Administrator',
  tournamentPasses: 3,
  role: 'user',
  badges: [
    {
      id: 'bdg-01',
      title: 'Ethics Champion',
      description: 'Achieved 100% accuracy in Stage 3 Procurement & Ethics SJT Case Study',
      iconName: 'ShieldCheck',
      earnedAt: '2026-08-15',
      category: 'ethics'
    },
    {
      id: 'bdg-02',
      title: 'Procedural Expert',
      description: 'Mastered disciplinary timeline regulations with zero error rate',
      iconName: 'Award',
      earnedAt: '2026-09-01',
      category: 'mastery'
    },
    {
      id: 'bdg-03',
      title: 'Clean Slate',
      description: 'Completed 10 consecutive Stage 1 Qualifiers without a single violation',
      iconName: 'CheckCircle2',
      earnedAt: '2026-09-10',
      category: 'tournament'
    }
  ]
};

export const INITIAL_MDAS: MDA[] = [
  { id: 'mda-nacetem', name: 'National Centre for Technology Management (NACETEM)', shortName: 'NACETEM', code: 'NACETEM-00', category: 'Agency', totalParticipants: 1650, aggregateScore: 9550, accuracyRate: 91.8, internalDepartments: ['Planning, Programming and Linkages', 'Research & Innovation', 'Technology Transfer & Commercialization', 'Policy Research & Analysis', 'Capacity Building & Training', 'Finance & Accounts', 'Administration & HR'] },
  { id: 'mda-01', name: 'Federal Ministry of Finance', shortName: 'FMF', code: 'FMF-01', category: 'Ministry', totalParticipants: 1420, aggregateScore: 8840, accuracyRate: 84.2, internalDepartments: ['Finance & Admin', 'Revenue & Tax', 'Procurement', 'Accounts'] },
  { id: 'mda-02', name: 'Federal Civil Service Commission', shortName: 'FCSC', code: 'FCSC-02', category: 'Commission', totalParticipants: 980, aggregateScore: 9120, accuracyRate: 89.5, internalDepartments: ['Appointments', 'Discipline & Appeals', 'Promotions'] },
  { id: 'mda-03', name: 'Federal Ministry of Justice', shortName: 'MOJ', code: 'MOJ-03', category: 'Ministry', totalParticipants: 860, aggregateScore: 8450, accuracyRate: 81.0, internalDepartments: ['Legal Drafting', 'Public Prosecution', 'Civil Litigation'] },
  { id: 'mda-04', name: 'Office of the Head of Civil Service', shortName: 'OHCSF', code: 'OHCSF-04', category: 'Department', totalParticipants: 1100, aggregateScore: 9400, accuracyRate: 92.1, internalDepartments: ['Management Services', 'Career Management', 'Staff Welfare'] },
  { id: 'mda-05', name: 'National Food & Drug Agency (NAFDAC)', shortName: 'NAFDAC', code: 'NAFDAC-05', category: 'Agency', totalParticipants: 910, aggregateScore: 8720, accuracyRate: 85.0, internalDepartments: ['Regulatory Affairs', 'Inspectorate', 'Laboratory Services'] },
  { id: 'mda-06', name: 'Central Bank of Nigeria', shortName: 'CBN', code: 'CBN-06', category: 'Agency', totalParticipants: 1250, aggregateScore: 9350, accuracyRate: 90.4, internalDepartments: ['Banking Supervision', 'Monetary Policy', 'Human Resources'] }
];

export const INITIAL_QUESTIONS: Question[] = (excelQuestions as Question[]);

export const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: 'tourn-2026-inter',
    title: '2026 National Inter-Agency Championship',
    season: 'Q3 2026 Inter-Agency League',
    competitionMode: 'inter',
    createdBy: 'Administrator',
    startDate: '2026-09-15T09:00:00Z',
    endDate: '2026-09-30T17:00:00Z',
    registrationCutoff: '2026-09-14T23:59:59Z',
    totalRegistered: 4890,
    currentStage: 1,
    status: 'active',
    winnerBadgeTitle: '🏆 National Inter-Agency Champion Trophy',
    stages: [
      {
        stageNumber: 1,
        name: 'The Qualifier',
        subtitle: 'Preliminary Recall & Speed',
        format: 'Asynchronous Timed Quiz',
        totalQuestions: 20,
        timePerQuestionSec: 15,
        passCriteria: '70% Minimum Score',
        passPercentage: 70,
        description: 'Test core mastery of official PSR definitions, leave rules, discipline classifications, and official acronyms.'
      },
      {
        stageNumber: 2,
        name: 'The Knockout',
        subtitle: 'Intermediate Multiplayer Lobby',
        format: 'Real-Time Knockout Lobby',
        totalQuestions: 15,
        timePerQuestionSec: 15,
        passCriteria: 'Top 30% Rank Advance',
        passPercentage: 70,
        description: 'Compete concurrently against participants from other agencies nationwide.'
      },
      {
        stageNumber: 3,
        name: 'The Grand Finale',
        subtitle: 'Advanced Situational Judgment',
        format: 'Situational Judgment SJT',
        totalQuestions: 10,
        timePerQuestionSec: 30,
        passCriteria: 'Top Overall Aggregate XP',
        passPercentage: 85,
        description: 'High-stakes administrative dilemmas, public procurement ethics, and conflict of interest scenarios.'
      }
    ]
  },
  {
    id: 'tourn-2026-intra',
    title: 'NACETEM Internal League',
    season: 'Q3 2026 Intra-Org League',
    competitionMode: 'intra',
    targetOrganizationName: 'National Centre for Technology Management (NACETEM)',
    createdBy: 'Officer Abubakar Rufai',
    startDate: '2026-09-15T09:00:00Z',
    endDate: '2026-09-30T17:00:00Z',
    registrationCutoff: '2026-09-14T23:59:59Z',
    totalRegistered: 1420,
    currentStage: 1,
    status: 'active',
    winnerBadgeTitle: '🥇 NACETEM Intra-Org Champion Badge',
    stages: [
      {
        stageNumber: 1,
        name: 'Internal Department Qualifier',
        subtitle: 'Departmental Recall',
        format: 'Asynchronous Timed Quiz',
        totalQuestions: 20,
        timePerQuestionSec: 15,
        passCriteria: '70% Minimum Score',
        passPercentage: 70,
        description: 'Internal league testing NACETEM department officers.'
      },
      {
        stageNumber: 2,
        name: 'Intra-Ministry Knockout',
        subtitle: 'Department vs Department Knockout',
        format: 'Real-Time Knockout Lobby',
        totalQuestions: 15,
        timePerQuestionSec: 15,
        passCriteria: 'Top 30% Rank Advance',
        passPercentage: 70,
        description: 'Internal elimination lobby.'
      },
      {
        stageNumber: 3,
        name: 'NACETEM Grand Finale',
        subtitle: 'Internal SJT Championship',
        format: 'Situational Judgment SJT',
        totalQuestions: 10,
        timePerQuestionSec: 30,
        passCriteria: 'Highest Internal XP',
        passPercentage: 85,
        description: 'Internal NACETEM executive decision-making.'
      }
    ]
  }
];

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  // Inter-Agency Competitors (Different Organizations)
  { rank: 1, userId: 'usr-101', name: 'Dr. Olanrewaju Adeyemi', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150', mdaName: 'Office of the Head of Civil Service', department: 'Career Management', cadre: 'Director (GL 17)', score: 9840, accuracy: 98.5, avgTimeSec: 6.2, isGovVerified: true },
  { rank: 2, userId: 'usr-001', name: 'Abubakar Rufai (You)', avatar: abubakarAvatar, mdaName: 'National Centre for Technology Management (NACETEM)', department: 'Planning, Programming and Linkages', cadre: 'Assistant Director (GL 15)', score: 9520, accuracy: 96.0, avgTimeSec: 7.1, isGovVerified: true },
  { rank: 3, userId: 'usr-103', name: 'Chidi Nnamdi', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150', mdaName: 'Federal Civil Service Commission', department: 'Promotions', cadre: 'Assistant Director (GL 15)', score: 9480, accuracy: 95.2, avgTimeSec: 6.8, isGovVerified: true },
  { rank: 4, userId: 'usr-104', name: 'Fatima Abubakar', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150', mdaName: 'National Food & Drug Agency (NAFDAC)', department: 'Regulatory Affairs', cadre: 'Principal Officer (GL 12)', score: 9210, accuracy: 93.8, avgTimeSec: 8.0, isGovVerified: true },
  { rank: 5, userId: 'usr-105', name: 'Emmanuel Okon', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=150', mdaName: 'Federal Ministry of Justice', department: 'Civil Litigation', cadre: 'Deputy Director (GL 16)', score: 9050, accuracy: 91.5, avgTimeSec: 7.5, isGovVerified: true },

  // Intra-Organization Competitors (Same Organization: Federal Ministry of Finance)
  { rank: 6, userId: 'usr-fmf-1', name: 'Kabiru Usman', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150', mdaName: 'Federal Ministry of Finance', department: 'Revenue & Tax', cadre: 'Assistant Director (GL 15)', score: 8940, accuracy: 90.0, avgTimeSec: 7.8, isGovVerified: true },
  { rank: 7, userId: 'usr-fmf-2', name: 'Grace Danjuma', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150', mdaName: 'Federal Ministry of Finance', department: 'Procurement', cadre: 'Principal Officer (GL 12)', score: 8750, accuracy: 88.5, avgTimeSec: 8.2, isGovVerified: true },
  { rank: 8, userId: 'usr-fmf-3', name: 'Ibrahim Sanusi', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150', mdaName: 'Federal Ministry of Finance', department: 'Accounts', cadre: 'Senior Executive Officer (GL 10)', score: 8610, accuracy: 87.0, avgTimeSec: 8.5, isGovVerified: true }
];

export const INITIAL_ANTI_CHEAT_LOGS: AntiCheatLog[] = [
  {
    id: 'log-01',
    userId: 'usr-902',
    userName: 'Kelechi Eze',
    userEmail: 'k.eze@external.com',
    mdaName: 'Ministry of Works & Housing',
    timestamp: '2026-09-15T17:42:10Z',
    eventType: 'tab_switch',
    details: 'User switched browser tab 3 times during Stage 1 Qualifier.',
    severity: 'medium'
  },
  {
    id: 'log-02',
    userId: 'usr-905',
    userName: 'Tunde Bakare',
    userEmail: 'tbakare@temp-mail.org',
    mdaName: 'Federal Ministry of Finance',
    timestamp: '2026-09-15T16:15:22Z',
    eventType: 'rapid_guessing',
    details: 'Answered 5 consecutive questions in less than 0.8s.',
    severity: 'high'
  }
];

export const INITIAL_CHAPTER_ANALYTICS: ChapterAnalytics[] = [
  { chapter: 'Chapter 2: Appointments & Progression', totalAttempts: 4100, failureRate: 28.4, avgScorePercentage: 71.6, weakestSubrule: 'PSR 020801 (Commission Vested Promotion Powers)' },
  { chapter: 'Chapter 3: Discipline & Due Process', totalAttempts: 3420, failureRate: 38.4, avgScorePercentage: 61.6, weakestSubrule: 'PSR 030404 (Interdiction salary entitlement)' },
  { chapter: 'Chapter 13: Procurement & Ethics', totalAttempts: 2950, failureRate: 42.1, avgScorePercentage: 57.9, weakestSubrule: 'PSR 130205 (Conflict of interest recusal)' }
];
