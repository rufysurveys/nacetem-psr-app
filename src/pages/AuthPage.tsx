import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { CadreRank } from '../types';
import { FEDERAL_MINISTRIES_AND_AGENCIES } from '../data/ministriesAndAgencies';
import { supabase, cloudDatabaseService } from '../services/supabase';
import { ShieldCheck, Mail, Building2, User, Sparkles, Zap, Users, Globe, Camera, CheckCircle2, RefreshCw, Lock, LogIn, UserPlus, ExternalLink, AlertCircle } from 'lucide-react';

export const CURATED_AVATARS = [
  { id: 'av-1', title: 'Executive Officer Female', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
  { id: 'av-2', title: 'Director Male', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
  { id: 'av-3', title: 'Senior Executive Female', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200' },
  { id: 'av-4', title: 'Senior Administrative Male', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
  { id: 'av-5', title: 'Chief Officer Female', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200' },
  { id: 'av-6', title: 'Permanent Secretary Male', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200' }
];

export const AuthPage: React.FC = () => {
  const { loginWithDomain, setCompetitionMode } = useStore();

  // Auth Tab: 'signup' vs 'signin'
  const [authTab, setAuthTab] = useState<'signup' | 'signin'>('signup');

  // Multi-step Registration State: 'form' | 'verification_pending' | 'verified_success'
  const [regStep, setRegStep] = useState<'form' | 'verification_pending' | 'verified_success'>('form');

  // --- SIGN UP FORM STATE ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Avatar / Custom Photo Upload State
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(CURATED_AVATARS[0].url);
  const [customPhotoPreview, setCustomPhotoPreview] = useState<string | null>(null);
  const [customPhotoFile, setCustomPhotoFile] = useState<File | null>(null);

  // Dependent Dropdowns: Ministry -> Agency -> Department
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
  const [department, setDepartment] = useState('');
  const [selectedCadre, setSelectedCadre] = useState<CadreRank>('Assistant Director (GL 15)');

  // Form Processing & Errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);

  // --- SIGN IN FORM STATE ---
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);

  // --- EMAIL VERIFICATION STATE ---
  const [isResending, setIsResending] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const handleMinistryChange = (ministryName: string) => {
    setSelectedMinistry(ministryName);
    const minObj = FEDERAL_MINISTRIES_AND_AGENCIES.find(m => m.ministry === ministryName);
    if (minObj && minObj.agencies.length > 0) {
      setSelectedAgency(minObj.agencies[0]);
    } else {
      setSelectedAgency(`${ministryName} Headquarters`);
    }
  };

  // Custom File Image Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCustomPhotoPreview(result);
        setSelectedAvatarUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Listen for Email Confirmation Link Redirects (#access_token=... & type=signup)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('type=signup') || hash.includes('type=recovery')) {
      setRegStep('verified_success');
      // Attempt session fetch
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          const u = data.session.user;
          const meta = u.user_metadata || {};
          const name = meta.full_name || u.email?.split('@')[0] || 'Civil Servant';
          const mda = meta.agency || meta.ministry || 'Federal Civil Service';
          const cadre = meta.cadre || 'Senior Executive Officer (GL 10)';
          const dept = meta.department || 'Administration';
          const avatar = meta.avatar_url || CURATED_AVATARS[0].url;

          setTimeout(() => {
            loginWithDomain(u.email || '', name, mda, cadre, dept, avatar, u.id);
          }, 2000);
        }
      });
    }
  }, [loginWithDomain]);

  // REAL SUPABASE SIGN UP SUBMIT
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    if (!name || !email || !password) {
      setSignUpError('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const redirectUrl = window.location.origin.includes('localhost') 
        ? window.location.origin 
        : 'https://psr-gamification-app.vercel.app';

      // 1. Supabase Auth Sign Up (Triggers real confirmation email dispatch)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name,
            ministry: selectedMinistry,
            agency: selectedAgency,
            department: department || 'Administration',
            cadre: selectedCadre
          }
        }
      });

      if (error) {
        setSignUpError(error.message);
        setIsSubmitting(false);
        return;
      }

      const user = data.user;
      if (!user) {
        setSignUpError('Could not initialize user registration.');
        setIsSubmitting(false);
        return;
      }

      // 2. Upload Custom Profile Photo to Supabase Storage if file selected
      let finalAvatarUrl = customPhotoPreview || selectedAvatarUrl;
      if (customPhotoFile) {
        const uploadedUrl = await cloudDatabaseService.uploadProfilePhoto(user.id, customPhotoFile);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        }
      }

      // 3. Save Profile record in public.profiles table
      const fullOrgName = selectedAgency && selectedAgency !== `${selectedMinistry} Headquarters` 
        ? selectedAgency 
        : selectedMinistry;

      await cloudDatabaseService.upsertProfile({
        user_id: user.id,
        full_name: name,
        email,
        ministry: selectedMinistry,
        agency: fullOrgName,
        department: department || 'Administration',
        cadre: selectedCadre,
        avatar_url: finalAvatarUrl
      });

      // If Supabase auto-confirmed or session is present, log in immediately
      if (data.session) {
        setCompetitionMode('intra_dept');
        loginWithDomain(email, name, fullOrgName, selectedCadre, department || 'Administration', finalAvatarUrl, user.id);
        return;
      }

      // Advance to Real Verification Pending Screen
      setRegStep('verification_pending');
    } catch (err: any) {
      setSignUpError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // REAL SUPABASE RESEND VERIFICATION EMAIL
  const handleResendLink = async () => {
    setIsResending(true);
    setVerificationMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) {
        setVerificationMessage(`Notice: ${error.message}`);
      } else {
        setVerificationMessage(`Verification link successfully dispatched to ${email}!`);
      }
    } catch (e) {
      setVerificationMessage('Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // REAL SUPABASE SIGN IN SUBMIT
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);

    if (!signInEmail || !signInPassword) {
      setSignInError('Please enter your email address and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setSignInError('Your email address has not been verified yet. Please check your inbox and click the verification link.');
        } else {
          setSignInError(error.message);
        }
        setIsSubmitting(false);
        return;
      }

      const user = data.user;
      if (user) {
        // 2. Fetch or create Profile in public.profiles database table
        let profile = await cloudDatabaseService.fetchProfileByUserId(user.id);

        const meta = user.user_metadata || {};
        const finalName = profile?.full_name || meta.full_name || user.email?.split('@')[0] || 'Civil Servant';
        const finalMda = profile?.agency || profile?.ministry || meta.agency || meta.ministry || 'Federal Civil Service';
        const finalCadre = (profile?.cadre || meta.cadre as CadreRank) || 'Senior Executive Officer (GL 10)';
        const finalDept = profile?.department || meta.department || 'Administration';
        const finalAvatar = profile?.avatar_url || meta.avatar_url || CURATED_AVATARS[0].url;

        // Ensure profile exists in DB now that user is authenticated
        if (!profile) {
          await cloudDatabaseService.upsertProfile({
            user_id: user.id,
            full_name: finalName,
            email: user.email || signInEmail,
            ministry: meta.ministry || finalMda,
            agency: finalMda,
            department: finalDept,
            cadre: finalCadre,
            avatar_url: finalAvatar
          });
        }

        setCompetitionMode('intra_dept');
        loginWithDomain(user.email || signInEmail, finalName, finalMda, finalCadre, finalDept, finalAvatar, user.id);
      }
    } catch (err: any) {
      setSignInError(err.message || 'Authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = () => {
    setCompetitionMode('intra_dept');
    loginWithDomain(
      'rufai.abubakar@nacetem.gov.ng', 
      'Abubakar Rufai', 
      'National Centre for Technology Management (NACETEM)', 
      'Assistant Director (GL 15)', 
      'Planning, Programming and Linkages',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      '7558f96c-c978-44b4-874b-124ea47dadb6'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Left Branding Banner */}
        <div className="md:col-span-5 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Federal Civil Service Auth Portal
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">NACETEM Gamification App</h1>
              <p className="text-sm text-emerald-100 mt-2 leading-relaxed">
                Public Service Rules (PSR) Federal Ministries &amp; Agencies Multi-Device Engine.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-emerald-600/40 text-xs text-emerald-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Realtime Cross-Device Matchmaking</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Central Cloud Database</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Global Multi-Location Competition Engine</span>
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

        {/* Right Form - Global Standard Auth Portal */}
        <div className="md:col-span-7 p-6 sm:p-8 space-y-6">
          
          {/* TAB HEADERS: SIGN UP vs SIGN IN */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => {
                setAuthTab('signup');
                setRegStep('form');
              }}
              className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                authTab === 'signup' 
                  ? 'bg-emerald-600 text-white shadow-md font-extrabold' 
                  : 'hover:text-slate-900 text-slate-600'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account (Sign Up)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('signin');
                setRegStep('form');
              }}
              className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                authTab === 'signin' 
                  ? 'bg-emerald-600 text-white shadow-md font-extrabold' 
                  : 'hover:text-slate-900 text-slate-600'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Existing Officer (Sign In)</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* SIGN UP FLOW */}
          {/* ========================================================================= */}
          {authTab === 'signup' && (
            <>
              {regStep === 'form' && (
                <form onSubmit={handleSignUpSubmit} className="space-y-4 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Officer Registration</h2>
                    <p className="text-xs text-slate-500 mt-1">Fill in your profile details. Registration dispatches an official activation email link.</p>
                  </div>

                  {signUpError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{signUpError}</span>
                    </div>
                  )}

                  {/* FULL NAME */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name &amp; Title</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dr. Abubakar Rufai"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>
                  </div>

                  {/* EMAIL & PASSWORD */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address</label>
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

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Account Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PROFILE PHOTO & AVATAR SELECTION */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>Profile Photo &amp; Executive Avatars</span>
                      </span>
                    </label>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Active Photo Preview */}
                      <div className="relative shrink-0">
                        <img
                          src={customPhotoPreview || selectedAvatarUrl}
                          alt="Selected Profile"
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                        />
                      </div>

                      <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold cursor-pointer transition-all">
                          <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Upload Photo from Computer</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[10px] text-slate-400">Photos save to Supabase Storage bucket.</p>
                      </div>
                    </div>

                    {/* Curated Avatars */}
                    <div className="pt-2 border-t border-slate-200">
                      <span className="block text-[11px] font-semibold text-slate-600 mb-2">Or Choose Curated Civil Servant Avatar:</span>
                      <div className="grid grid-cols-6 gap-2">
                        {CURATED_AVATARS.map((av) => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => {
                              setSelectedAvatarUrl(av.url);
                              setCustomPhotoPreview(null);
                              setCustomPhotoFile(null);
                            }}
                            className={`relative rounded-xl overflow-hidden border-2 transition-all p-0.5 ${
                              selectedAvatarUrl === av.url && !customPhotoPreview
                                ? 'border-emerald-600 ring-2 ring-emerald-500/30 scale-105'
                                : 'border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            <img src={av.url} alt={av.title} className="w-full h-10 object-cover rounded-lg" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* MINISTRY & AGENCY DROPDOWNS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Federal Ministry</label>
                      <select
                        value={selectedMinistry}
                        onChange={(e) => handleMinistryChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                      >
                        {FEDERAL_MINISTRIES_AND_AGENCIES.map(m => (
                          <option key={m.ministry} value={m.ministry}>{m.ministry}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Agency / Bureau</label>
                      <select
                        value={selectedAgency}
                        onChange={(e) => setSelectedAgency(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                      >
                        {availableAgencies.map(ag => (
                          <option key={ag} value={ag}>{ag}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* DEPARTMENT & CADRE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Division</label>
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Planning, Programming & Linkages"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Official Cadre / Rank</label>
                      <select
                        value={selectedCadre}
                        onChange={(e) => setSelectedCadre(e.target.value as CadreRank)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                      >
                        <option value="Permanent Secretary">Permanent Secretary</option>
                        <option value="Director (GL 17)">Director (GL 17)</option>
                        <option value="Deputy Director (GL 16)">Deputy Director (GL 16)</option>
                        <option value="Assistant Director (GL 15)">Assistant Director (GL 15)</option>
                        <option value="Chief Administrative Officer (GL 14)">Chief Administrative Officer (GL 14)</option>
                        <option value="Principal Officer (GL 12)">Principal Officer (GL 12)</option>
                        <option value="Senior Executive Officer (GL 10)">Senior Executive Officer (GL 10)</option>
                        <option value="Higher Executive Officer (GL 08)">Higher Executive Officer (GL 08)</option>
                        <option value="Executive Officer (GL 07)">Executive Officer (GL 07)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 border border-emerald-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Register Account &amp; Send Confirmation Email</span>
                  </button>
                </form>
              )}

              {/* VERIFICATION PENDING SCREEN (REAL SUPABASE AUTH EMAIL DISPATCH) */}
              {regStep === 'verification_pending' && (
                <div className="space-y-6 animate-fadeIn text-center py-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                    <Mail className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> SUPABASE AUTH EMAIL DISPATCHED
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 mt-1">Verification Link Sent to Email</h2>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                      We have dispatched an official Supabase confirmation link to your email inbox:
                    </p>
                    <div className="bg-slate-100 text-emerald-800 font-mono font-bold text-xs px-4 py-2 rounded-xl border border-slate-200 inline-block shadow-sm">
                      {email}
                    </div>
                  </div>

                  {verificationMessage && (
                    <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold p-3 rounded-xl text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{verificationMessage}</span>
                    </div>
                  )}

                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4 max-w-md mx-auto text-left shadow-sm">
                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-slate-700">Next Step: Email Confirmation</span>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Open your email provider (Gmail, Yahoo, etc.), find the email from Supabase Auth, and click the confirmation link to activate your account.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('signin');
                          setRegStep('form');
                          setSignInEmail(email);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 border border-emerald-500 mt-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>After Confirming Email: Click Here to Sign In</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-200">
                      <span className="text-slate-500">Didn't receive verification email?</span>
                      <button
                        type="button"
                        onClick={handleResendLink}
                        disabled={isResending}
                        className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                        <span>Resend Email Link</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VERIFIED SUCCESS CONGRATULATIONS SCREEN */}
              {regStep === 'verified_success' && (
                <div className="space-y-6 animate-fadeIn text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-2xl animate-bounce border-4 border-emerald-400">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-2">
                    <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider border border-emerald-300">
                      🎉 REGISTRATION COMPLETE &amp; VERIFIED
                    </span>
                    <h2 className="text-3xl font-black text-slate-900 mt-2">Congratulations! Account Verified</h2>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Your official civil servant officer profile has been verified and registered in the Cloud Database.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('signin');
                        setRegStep('form');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs shadow-lg transition-all border border-emerald-500"
                    >
                      <span>Proceed to Sign In &amp; Dashboard →</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* SIGN IN FLOW */}
          {/* ========================================================================= */}
          {authTab === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Registered Officer Sign In</h2>
                <p className="text-xs text-slate-500 mt-1">Enter your registered email address and password to authenticate via Supabase Auth.</p>
              </div>

              {signInError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{signInError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="officer@agency.gov.ng"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>Sign In to Platform</span>
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
