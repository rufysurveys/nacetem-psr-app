import React, { useState, useMemo } from 'react';
import { useStore, ExtendedCompMode } from '../store/useStore';
import { CadreRank } from '../types';
import { FEDERAL_MINISTRIES_AND_AGENCIES } from '../data/ministriesAndAgencies';
import { ShieldCheck, Mail, Building2, Award, User, ArrowRight, Sparkles, Zap, Users, Globe, ChevronRight } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { loginWithDomain, setCompetitionMode } = useStore();

  const [authMode, setAuthMode] = useState<'sso' | 'email'>('sso');
  const [email, setEmail] = useState('rufai.abubakar@nacetem.gov.ng');
  const [name, setName] = useState('Abubakar Rufai');

  // Dependent Dropdown State: Ministry -> Agency
  const [selectedMinistry, setSelectedMinistry] = useState<string>(
    'Federal Ministry of Innovation, Science and Technology'
  );

  const availableAgencies = useMemo(() => {
    const minObj = FEDERAL_MINISTRIES_AND_AGENCIES.find(m => m.ministry === selectedMinistry);
    return minObj ? minObj.agencies : [];
  }, [selectedMinistry]);

  const [selectedAgency, setSelectedAgency] = useState<string>(
    'National Centre for Technology Management (NACETEM)'
  );
  const [department, setDepartment] = useState('Planning, Programming and Linkages');
  const [selectedCadre, setSelectedCadre] = useState<CadreRank>('Assistant Director (GL 15)');
  const [compMode, setCompMode] = useState<ExtendedCompMode>('intra_dept');

  const cadres: CadreRank[] = [
    'Permanent Secretary',
    'Director (GL 17)',
    'Deputy Director (GL 16)',
    'Assistant Director (GL 15)',
    'Chief Administrative Officer (GL 14)',
    'Principal Officer (GL 12)',
    'Senior Executive Officer (GL 10)',
    'Higher Executive Officer (GL 08)',
    'Executive Officer (GL 07)'
  ];

  const isVerifiedDomain = email.endsWith('.gov.ng') || email.endsWith('.gov') || email.includes('@gov');

  const handleMinistryChange = (ministryName: string) => {
    setSelectedMinistry(ministryName);
    const minObj = FEDERAL_MINISTRIES_AND_AGENCIES.find(m => m.ministry === ministryName);
    if (minObj && minObj.agencies.length > 0) {
      setSelectedAgency(minObj.agencies[0]);
    } else {
      setSelectedAgency(`${ministryName} Headquarters`);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCompetitionMode(compMode);
    const fullOrgName = selectedAgency && selectedAgency !== `${selectedMinistry} Headquarters` 
      ? selectedAgency 
      : selectedMinistry;
      
    loginWithDomain(email, name, fullOrgName, selectedCadre, department);
  };

  const handleDemoSignIn = () => {
    setCompetitionMode('intra_dept');
    loginWithDomain(
      'rufai.abubakar@nacetem.gov.ng', 
      'Abubakar Rufai', 
      'National Centre for Technology Management (NACETEM)', 
      'Assistant Director (GL 15)', 
      'Planning, Programming and Linkages'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Left Branding */}
        <div className="md:col-span-5 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" /> 33 Federal Ministries Loaded
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">NACETEM Gamification App</h1>
              <p className="text-sm text-emerald-100 mt-2 leading-relaxed">
                Exhaustive Federal Ministries & Agencies Championship Engine.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-emerald-600/40 text-xs text-emerald-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Inter-Departmental Challenge (Finance vs HR vs Procurement)</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Individual Officer League</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Inter-Agency National League (NACETEM vs NAFDAC vs FMF)</span>
              </div>
            </div>
          </div>

          <div className="pt-6 relative z-10">
            <button
              onClick={handleDemoSignIn}
              className="w-full bg-white/15 hover:bg-white/25 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all border border-white/20 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-emerald-300" />
              <span>Quick Demo Sign In (NACETEM Officer)</span>
            </button>
          </div>
        </div>

        {/* Right Form */}
        <div className="md:col-span-7 p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Federal Ministry & Agency Registration</h2>
            <p className="text-xs text-slate-500 mt-1">Select your Federal Ministry, then pick your Agency underneath.</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setAuthMode('sso')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                authMode === 'sso' ? 'bg-white text-emerald-700 font-extrabold shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              Gov Domain SSO (@gov.ng)
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('email')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                authMode === 'email' ? 'bg-white text-emerald-700 font-extrabold shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              Email & Password
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            
            {/* 2 Competition Mode Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Preferred League Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCompMode('intra_dept')}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    compMode === 'intra_dept'
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
                    compMode === 'inter_agency'
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name & Rank</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Abubakar Rufai"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Official Government Email</span>
                {isVerifiedDomain && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Verified Domain
                  </span>
                )}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@agency.gov.ng"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* DEPENDENT DROPDOWNS: Ministry -> Agency */}
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              
              {/* Step 1: Select Ministry */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Select Federal Ministry ({FEDERAL_MINISTRIES_AND_AGENCIES.length} Ministries)</span>
                </label>
                <select
                  value={selectedMinistry}
                  onChange={(e) => handleMinistryChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                >
                  {FEDERAL_MINISTRIES_AND_AGENCIES.map((item) => (
                    <option key={item.id} value={item.ministry}>
                      {item.ministry} ({item.agencies.length} Agencies)
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Agency Underneath */}
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Select Agency / Institution Underneath ({availableAgencies.length} Available)</span>
                </label>
                <select
                  value={selectedAgency}
                  onChange={(e) => setSelectedAgency(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
                >
                  <option value={`${selectedMinistry} Headquarters`}>
                    🏢 {selectedMinistry} Headquarters / Main Secretariat
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Department</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Research & Innovation"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cadre Level</label>
                <div className="relative">
                  <Award className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedCadre}
                    onChange={(e) => setSelectedCadre(e.target.value as CadreRank)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    {cadres.map((cadre) => (
                      <option key={cadre} value={cadre}>
                        {cadre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 mt-2"
            >
              <span>Register & Enter Championship</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
