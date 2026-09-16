import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CadreRank } from '../types';
import { ShieldCheck, Award, Building2, CheckCircle2, Clock, Upload, Camera, LogOut, Edit2, Save, X } from 'lucide-react';

export const UserProfilePage: React.FC = () => {
  const { user, userAttempts, updateUserProfile, logout } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [mdaName, setMdaName] = useState(user?.mdaName || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [cadre, setCadre] = useState<CadreRank>(user?.cadre || 'Chief Administrative Officer (GL 14)');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  if (!user) return null;

  const presetAvatars = [
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
          updateUserProfile({ avatar: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name,
      mdaName,
      department,
      cadre,
      avatar
    });
    setIsEditing(false);
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
              <label className="absolute bottom-0 right-0 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full cursor-pointer shadow-md transition-transform hover:scale-110">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
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
              onClick={logout}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all border border-rose-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Grade Cadre Level</label>
                <select
                  value={cadre}
                  onChange={(e) => setCadre(e.target.value as CadreRank)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                >
                  <option value="Permanent Secretary">Permanent Secretary</option>
                  <option value="Director (GL 17)">Director (GL 17)</option>
                  <option value="Deputy Director (GL 16)">Deputy Director (GL 16)</option>
                  <option value="Assistant Director (GL 15)">Assistant Director (GL 15)</option>
                  <option value="Chief Administrative Officer (GL 14)">Chief Administrative Officer (GL 14)</option>
                  <option value="Principal Officer (GL 12)">Principal Officer (GL 12)</option>
                  <option value="Senior Executive Officer (GL 10)">Senior Executive Officer (GL 10)</option>
                </select>
              </div>
            </div>

            {/* Avatar Preset Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Or Choose Preset Avatar Picture</label>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {presetAvatars.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Avatar ${idx}`}
                    onClick={() => {
                      setAvatar(url);
                      updateUserProfile({ avatar: url });
                    }}
                    className={`w-12 h-12 rounded-full object-cover cursor-pointer ring-2 transition-all hover:scale-105 ${
                      avatar === url ? 'ring-emerald-600 ring-offset-2' : 'ring-slate-200'
                    }`}
                  />
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl text-xs shadow flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
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
