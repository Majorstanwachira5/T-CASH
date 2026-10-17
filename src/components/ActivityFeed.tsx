'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Sparkles,
  ShieldCheck,
  Clock,
  MapPin,
  Pause,
  Play,
  Flame,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { KENYAN_REGIONS } from '@/lib/validations';
import { KENYAN_LIVE_ACTIVITIES, LiveActivityItem } from '@/lib/live-feed-data';

export default function ActivityFeed() {
  const [items, setItems] = useState<LiveActivityItem[]>(KENYAN_LIVE_ACTIVITIES);
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [isPaused, setIsPaused] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  const fetchFeed = async () => {
    try {
      const url =
        selectedRegion && selectedRegion !== 'ALL'
          ? `/api/activity-feed?region=${encodeURIComponent(selectedRegion)}&limit=40`
          : '/api/activity-feed?limit=40';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.items && data.items.length > 0) {
        setItems(data.items);
      }
    } catch (e) {
      console.warn('Live activity feed fetch fell back to curated stream', e);
    }
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 20000); // 20s background poll
    return () => clearInterval(interval);
  }, [selectedRegion]);

  // Smooth continuous linear auto-scroll loop
  useEffect(() => {
    const el = tickerRef.current;
    if (!el || isPaused) return;

    let animId: number;
    let lastTime = performance.now();

    const scrollStep = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      if (el) {
        // Continuous steady scrolling: ~35px per second
        el.scrollTop += (35 * deltaTime) / 1000;

        // Loop seamlessly when reaching the bottom
        if (el.scrollTop >= el.scrollHeight - el.clientHeight - 4) {
          el.scrollTop = 0;
        }
      }
      animId = requestAnimationFrame(scrollStep);
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      animId = requestAnimationFrame(scrollStep);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPaused, items]);

  return (
    <section className="w-full bg-slate-900/70 border border-slate-800/90 rounded-2xl p-3.5 sm:p-5 shadow-2xl space-y-3.5 backdrop-blur-sm">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/90 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="absolute w-4 h-4 rounded-full bg-emerald-400/40 animate-ping"></span>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Live Activity & Winner Stream
            </h3>
            <p className="text-[10px] text-slate-400">
              Continuous audit log of draws, verified M-PESA payouts & player reports
            </p>
          </div>
        </div>

        {/* Region Filter & Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl text-xs text-slate-300">
            <MapPin className="w-3 h-3 text-emerald-400" />
            <select
              aria-label="Filter activity by region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Kenya</option>
              {KENYAN_REGIONS.map((r) => (
                <option key={r} value={r} className="bg-slate-900 text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume live ticker' : 'Pause ticker'}
            className="px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors"
          >
            {isPaused ? (
              <>
                <Play className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold">Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-bold">Pause</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Looping Feed Container */}
      <div
        ref={tickerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        tabIndex={0}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        className="max-h-72 sm:max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800 focus:outline-none"
      >
        {items.map((item, idx) => {
          const isWin = item.type === 'VERIFIED_WIN' || item.categoryLabel.includes('Win');
          const isNearMiss = item.matchedCount === 9 || item.categoryLabel.includes('Near Miss');

          return (
            <div
              key={`${item.id}-${idx}`}
              className={`p-3 rounded-xl border transition-all text-xs flex items-start justify-between gap-3 ${
                isWin
                  ? 'bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-slate-950 border-amber-500/40 shadow-md shadow-amber-500/5'
                  : isNearMiss
                  ? 'bg-gradient-to-r from-cyan-500/10 via-slate-950 to-slate-950 border-cyan-500/30'
                  : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-extrabold text-white text-[12px] truncate max-w-[130px]">
                    {item.authorAlias}
                  </span>

                  {/* Masked Kenyan Phone */}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-emerald-400">
                    {item.maskedPhone}
                  </span>

                  {/* Category Pill */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      isWin
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : isNearMiss
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isWin && <Trophy className="w-2.5 h-2.5 text-amber-300" />}
                    {isNearMiss && <Flame className="w-2.5 h-2.5 text-cyan-300" />}
                    {item.isVerified && <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />}
                    {item.categoryLabel}
                  </span>

                  {item.region && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-slate-500" />
                      {item.town ? `${item.town}` : item.region}
                    </span>
                  )}
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed break-words">
                  {item.text}
                </p>
              </div>

              {/* Prize & Timestamp */}
              <div className="text-right flex-shrink-0 space-y-1">
                {item.prizeAmount && (
                  <div className="text-xs sm:text-sm font-black text-amber-400 drop-shadow-sm">
                    {item.prizeAmount}
                  </div>
                )}
                {isNearMiss && !item.prizeAmount && (
                  <div className="text-[10px] font-bold text-cyan-400">
                    9/10 Matched
                  </div>
                )}
                <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  <span suppressHydrationWarning>
                    {item.minutesAgo !== undefined
                      ? `${item.minutesAgo}m ago`
                      : 'Just now'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Live Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <strong className="text-white">Draw #1 Active</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span>Grand Prize: <strong className="text-amber-400">KSh 50,000</strong></span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="hidden sm:inline">Repeat Entry: <strong className="text-emerald-400">KSh 2</strong></span>
        </div>

        <Link
          href="/play"
          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 group"
        >
          <span>Enter Live Draw</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
