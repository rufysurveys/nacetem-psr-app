import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CadreRank } from '../types';
import { cloudDatabaseService, supabase } from '../services/supabase';
import { CURATED_AVATARS } from '../data/curatedAvatars';
import { ShieldCheck, Award, Building2, CheckCircle2, Clock, Upload, Camera, LogOut, Edit2, Save, X, RefreshCw } from 'lucide-react';

export const UserProfilePage: React.FC = () => {
  const { user, userAttempts, updateUserProfile, logout } = useStore();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
    } finally {
      setIsSigningOut(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [mdaName, setMdaName] = useState(user?.mdaName || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [cadre, setCadre] = useState<CadreRank>(user?.cadre || 'Chief Administrative Officer (GL 14)');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  React.useEffect(() => {
    if (user?.avatar) {
      setAvatar(user.avatar);
    }
  }, [user?.avatar]);

  if (!user) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingPhoto(true);
    setUploadNotice(null);

    try {
      // Upload to durable storage before switching the visible profile photo.
      const uploadedUrl = await cloudDatabaseService.uploadProfilePhoto(user.id, file);
      await cloudDatabaseService.upsertProfile({
        user_id: user.id,
        full_name: user.name,
        email: user.email,
        ministry: user.mdaName,
        agency: user.mdaName,
        department: user.department,
        cadre: user.cadre,
        avatar_url: uploadedUrl
      });
      await supabase.auth.updateUser({
        data: { avatar_url: uploadedUrl }
      });

      setAvatar(uploadedUrl);
      updateUserProfile({ avatar: uploadedUrl });
      setUploadNotice('✓ Profile photo permanently saved to your account database!');
      setTimeout(() => setUploadNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to upload picture:', err);
      setUploadNotice(err.message || 'Failed to upload picture. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);

    try {
      const finalAvatar = await cloudDatabaseService.persistProfilePhoto(user.id, avatar);

      await cloudDatabaseService.upsertProfile({
        user_id: user.id,
        full_name: name,
        email: user.email,
        ministry: mdaName,
        agency: mdaName,
        department,
        cadre,
        avatar_url: finalAvatar
      });

      await supabase.auth.updateUser({
        data: {
          full_name: name,
          agency: mdaName,
          department,
          cadre,
          avatar_url: finalAvatar
        }
      });

      setAvatar(finalAvatar);
      updateUserProfile({ name, mdaName, department, cadre, avatar: finalAvatar });
      setUploadNotice('Profile changes saved.');
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setUploadNotice(err.message || 'Failed to save profile changes.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      
      {/* Profile Header */}
      <div className="bright-card rounded-3xl p-6 sm:p-8 space-y-6 border-emerald-500/30">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            
            {/* Avatar & Upload Button */}
            <div className="relative group">
              <img
                src={avatar}
                alt={name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-500/40 shadow-lg"
              />
              {isUploadingPhoto ? (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <label className="absolute bottom-0 right-0 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full cursor-pointer shadow-md transition-transform hover:scale-110" title="Upload new photo">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" disabled={isUploadingPhoto} className="hidden" onChange={handleFileUpload} />
                </label>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{user.name}</h1>
                {user.isVerifiedGov && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Domain
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-emerald-700">{user.cadre}</p>
              <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span><strong>{user.mdaName}</strong> ({user.department} Dept)</span>
              </p>
              {uploadNotice && (
                <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{uploadNotice}</span>
                </div>
              )}
            </div>

          </div>

          {/* Action Buttons: Edit Profile & Seamless Sign Out */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition-all border border-slate-200"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Close Edit' : 'Edit Profile'}</span>
            </button>

            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all border border-rose-200 disabled:opacity-50"
            >
              {isSigningOut ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-700" />
                  <span>Signing Out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* EDIT PROFILE FORM */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">Update Account Profile & Avatar</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Officer Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={mdaName}
                  onChange={(e) => setMdaName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Internal Department</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Grade Cadre Level / Rank</label>
                <input
                  type="text"
                  required
                  value={cadre}
                  onChange={(e) => setCadre(e.target.value)}
                  placeholder="e.g. Assistant Director (GL 15), Chief Research Officer..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Avatar Preset Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Or Choose Avatar :</label>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {CURATED_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    aria-label={`Choose ${preset.title} avatar`}
                    title={preset.title}
                    onClick={async () => {
                      try {
                        await cloudDatabaseService.upsertProfile({
                          user_id: user.id,
                          full_name: user.name,
                          email: user.email,
                          ministry: user.mdaName,
                          agency: user.mdaName,
                          department: user.department,
                          cadre: user.cadre,
                          avatar_url: preset.url
                        });
                        await supabase.auth.updateUser({
                          data: { avatar_url: preset.url }
                        });
                        setAvatar(preset.url);
                        updateUserProfile({ avatar: preset.url });
                        setUploadNotice('✓ Avatar picture updated and saved!');
                        setTimeout(() => setUploadNotice(null), 3000);
                      } catch (err: any) {
                        console.error('Preset avatar save notice:', err);
                        setUploadNotice(err.message || 'Failed to save avatar. Please try again.');
                      }
                    }}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 p-0.5 transition-all hover:-translate-y-0.5 ${
                      avatar === preset.url ? 'border-emerald-600 ring-2 ring-emerald-500/30' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img src={preset.url} alt="" className="h-full w-full rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl text-xs shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
          <div>
            <span className="block text-2xl font-black text-emerald-700">{user.careerXP.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Career XP</span>
          </div>
          <div>
            <span className="block text-2xl font-black text-amber-700">{user.tier}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rank Tier</span>
          </div>
          <div>
            <span className="block text-2xl font-black text-slate-900">{user.badges.length}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unlocked Badges</span>
          </div>
          <div>
            <span className="block text-2xl font-black text-emerald-700">{user.tournamentPasses}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Passes Left</span>
          </div>
        </div>
      </div>

      {/* Badges Showcase */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-600" />
          <span>Earned Milestone Badges & Certifications</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {user.badges.map((b) => (
            <div key={b.id} className="bright-card p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{b.title}</h3>
                  <span className="text-[10px] text-slate-500">Earned: {b.earnedAt}</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Attempts */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600" />
          <span>Tournament Attempt History</span>
        </h2>

        {userAttempts.length > 0 ? (
          <div className="bright-card rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Stage</th>
                  <th className="px-6 py-3">Accuracy</th>
                  <th className="px-6 py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userAttempts.map((att) => (
                  <tr key={att.id}>
                    <td className="px-6 py-3 text-slate-500 font-mono">{new Date(att.timestamp).toLocaleDateString()}</td>
                    <td className="px-6 py-3 font-bold text-slate-900">Stage {att.stageNumber}</td>
                    <td className="px-6 py-3 text-emerald-700 font-bold">{att.accuracy}%</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded font-extrabold ${att.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {att.passed ? 'PASSED' : 'RETRY NEEDED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bright-card p-6 rounded-2xl text-center text-slate-500 text-xs">
            No completed attempts in current session. Enter Stage 1 Qualifier to record your first score!
          </div>
        )}
      </div>

    </div>
  );
};
