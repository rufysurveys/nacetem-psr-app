import React from 'react';
import { useStore, ActivePage } from '../store/useStore';
import { BookOpen, BarChart3, LogOut, CheckCircle2, ShieldAlert, Zap, Building2, Globe, Calendar, RefreshCw, Users } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { activePage, setActivePage, user, logout, competitionMode, setCompetitionMode } = useStore();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
    } finally {
      setIsSigningOut(false);
    }
  };

  const essentialNavItems: { id: ActivePage; label: string; icon: React.ReactNode }[] = [
    { id: 'schedule', label: 'Scheduled Tournaments', icon: <Calendar className="w-4 h-4" /> },
    { id: 'practice', label: 'Practice (958 Qs)', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Leaderboards', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'admin', label: 'Admin Portal', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  const modeButtons: { id: typeof competitionMode; label: string; icon: React.ReactNode }[] = [
    { id: 'inter_team', label: 'Inter-Team', icon: <Users className="w-4 h-4" /> },
    { id: 'intra_dept', label: 'Intra-Agency', icon: <Building2 className="w-4 h-4" /> },
    { id: 'inter_agency', label: 'Inter-Agency', icon: <Globe className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">
      {/* Row 1: brand + account */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActivePage('schedule')}
          className="flex items-center gap-3 cursor-pointer group min-w-0"
        >
          <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-amber-500 p-0.5 shadow-lg group-hover:scale-105 transition-transform overflow-hidden ring-2 ring-emerald-500/20">
            <img src="/icon.png" alt="NACETEM PSR Championship Logo" className="w-full h-full object-cover rounded-[10px]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-title text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide leading-none whitespace-nowrap">
                PSR <span className="text-emerald-600">Quest</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                Official PSR 958
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em] mt-1 whitespace-nowrap">
              powered by NACETEM
            </p>
          </div>
        </div>

        {/* User Profile */}
        {user ? (
          <div className="flex items-center gap-3 shrink-0">
            <div 
              onClick={() => setActivePage('profile')}
              className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full cursor-pointer hover:border-emerald-500 hover:shadow-sm transition-all whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">{user.careerXP} XP</span>
              {user.isVerifiedGov && (
                <span title="Verified Member">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </span>
              )}
            </div>

            <img
              src={user.avatar}
              alt={user.name}
              title="View profile"
              onClick={() => setActivePage('profile')}
              className="w-9 h-9 rounded-full ring-2 ring-emerald-500/30 object-cover cursor-pointer hover:ring-emerald-600 transition-all"
            />
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSigningOut ? <RefreshCw className="w-4 h-4 animate-spin text-rose-600" /> : <LogOut className="w-4 h-4" />}
            </button>
          </div>
        ) : null}
      </div>

      {/* Row 2: page navigation + competition mode */}
      <div className="border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-6">

          {/* Essential Navigation Items */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {essentialNavItems.filter(item => item.id !== 'admin' || user?.role === 'admin').map((item) => {
              const isActive = activePage === item.id || 
                (item.id === 'schedule' && (activePage === 'quiz' || activePage === 'knockout' || activePage === 'sjt' || activePage === 'remotematch'));

              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Competition Mode Switcher Toggle (3 Modes) */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Scope:</span>
            <div role="radiogroup" aria-label="Competition scope" className="flex flex-1 lg:flex-initial items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {modeButtons.map((mode) => (
              <button
                key={mode.id}
                role="radio"
                aria-checked={competitionMode === mode.id}
                onClick={() => setCompetitionMode(mode.id)}
                className={`flex flex-1 lg:flex-initial items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  competitionMode === mode.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <span className="hidden sm:inline-flex">{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
