import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Tournament } from '../types';
import { ExtendedCompMode } from '../store/useStore';
import { FEDERAL_MINISTRIES_AND_AGENCIES } from '../data/ministriesAndAgencies';
import { X, Trophy, Building2, Globe, Award, ChevronRight, Users } from 'lucide-react';
import { cloudDatabaseService } from '../services/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleTournamentModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, addTournament, tournaments } = useStore();

  const [title, setTitle] = useState('');
  const [competitionMode, setCompMode] = useState<ExtendedCompMode>('intra_dept');
  
  const [selectedMinistry, setSelectedMinistry] = useState(
    'Federal Ministry of Innovation, Science and Technology'
  );

  const availableAgencies = useMemo(() => {
    const minObj = FEDERAL_MINISTRIES_AND_AGENCIES.find(m => m.ministry === selectedMinistry);
    return minObj ? minObj.agencies : [];
  }, [selectedMinistry]);

  const [selectedAgency, setSelectedAgency] = useState(
    'National Centre for Technology Management (NACETEM)'
  );

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('2026-10-31');
  const [winnerBadge, setWinnerBadge] = useState('🥇 Intra-Org Inter-Dept Champion Badge');

  if (!isOpen) return null;

  const handleMinistryChange = (minName: string) => {
    setSelectedMinistry(minName);
    const minObj = FEDERAL_MINISTRIES_AND_AGENCIES.find(m => m.ministry === minName);
    if (minObj && minObj.agencies.length > 0) {
      setSelectedAgency(minObj.agencies[0]);
    } else {
      setSelectedAgency(`${minName} Headquarters`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetOrg = selectedAgency && selectedAgency !== `${selectedMinistry} Headquarters` ? selectedAgency : selectedMinistry;
    const tournTitle = title || `${targetOrg} Championship`;

    const newTournament: Tournament = {
      id: `tourn-${Date.now()}`,
      title: tournTitle,
      season: `${competitionMode === 'inter_agency' ? 'National Inter-Agency' : 'Intra-Org'} League 2026`,
      competitionMode: competitionMode === 'inter_agency' ? 'inter' : 'intra',
      targetOrganizationName: competitionMode !== 'inter_agency' ? targetOrg : undefined,
      createdBy: user?.name || 'Administrator',
      startDate: `${startDate}T09:00:00Z`,
      endDate: `${endDate}T17:00:00Z`,
      registrationCutoff: `${startDate}T23:59:59Z`,
      totalRegistered: 1,
      currentStage: 1,
      status: 'active',
      winnerBadgeTitle: winnerBadge || '🏆 Championship Winner Badge',
      stages: tournaments[0]?.stages || []
    };

    addTournament(newTournament);

    // Persist game directly to Supabase Cloud DB for cross-device sync
    try {
      if (!user?.id) {
        alert('You must be signed in to schedule a competition.');
        return;
      }

      await cloudDatabaseService.createGame({
        host_id: user.id,
        title: tournTitle,
        competition_mode: competitionMode === 'inter_agency' ? 'inter_agency' : 'intra_dept',
        target_org: targetOrg,
        start_datetime: `${startDate}T09:00:00Z`,
        cutoff_datetime: `${startDate}T23:59:59Z`,
        max_players: 50,
        status: 'scheduled',
        description: `Official competition hosted by ${user.name}`
      });
    } catch (err: any) {
      console.error('Modal create game error:', err);
      alert(`Could not create tournament in central database: ${err.message}`);
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Schedule New Competition</h3>
              <p className="text-xs text-slate-500">Scheduler: <strong className="text-emerald-700">{user?.name}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Competition Mode Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select League Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCompMode('intra_dept')}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  competitionMode === 'intra_dept'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="block text-[11px] font-bold">🏢 Intra-Agency Challenge</span>
                <span className="text-[9px] text-slate-500 font-normal">Inter-Dept & Peer Matchups</span>
              </button>

              <button
                type="button"
                onClick={() => setCompMode('inter_agency')}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  competitionMode === 'inter_agency'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="block text-[11px] font-bold">🌐 Inter-Agency Championship</span>
                <span className="text-[9px] text-slate-500 font-normal">National All-Agencies</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Competition Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. NACETEM Inter-Departmental Challenge"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* DEPENDENT MINISTRY -> AGENCY SELECTOR */}
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">1. Target Ministry</label>
              <select
                value={selectedMinistry}
                onChange={(e) => handleMinistryChange(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
              >
                {FEDERAL_MINISTRIES_AND_AGENCIES.map((item) => (
                  <option key={item.id} value={item.ministry}>
                    {item.ministry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">2. Target Agency Underneath</label>
              <select
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              >
                <option value={`${selectedMinistry} Headquarters`}>
                  🏢 {selectedMinistry} Headquarters
                </option>
                {availableAgencies.map((agency, idx) => (
                  <option key={idx} value={agency}>
                    🏛️ {agency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Winner Badge Reward</label>
            <div className="relative">
              <Award className="absolute left-3 top-2.5 w-4 h-4 text-emerald-600" />
              <input
                type="text"
                required
                value={winnerBadge}
                onChange={(e) => setWinnerBadge(e.target.value)}
                placeholder="e.g. 🥇 NACETEM Champion Badge"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs shadow"
            >
              Schedule & Launch Competition
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
