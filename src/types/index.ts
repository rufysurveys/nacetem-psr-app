export type CadreRank = 
  | 'Permanent Secretary'
  | 'Director (GL 17)'
  | 'Deputy Director (GL 16)'
  | 'Assistant Director (GL 15)'
  | 'Chief Administrative Officer (GL 14)'
  | 'Principal Officer (GL 12)'
  | 'Senior Executive Officer (GL 10)'
  | 'Higher Executive Officer (GL 08)'
  | 'Executive Officer (GL 07)';

export type CompetitionMode = 'intra' | 'inter';

export type MDA = {
  id: string;
  name: string;
  shortName: string;
  code: string;
  category: 'Ministry' | 'Department' | 'Agency' | 'Commission';
  totalParticipants: number;
  aggregateScore: number;
  accuracyRate: number;
  logoBadge?: string;
  internalDepartments?: string[];
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  isVerifiedGov: boolean;
  mdaId: string;
  mdaName: string; // Name of Organization
  department: string;
  cadre: CadreRank;
  avatar: string;
  careerXP: number;
  tier: 'Civil Cadet' | 'Bureau Specialist' | 'Senior Administrator' | 'Grand Chancellor';
  tournamentPasses: number;
  badges: Badge[];
  role: 'user' | 'admin';
};

export type PSRChapter = 
  | 'Chapter 1: Structure & Appointments'
  | 'Chapter 2: Appointments & Career Progression'
  | 'Chapter 3: Discipline & Due Process'
  | 'Chapter 5: Performance Management'
  | 'Chapter 7: Leave & Allowances'
  | 'Chapter 10: Petitions & Appeals'
  | 'Chapter 11: Leave & Allowances'
  | 'Chapter 12: Petitions & Appeals'
  | 'Chapter 13: Procurement & Public Ethics'
  | 'Chapter 15: Promotion & Evaluation';

export type QuestionType = 'single' | 'multiple' | 'boolean' | 'sjt';

export type Question = {
  id: string;
  chapter: PSRChapter | string;
  type: QuestionType;
  title: string;
  scenario?: string;
  options: string[];
  correctAnswer: number | number[];
  explanation: string;
  psrCitation: {
    ruleNumber: string;
    sectionTitle: string;
    excerpt: string;
  };
  weightage: number;
  difficulty: 'Basic' | 'Intermediate' | 'Advanced';
  timeLimitSeconds: number;
};

export type TournamentStageStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'failed';

export type TournamentStage = {
  stageNumber: 1 | 2 | 3;
  name: string;
  subtitle: string;
  format: 'Asynchronous Timed Quiz' | 'Real-Time Knockout Lobby' | 'Situational Judgment SJT';
  totalQuestions: number;
  timePerQuestionSec: number;
  passCriteria: string;
  passPercentage: number;
  description: string;
};

export type Tournament = {
  id: string;
  title: string;
  season: string;
  competitionMode: CompetitionMode;
  targetOrganizationName?: string; // If Intra-Org, specific to this organization
  createdBy: string; // User Name or Admin
  startDate: string;
  endDate: string;
  registrationCutoff: string;
  totalRegistered: number;
  currentStage: 1 | 2 | 3;
  status: 'upcoming' | 'active' | 'completed';
  winnerBadgeTitle: string; // Winner gets this badge
  stages: TournamentStage[];
};

export type QuizAttempt = {
  id: string;
  userId: string;
  tournamentId: string;
  stageNumber: 1 | 2 | 3;
  score: number;
  accuracy: number;
  avgResponseTimeMs: number;
  passed: boolean;
  timestamp: string;
  flaggedAntiCheat: boolean;
  flagReason?: string;
  answers: {
    questionId: string;
    selectedAnswer: number | number[];
    isCorrect: boolean;
    timeSpentSec: number;
  }[];
};

export type AntiCheatLog = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  mdaName: string;
  timestamp: string;
  eventType: 'tab_switch' | 'rapid_guessing' | 'duplicate_ip' | 'pasting_input';
  details: string;
  severity: 'low' | 'medium' | 'high';
};

export type Badge = {
  id: string;
  title: string;
  description: string;
  iconName: string;
  earnedAt?: string;
  category: 'mastery' | 'tournament' | 'ethics' | 'speed' | 'winner';
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  mdaName: string; // Organization Name
  department: string;
  cadre: CadreRank;
  score: number;
  accuracy: number;
  avgTimeSec: number;
  isGovVerified: boolean;
};

export type ChapterAnalytics = {
  chapter: string;
  totalAttempts: number;
  failureRate: number;
  avgScorePercentage: number;
  weakestSubrule: string;
};
