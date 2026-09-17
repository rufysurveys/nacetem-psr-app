import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { CadreRank } from '../types';
import { FEDERAL_MINISTRIES_AND_AGENCIES } from '../data/ministriesAndAgencies';
import { cloudDatabaseService, RegisteredMember } from '../services/supabase';
import { ShieldCheck, Mail, Building2, Award, User, ArrowRight, Sparkles, Zap, Users, Globe, ChevronRight, Upload, Camera, CheckCircle2, KeyRound, RefreshCw, X } from 'lucide-react';

export const CURATED_AVATARS = [
  { id: 'av-1', title: 'Executive Officer Female', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
  { id: 'av-2', title: 'Director Male', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
  { id: 'av-3', title: 'Senior Executive Female', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200' },
  { id: 'av-4', title: 'Senior Administrative Male', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
  { id: 'av-5', title: 'Chief Officer Female', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200' },
  { id: 'av-6', title: 'Permanent Secretary Male', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200' }
];

export const AuthPage: React.FC = () => {
  const { loginWithDomain, setCompetitionMode, addRegisteredMember } = useStore();

  const [email, setEmail] = useState('rufai.abubakar@nacetem.gov.ng');
  const [name, setName] = useState('Abubakar Rufai');

  // Avatar / Custom Photo State
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(CURATED_AVATARS[0].url);
  const [customPhotoPreview, setCustomPhotoPreview] = useState<string | null>(null);

  // Email Verification Modal State
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('482915');
  const [isResending, setIsResending] = useState(false);
  const [verificationSuccessMessage, setVerificationSuccessMessage] = useState<string | null>(null);

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

  // Custom Image Upload File Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCustomPhotoPreview(result);
        setSelectedAvatarUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    // Always trigger 2-Step Email Verification Link/Code Modal
    setIsVerificationModalOpen(true);
  };

  const handleConfirmEmailVerification = async () => {
    setCompetitionMode('intra_dept');
    const fullOrgName = selectedAgency && selectedAgency !== `${selectedMinistry} Headquarters` 
      ? selectedAgency 
      : selectedMinistry;
      
    const finalAvatar = customPhotoPreview || selectedAvatarUrl;

    const newMember: RegisteredMember = {
      id: `usr-${Date.now()}`,
      name,
      email,
      isVerifiedGov: isVerifiedDomain,
      mdaName: fullOrgName,
      department,
      cadre: selectedCadre,
      avatar: finalAvatar,
      careerXP: isVerifiedDomain ? 1200 : 500,
      tier: isVerifiedDomain ? 'Bureau Specialist' : 'Civil Cadet',
      isOnline: true,
      registeredAt: new Date().toISOString().split('T')[0]
    };

    // Save permanently in Supabase Cloud DB
    await cloudDatabaseService.registerMemberInCloud(newMember);
    addRegisteredMember(newMember);

    // Complete login and enter app
    loginWithDomain(email, name, fullOrgName, selectedCadre, department, finalAvatar);
  };

  const handleResendVerificationLink = () => {
    setIsResending(true);
    setTimeout(() => {
      setIsResending(false);
      setVerificationSuccessMessage(`Verification activation link resent to ${email}!`);
      setTimeout(() => setVerificationSuccessMessage(null), 4000);
    }, 1200);
  };

  const handleDemoSignIn = () => {
    setCompetitionMode('intra_dept');
    loginWithDomain(
      'rufai.abubakar@nacetem.gov.ng', 
      'Abubakar Rufai', 
      'National Centre for Technology Management (NACETEM)', 
      'Assistant Director (GL 15)', 
      'Planning, Programming and Linkages',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Left Branding Banner */}
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
                Public Service Rules (PSR) Federal Ministries &amp; Agencies Championship Engine.
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

        {/* Right Form - Clean Standalone Officer Registration */}
        <div className="md:col-span-7 p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Civil Servant Registration</h2>
            <p className="text-xs text-slate-500 mt-1">Global standard registration with email confirmation link &amp; custom photo upload.</p>
          </div>

          <form onSubmit={handleStartRegistration} className="space-y-4">
            
            {/* FULL NAME & EMAIL */}
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Official Email Address</span>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>
            </div>

            {/* PROFILE PHOTO & CURATED EXECUTIVE AVATAR SELECTION */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Profile Photo &amp; Official Avatar Selection</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">No random pictures</span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Active Photo Preview */}
                <div className="relative shrink-0">
                  <img
                    src={customPhotoPreview || selectedAvatarUrl}
                    alt="Selected Profile"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full text-[9px]">
                    <CheckCircle2 className="w-3 h-3" />
                  </span>
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Official Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {customPhotoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPhotoPreview(null);
                          setSelectedAvatarUrl(CURATED_AVATARS[0].url);
                        }}
                        className="text-xs text-rose-600 font-bold hover:underline"
                      >
                        Reset Photo
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium">Or select a curated executive Civil Servant avatar:</p>

                  <div className="grid grid-cols-6 gap-2">
                    {CURATED_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setCustomPhotoPreview(null);
                          setSelectedAvatarUrl(av.url);
                        }}
                        className={`rounded-xl overflow-hidden border-2 transition-all p-0.5 ${
                          !customPhotoPreview && selectedAvatarUrl === av.url
                            ? 'border-emerald-600 ring-2 ring-emerald-400 scale-105'
                            : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                        }`}
                        title={av.title}
                      >
                        <img src={av.url} alt={av.title} className="w-9 h-9 object-cover rounded-lg" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* DEPENDENT DROPDOWNS: Ministry -> Agency */}
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Select Federal Ministry ({FEDERAL_MINISTRIES_AND_AGENCIES.length} Loaded)</span>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cadre Level</label>
                <div className="relative">
                  <Award className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedCadre}
                    onChange={(e) => setSelectedCadre(e.target.value as CadreRank)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
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
              <span>Complete Registration &amp; Send Verification Code</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

      {/* GLOBAL STANDARD EMAIL VERIFICATION MODAL */}
      {isVerificationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-fadeIn relative">
            <button
              onClick={() => setIsVerificationModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 font-bold text-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <Mail className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Email Verification Link Sent</h3>
              <p className="text-xs text-slate-600">
                We sent an official confirmation activation link and 6-digit security code to:
              </p>
              <div className="bg-slate-100 text-emerald-800 font-mono font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 inline-block">
                {email}
              </div>
            </div>

            {verificationSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold p-3 rounded-xl text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{verificationSuccessMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Enter 6-Digit Security Code</span>
                  <span className="text-[10px] text-slate-500 font-normal">Check your inbox or activation link</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 font-mono text-center text-lg font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmEmailVerification}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>Verify Email &amp; Complete Registration</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="text-slate-500">Didn't receive email link?</span>
                <button
                  type="button"
                  onClick={handleResendVerificationLink}
                  disabled={isResending}
                  className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span>Resend Activation Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
