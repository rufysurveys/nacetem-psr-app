import React, { useState } from 'react';
import { BadgeCheck, Copy, Share2 } from 'lucide-react';
import type { RoomState } from '../../services/remoteContest';

type WinnerBadge = NonNullable<RoomState['winner_badge']>;

export function ContestWinnerBadge({ badge }: { badge: WinnerBadge }) {
  const [notice, setNotice] = useState('');
  const verificationUrl = new URL('/', window.location.origin);
  verificationUrl.searchParams.set('badge', badge.verification_code);
  const url = verificationUrl.toString();

  async function shareBadge() {
    setNotice('');
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'NACETEM PSR Tournament Winner',
          text: `${badge.winner_name} won ${badge.tournament_title}. Verify this NACETEM-issued badge.`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice('Verification link copied.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        setNotice('Verification link copied.');
      } catch {
        setNotice('Copy the verification link below to share this badge.');
      }
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Verification link copied.');
    } catch {
      setNotice('Select and copy the verification link below.');
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-white shadow-sm" aria-label="NACETEM tournament winner badge">
      <div className="flex items-center gap-3 bg-emerald-950 px-5 py-4 text-white">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-amber-300 text-amber-300">
          <BadgeCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">NACETEM certified</p>
          <h3 className="text-lg font-black">PSR Tournament Winner</h3>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-xl font-black text-slate-950">{badge.winner_name}</p>
        <p className="text-sm font-semibold text-slate-700">{badge.tournament_title}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
          <span>Score: <strong>{badge.score.toLocaleString()}</strong></span>
          <span>Accuracy: <strong>{Number(badge.accuracy).toFixed(2)}%</strong></span>
        </div>
        <p className="text-[11px] text-slate-500">Credential {badge.verification_code} · Issued {new Date(badge.issued_at).toLocaleDateString()}</p>
        <label className="block text-[11px] font-semibold text-slate-600">
          Public verification link
          <input readOnly value={url} onFocus={event => event.currentTarget.select()} className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void shareBadge()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">
            <Share2 className="h-4 w-4" aria-hidden="true" /> Share badge
          </button>
          <button type="button" onClick={() => void copyLink()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <Copy className="h-4 w-4" aria-hidden="true" /> Copy link
          </button>
        </div>
        {notice && <p role="status" className="text-xs font-semibold text-emerald-800">{notice}</p>}
      </div>
    </section>
  );
}
