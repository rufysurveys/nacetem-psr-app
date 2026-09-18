import React, { useEffect } from 'react';
import { useStore, ScheduledTournamentItem } from './store/useStore';
import { cloudSyncService } from './services/cloudSync';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { TournamentHub } from './pages/TournamentHub';
import { QuizRunner } from './components/quiz/QuizRunner';
import { KnockoutLobby } from './components/quiz/KnockoutLobby';
import { SJTViewer } from './components/quiz/SJTViewer';
import { PracticeMode } from './pages/PracticeMode';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserProfilePage } from './pages/UserProfilePage';
import { ScheduleTournamentPage } from './pages/ScheduleTournamentPage';
import { RemoteMatchRoom } from './components/quiz/RemoteMatchRoom';
import { Shield } from 'lucide-react';

import { cloudDatabaseService } from './services/supabase';

export const App: React.FC = () => {
  const { user, activePage, setScheduledTournaments } = useStore();

  // Continuous global background cloud sync across all devices (Abuja <-> Lagos) via Supabase
  useEffect(() => {
    const syncTournaments = async () => {
      const dbGames = await cloudDatabaseService.fetchAvailableGames();
      if (dbGames && dbGames.length > 0) {
        const mappedItems: ScheduledTournamentItem[] = dbGames.map(g => ({
          id: g.id,
          title: g.title,
          competitionMode: g.competition_mode,
          targetOrg: g.target_org,
          startDateTime: g.start_datetime,
          cutoffDateTime: g.cutoff_datetime,
          winnerBadgeTitle: '🏆 Championship Winner Badge',
          registeredCount: g.max_players,
          isSubscribed: true,
          createdBy: g.host_id,
          description: g.description || 'Public Service Rules tournament.'
        }));
        setScheduledTournaments(mappedItems);
      }
    };

    syncTournaments();
    const intervalId = setInterval(syncTournaments, 3000);
    return () => clearInterval(intervalId);
  }, [setScheduledTournaments]);

  // FIRST POINT OF CONTACT: Sign Up / Sign In Page if unauthenticated
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-white">
      <div>
        {/* Streamlined Navbar with only essential tabs */}
        <Navbar />

        <main>
          {activePage === 'tournaments' && <TournamentHub />}
          {activePage === 'schedule' && <ScheduleTournamentPage />}
          {activePage === 'remotematch' && <RemoteMatchRoom />}
          {activePage === 'quiz' && <QuizRunner />}
          {activePage === 'knockout' && <KnockoutLobby />}
          {activePage === 'sjt' && <SJTViewer />}
          {activePage === 'practice' && <PracticeMode />}
          {activePage === 'leaderboard' && <LeaderboardPage />}
          {activePage === 'admin' && <AdminDashboard />}
          {activePage === 'profile' && <UserProfilePage />}
        </main>
      </div>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-900">NACETEM Gamification App</span>
            <span>— Public Service Rules (PSR) Gamification Platform</span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <span>Domain Auth Verification: <code className="text-emerald-700 font-mono font-semibold">@gov.ng</code></span>
            <span>Edition: <strong className="text-slate-800">2026 Revision</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
