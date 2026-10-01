import React, { useEffect, useState } from 'react';
import { BadgeCheck, Copy, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabase';
import type { RoomState } from '../../services/remoteContest';

type VerifiedBadge = NonNullable<RoomState['winner_badge']> & {
  issuer: string;
  credential: string;
};

export function WinnerBadgeVerification({ code }: { code: string }) {
  const [badge, setBadge] = useState<VerifiedBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    supabase.rpc('verify_contest_winner_badge', { p_verification_code: code })
      .then(({ data, error }) => {
        if (!active) return;
        setBadge(error ? null : data as VerifiedBadge | null);
        setLoading(false);
      });
    return () => { active = false; };
  }, [code]);

  const verificationUrl = window.location.href;

  async function share() {
    setNotice('');
    try {
      if (navigator.share && badge) {
        await navigator.share({
          title: 'NACETEM PSR Tournament Winner',
          text: `${badge.winner_name} · ${badge.tournament_title}`,
          url: verificationUrl,
        });
      } else {
        await navigator.clipboard.writeText(verificationUrl);
        setNotice('Verification link copied.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setNotice('Unable to share from this browser. Copy the page URL to share it.');
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#d1fae5,_#f8fafc_58%)] px-4 py-12 text-slate-900">
      <section className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl">
        <header className="bg-emerald-950 px-7 py-8 text-center text-white">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-amber-300 text-amber-300">
            {badge ? <BadgeCheck className="h-9 w-9" aria-hidden="true" /> : <ShieldCheck className="h-8 w-8" aria-hidden="true" />}
          </span>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-200">NACETEM credential verification</p>
          <h1 className="mt-2 text-2xl font-black">{loading ? 'Checking badge…' : badge ? 'Verified tournament winner' : 'Badge not found'}</h1>
        </header>
        {loading ? <p className="p-8 text-center text-sm text-slate-600">Checking the official tournament record.</p> : badge ? (
          <div className="space-y-4 p-7">
            <p className="text-center text-xs font-bold uppercase text-emerald-800">{badge.issuer}</p>
            <div className="text-center">
              <p className="text-sm text-slate-500">This certifies that</p>
              <p className="mt-1 text-2xl font-black">{badge.winner_name}</p>
              <p className="mt-2 font-semibold text-slate-700">won {badge.tournament_title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <p className="text-slate-600">Final score <strong className="block text-lg text-slate-950">{badge.score.toLocaleString()}</strong></p>
              <p className="text-slate-600">Accuracy <strong className="block text-lg text-slate-950">{Number(badge.accuracy).toFixed(2)}%</strong></p>
            </div>
            <p className="text-center text-xs text-slate-500">{badge.credential} · {badge.verification_code}<br />Issued {new Date(badge.issued_at).toLocaleDateString()}</p>
            <button type="button" onClick={() => void share()} className="mx-auto inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800">
              <Copy className="h-4 w-4" aria-hidden="true" /> Share verification
            </button>
            {notice && <p role="status" className="text-center text-xs text-emerald-800">{notice}</p>}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-slate-600">No valid NACETEM PSR winner badge matches this verification code.</p>
        )}
      </section>
    </main>
  );
}
