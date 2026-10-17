'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Sparkles, X, ChevronRight, MapPin, ShieldCheck, Flame } from 'lucide-react';
import { KENYAN_LIVE_ACTIVITIES, LiveActivityItem } from '@/lib/live-feed-data';

export default function LiveWinnerToast() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activities, setActivities] = useState<LiveActivityItem[]>(KENYAN_LIVE_ACTIVITIES);

  // Fetch fresh activities if available
  useEffect(() => {
    async function loadActivities() {
      try {
        const res = await fetch('/api/activity-feed?limit=40');
        const data = await res.json();
        if (data.success && data.items && data.items.length > 0) {
          setActivities(data.items);
        }
      } catch {
        // Fallback to static KENYAN_LIVE_ACTIVITIES
      }
    }
    loadActivities();
  }, []);

  // Continuous loop animation timer
  useEffect(() => {
    if (dismissed || activities.length === 0) return;

    // Initial popup delay
    const initialTimer = setTimeout(() => {
      setVisible(true);
    }, 2500);

    // Continuous cycle: Visible for 6.5s, hidden for 3.5s, then next item
    const interval = setInterval(() => {
      setVisible(false);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activities.length);
        setVisible(true);
      }, 1200); // Wait for exit animation before showing next
    }, 8500);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [dismissed, activities.length]);

  if (dismissed || activities.length === 0) return null;

  const current = activities[currentIndex];
  if (!current) return null;

  const isWin = current.type === 'VERIFIED_WIN' || current.categoryLabel.includes('Win');
  const isNearMiss = current.matchedCount === 9 || current.categoryLabel.includes('Near Miss');

  return (
    <aside
      aria-label="Live Winner Notification"
      className={`fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96 transition-all duration-700 ease-out transform ${
        visible
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-10 opacity-0 pointer-events-none scale-95'
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl transition-all ${
          isWin
            ? 'bg-gradient-to-br from-slate-950/95 via-amber-950/40 to-slate-900/95 border-amber-500/50 shadow-amber-500/10'
            : isNearMiss
            ? 'bg-gradient-to-br from-slate-950/95 via-cyan-950/40 to-slate-900/95 border-cyan-500/50 shadow-cyan-500/10'
            : 'bg-slate-950/95 border-slate-800 shadow-emerald-500/5'
        }`}
      >
        {/* Shimmer accent line */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
            isWin
              ? 'from-amber-400 via-emerald-400 to-amber-500'
              : isNearMiss
              ? 'from-cyan-400 via-emerald-400 to-amber-400'
              : 'from-emerald-400 to-cyan-400'
          }`}
        />

        {/* Close Button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title="Dismiss notification"
          aria-label="Dismiss live alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3 pr-5">
          {/* Icon Badge */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              isWin
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 animate-bounce'
                : isNearMiss
                ? 'bg-gradient-to-tr from-cyan-500 to-emerald-400 text-slate-950'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isWin ? (
              <Trophy className="w-5 h-5" />
            ) : isNearMiss ? (
              <Flame className="w-5 h-5 text-amber-300" />
            ) : (
              <Sparkles className="w-5 h-5 text-emerald-400" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-white text-xs truncate max-w-[120px]">
                {current.authorAlias}
              </span>

              {/* Masked Kenyan Phone Badge */}
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-emerald-400">
                {current.maskedPhone}
              </span>

              {/* Region */}
              {current.region && (
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 text-slate-500" />
                  {current.town ? `${current.town}` : current.region}
                </span>
              )}
            </div>

            {/* Status & Prize */}
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 ${
                  isWin
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    : isNearMiss
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-emerald-500/15 text-emerald-300'
                }`}
              >
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                {current.categoryLabel}
              </span>

              {current.prizeAmount && (
                <span className="text-xs font-black text-amber-400 drop-shadow-sm">
                  {current.prizeAmount}
                </span>
              )}
            </div>

            {/* Text description */}
            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
              {current.text}
            </p>

            {/* Quick Play CTA Link */}
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[9px] text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                Verified M-PESA Live
              </span>

              <Link
                href="/play"
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 group"
              >
                <span>Play Draw #1</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
