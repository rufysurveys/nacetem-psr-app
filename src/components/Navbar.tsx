import React from 'react';
import { useStore, ActivePage } from '../store/useStore';
import { Shield, Trophy, BookOpen, BarChart3, LogOut, CheckCircle2, ShieldAlert, Zap, Building2, Globe, Calendar } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { activePage, setActivePage, user, logout, competitionMode, setCompetitionMode } = useStore();

  const essentialNavItems: { id: ActivePage; label: string; icon: React.ReactNode }[] = [
    { id: 'schedule', label: 'Scheduled Tournaments', icon: <Calendar className="w-4 h-4" /> },
    { id: 'practice', label: 'Practice (958 Qs)', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Leaderboards', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'admin', label: 'Admin Portal', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActivePage('schedule')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 p-0.5 shadow-md group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">NACETEM <span className="text-emerald-600">Gamification App</span></span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Official PSR 958
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Public Service Rules Championship</p>
          </div>
        </div>

        {/* Competition Mode Switcher Toggle (Clean 2 Modes) */}
        <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setCompetitionMode('intra_dept')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              competitionMode === 'intra_dept'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Intra-Agency (Inter-Dept)</span>
          </button>

          <button
            onClick={() => setCompetitionMode('inter_agency')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
              competitionMode === 'inter_agency'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Inter-Agency</span>
          </button>
        </div>

        {/* Essential Navigation Items */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {essentialNavItems.filter(item => item.id !== 'admin' || user?.role === 'admin').map((item) => {
            const isActive = activePage === item.id || 
              (item.id === 'schedule' && (activePage === 'quiz' || activePage === 'knockout' || activePage === 'sjt' || activePage === 'remotematch'));

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        {user ? (
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setActivePage('profile')}
              className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full cursor-pointer hover:border-emerald-500 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">{user.careerXP} XP</span>
              {user.isVerifiedGov && (
                <span title="Verified Member">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <img
                src={user.avatar}
                alt={user.name}
                onClick={() => setActivePage('profile')}
                className="w-9 h-9 rounded-full ring-2 ring-emerald-500/30 object-cover cursor-pointer hover:ring-emerald-600 transition-all"
              />
              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}

      </div>
    </header>
  );
};
