import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Trophy, Building2, CheckCircle2, Filter, Globe, Users } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { leaderboard, mdas, competitionMode, setCompetitionMode, user } = useStore();

  const [activeTab, setActiveTab] = useState<'individual' | 'department'>('individual');
  const [filterCadre, setFilterCadre] = useState<string>('All');

  // Filter individual officer rankings based on Competition Mode
  const filteredLeaderboard = leaderboard.filter(item => {
    if (competitionMode === 'intra_dept') {
      if (user && item.mdaName !== user.mdaName) return false;
    }
    if (filterCadre !== 'All' && item.cadre !== filterCadre) return false;
    return true;
  });

  // Calculate Inter-Departmental Aggregate Scores for User's Organization
  const currentOrg = mdas.find(m => m.name === user?.mdaName) || mdas[0];
  const departments = currentOrg.internalDepartments || ['Planning, Programming and Linkages', 'Research & Innovation', 'Finance & Accounts'];

  const departmentStandings = departments.map((deptName, idx) => {
    const deptMembers = leaderboard.filter(e => e.mdaName === user?.mdaName && e.department.includes(deptName));
    const totalXP = deptMembers.reduce((acc, m) => acc + m.score, 0) + (8500 - idx * 600);
    const avgAcc = deptMembers.length > 0 
      ? Math.round(deptMembers.reduce((acc, m) => acc + m.accuracy, 0) / deptMembers.length)
      : 88 - idx * 2;
    return {
      rank: idx + 1,
      departmentName: deptName,
      totalOfficers: Math.max(deptMembers.length, 12 + idx * 4),
      totalXP,
      avgAcc
    };
  });

  departmentStandings.sort((a, b) => b.totalXP - a.totalXP);
  departmentStandings.forEach((d, idx) => d.rank = idx + 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Competition Mode Switcher (2 Clean Modes) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
            {competitionMode === 'inter_agency' ? <Globe className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              {competitionMode === 'intra_dept' ? `${user?.mdaName} Intra-Agency Championship` : 'National Inter-Agency Standings'}
            </h2>
            <p className="text-xs text-slate-500">
              {competitionMode === 'intra_dept' ? `Departmental & Officer battle inside ${user?.mdaName}` : 'Nationwide standings ranking all organizations'}
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setCompetitionMode('intra_dept')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              competitionMode === 'intra_dept'
                ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Intra-Agency Challenge</span>
          </button>

          <button
            onClick={() => setCompetitionMode('inter_agency')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              competitionMode === 'inter_agency'
                ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Inter-Agency</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-emerald-200 text-xs font-bold mb-2">
            <Trophy className="w-3.5 h-3.5" />
            <span>
              {competitionMode === 'intra_dept' ? `${user?.mdaName} Intra-Agency Championship` : 'National Civil Service Championship'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold">Competitive Leaderboards</h1>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            {competitionMode === 'intra_dept'
              ? `Compare total aggregate XP earned by internal departments inside ${user?.mdaName}`
              : `Compete for the Winner Badge and climb your organization's rankings`
            }
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-white/15 p-1 rounded-2xl border border-white/20 text-xs font-bold">
          {competitionMode === 'inter_agency' ? (
            <>
              <button
                onClick={() => setActiveTab('department')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'department' ? 'bg-white text-emerald-800 font-extrabold shadow' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Inter-Agency Rankings</span>
              </button>
              <button
                onClick={() => setActiveTab('individual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'individual' ? 'bg-white text-emerald-800 font-extrabold shadow' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>All Officers</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('department')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'department' ? 'bg-white text-emerald-800 font-extrabold shadow' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Inter-Departmental Rankings</span>
              </button>
              <button
                onClick={() => setActiveTab('individual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'individual' ? 'bg-white text-emerald-800 font-extrabold shadow' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Internal Officers</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* INTER-AGENCY ORGANIZATIONS STANDINGS (For Inter-Agency Mode) */}
      {competitionMode === 'inter_agency' && activeTab === 'department' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              <span>National Inter-Agency Standings Table</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">Rankings across all Federal Ministries & Agencies</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mdas.map((mda, idx) => {
              const isUserAgency = mda.name === user?.mdaName;
              return (
                <div 
                  key={mda.id} 
                  className={`bright-card p-6 rounded-3xl space-y-4 relative overflow-hidden ${
                    isUserAgency ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-lg ${
                      isUserAgency 
                        ? 'bg-emerald-600 text-white' 
                        : idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isUserAgency ? 'YOUR AGENCY • RANK #1' : `AGENCY RANK #${idx + 1}`}
                    </span>
                    <span className="text-xs text-slate-500">{mda.totalParticipants} Officers</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">{mda.name}</h3>
                    <p className="text-xs text-slate-500">{mda.category} • Code: {mda.code}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 text-center gap-2">
                    <div>
                      <span className="block text-xl font-black text-emerald-700">{mda.accuracyRate}%</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Avg Accuracy</span>
                    </div>
                    <div>
                      <span className="block text-xl font-black text-slate-900">{mda.aggregateScore.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Agency XP</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${mda.accuracyRate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : competitionMode === 'intra_dept' && activeTab === 'department' ? (
        /* DEPARTMENTAL BATTLE STANDINGS (For Intra-Org Inter-Dept Mode) */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>{user?.mdaName} Internal Departmental Battle Table</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">Updated live from tournament scores</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {departmentStandings.map((dept) => (
              <div key={dept.departmentName} className="bright-card p-6 rounded-3xl space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-lg ${
                    dept.rank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    DEPT RANK #{dept.rank}
                  </span>
                  <span className="text-xs text-slate-500">{dept.totalOfficers} Officers</span>
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{dept.departmentName} Dept</h3>
                  <p className="text-xs text-slate-500">{user?.mdaName}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 text-center gap-2">
                  <div>
                    <span className="block text-xl font-black text-emerald-700">{dept.avgAcc}%</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Avg Accuracy</span>
                  </div>
                  <div>
                    <span className="block text-xl font-black text-slate-900">{dept.totalXP.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Total Dept XP</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${dept.avgAcc}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* INDIVIDUAL OFFICERS STANDINGS TABLE */
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-700">Filter By Grade Cadre:</span>
              <select
                value={filterCadre}
                onChange={(e) => setFilterCadre(e.target.value)}
                className="bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="All">All Cadres & Salary Grade Levels</option>
                <option value="Director (GL 17)">Director (GL 17)</option>
                <option value="Deputy Director (GL 16)">Deputy Director (GL 16)</option>
                <option value="Assistant Director (GL 15)">Assistant Director (GL 15)</option>
                <option value="Chief Administrative Officer (GL 14)">Chief Administrative Officer (GL 14)</option>
                <option value="Principal Officer (GL 12)">Principal Officer (GL 12)</option>
              </select>
            </div>

            <span className="text-slate-500">
              Showing <strong className="text-emerald-700">{filteredLeaderboard.length}</strong> top ranked officers
            </span>
          </div>

          <div className="bright-card rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Officer Name & Cadre</th>
                    <th className="px-6 py-4">Organization & Dept</th>
                    <th className="px-6 py-4 text-right">Accuracy</th>
                    <th className="px-6 py-4 text-right">Avg Time</th>
                    <th className="px-6 py-4 text-right">Tournament XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeaderboard.map((entry) => (
                    <tr key={entry.userId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-black">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                          entry.rank === 1 ? 'bg-amber-100 text-amber-800 font-black' :
                          entry.rank === 2 ? 'bg-slate-200 text-slate-800 font-bold' :
                          entry.rank === 3 ? 'bg-amber-700 text-white font-bold' : 'text-slate-500'
                        }`}>
                          {entry.rank}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={entry.avatar} alt={entry.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/20" />
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-900">
                              <span>{entry.name}</span>
                              {entry.isGovVerified && (
                                <span title="Verified Member">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">{entry.cadre}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <span className="font-bold text-slate-800 block">{entry.mdaName}</span>
                        <span className="text-slate-500">{entry.department} Dept</span>
                      </td>

                      <td className="px-6 py-4 text-right font-extrabold text-emerald-700">
                        {entry.accuracy}%
                      </td>

                      <td className="px-6 py-4 text-right font-mono text-slate-600 text-xs">
                        {entry.avgTimeSec}s
                      </td>

                      <td className="px-6 py-4 text-right font-black text-amber-600 text-base">
                        {entry.score.toLocaleString()} XP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
