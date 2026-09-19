import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
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

import { supabase, cloudDatabaseService } from './services/supabase';

export const App: React.FC = () => {
  const { user, activePage, loginWithDomain, updateUserProfile, logout } = useStore();
  const [access, setAccess] = useState<{ userId: string; active: boolean; is_admin: boolean } | null>(null);
  const [accessError, setAccessError] = useState('');
  const [accessRetry, setAccessRetry] = useState(0);

  useEffect(() => {
    if (!user) { setAccess(null); return; }
    let alive = true;
    const checkAccess = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!alive) return;
      if (!session.session) {
        setAccess({ userId: user.id, active: true, is_admin: false }); // Practice demo; protected RPCs still require login.
        return;
      }
      const { data, error } = await supabase.rpc('app_get_access').abortSignal(AbortSignal.timeout(15000));
      if (!alive) return;
      if (error) { setAccessError('Unable to verify account access. Please retry.'); return; }
      setAccessError('');
      setAccess({ userId: user.id, active: session.session.user.id === user.id && data.active, is_admin: data.is_admin });
    };
    void checkAccess();
    const timer = setInterval(checkAccess, 30000);
    window.addEventListener('focus', checkAccess);
    return () => { alive = false; clearInterval(timer); window.removeEventListener('focus', checkAccess); };
  }, [user?.id, accessRetry]);

  useEffect(() => {
    if (access?.userId === user?.id && user) {
      const role = access?.is_admin ? 'admin' : 'user';
      if (user.role !== role) updateUserProfile({ role });
    }
  }, [access, user?.id, user?.role, updateUserProfile]);

  // 1. Automatic Supabase Auth Session Recovery on Mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        cloudDatabaseService.fetchProfileByUserId(u.id).then(profile => {
          if (useStore.getState().user?.id === u.id) return;
          if (profile) {
            loginWithDomain(
              profile.email,
              profile.full_name,
              profile.agency || profile.ministry,
              profile.cadre,
              profile.department,
              profile.avatar_url,
              u.id
            );
          }
        });
      }
    });
  }, [loginWithDomain]);

  // 2. Continuous global background cloud sync across all devices via Supabase -> dbGames
  const { fetchCloudGames } = useStore();
  useEffect(() => {
    const syncTournaments = async () => {
      try {
        await fetchCloudGames();
      } catch (err) {
        console.warn('App background sync notice:', err);
      }
    };

    if (!user) return;
    void syncTournaments();
    const channel = supabase.channel('scheduled-competitions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, syncTournaments)
      .subscribe(status => { if (status === 'SUBSCRIBED') void syncTournaments(); });
    const intervalId = setInterval(syncTournaments, 10000);
    const onFocus = () => void syncTournaments();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      void supabase.removeChannel(channel);
    };
  }, [fetchCloudGames, user?.id]);

  // FIRST POINT OF CONTACT: Sign Up / Sign In Page if unauthenticated
  if (!user) {
    return <AuthPage />;
  }

  if (!access || access.userId !== user.id || !access.active || accessError) {
    return <div className="max-w-xl mx-auto my-20 bg-white border rounded-3xl p-8 space-y-4 text-center">
      <h1 className="text-xl font-bold">{accessError ? 'Connection needs attention' : access?.userId === user.id && !access.active ? 'Account access unavailable' : 'Checking your account...'}</h1>
      <p>{accessError || (access?.userId === user.id && !access.active ? 'Your account has been suspended or removed. Contact the administrator for help.' : 'Connecting securely to your account.')}</p>
      <button onClick={() => setAccessRetry(n => n + 1)} className="bg-emerald-700 text-white rounded-xl px-4 py-2 mr-3">Retry</button>
      <button onClick={logout} className="underline">Sign out</button>
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-white">
      <div>
        {/* Streamlined Navbar with only essential tabs */}
        <Navbar />

        <main>
          {activePage === 'schedule' && <ScheduleTournamentPage />}
          {activePage === 'remotematch' && <RemoteMatchRoom />}
          {activePage === 'quiz' && <QuizRunner />}
          {activePage === 'knockout' && <KnockoutLobby />}
          {activePage === 'sjt' && <SJTViewer />}
          {activePage === 'practice' && <PracticeMode />}
          {activePage === 'leaderboard' && <LeaderboardPage />}
          {activePage === 'admin' && (access.is_admin ? <AdminDashboard /> : <div className="p-10 text-center">Administrator access required.</div>)}
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
