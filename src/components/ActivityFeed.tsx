'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Pause,
  Play,
} from 'lucide-react';
import { KENYAN_REGIONS } from '@/lib/validations';

interface ActivityItem {
  id: string;
  type: 'VERIFIED_WIN' | 'OFFICIAL_RESULT' | 'PLAYER_EXPERIENCE';
  categoryLabel: string;
  authorAlias: string;
  text: string;
  isVerified: boolean;
  prizeAmount: string | null;
  matchedCount?: number;
  region: string | null;
  timestamp: string;
}

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchFeed = async () => {
    try {
      const url =
        selectedRegion && selectedRegion !== 'ALL'
          ? `/api/activity-feed?region=${encodeURIComponent(selectedRegion)}`
          : '/api/activity-feed';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (e) {
      console.error('Failed to load activity feed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30000); // 30s background poll
    return () => clearInterval(interval);
  }, [selectedRegion]);

  // Gentle continuous ticker scroll effect
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || items.length < 3 || isPaused) return;

    let animId: number;
    const step = () => {
      if (el) {
        el.scrollTop += 0.5;
        // Loop back when reaching bottom
        if (el.scrollTop >= el.scrollHeight - el.clientHeight - 2) {
          el.scrollTop = 0;
        }
      }
      animId = requestAnimationFrame(step);
    };

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      animId = requestAnimationFrame(step);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPaused, items]);

  return (
    <section className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3">
      {/* Header with Title and Region Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Live Activity Feed
          </h3>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            • Verified results & player updates
          </span>
        </div>

        {/* Region Filter & Pause Control */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-[11px] text-slate-300">
            <MapPin className="w-3 h-3 text-emerald-400" />
            <select
              aria-label="Filter activity by region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-slate-200 focus:outline-none cursor-pointer"
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
            title={isPaused ? 'Resume auto-scroll' : 'Pause ticker'}
            className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs"
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Feed List Container */}
      <div
        ref={scrollContainerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        tabIndex={0}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        className="max-h-56 sm:max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800 focus:outline-none"
      >
        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">
            Loading genuine activity records...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No recent activity recorded yet in this category.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all text-xs flex items-start justify-between gap-3 ${
                item.type === 'VERIFIED_WIN'
                  ? 'bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-slate-950 border-amber-500/30 shadow-sm'
                  : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-white text-[11px] truncate max-w-[130px]">
                    {item.authorAlias}
                  </span>

                  {/* Badge */}
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      item.type === 'VERIFIED_WIN'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : item.categoryLabel.includes('Loss') || item.categoryLabel.includes('Near Miss')
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.type === 'VERIFIED_WIN' && <Trophy className="w-2.5 h-2.5" />}
                    {item.isVerified && <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />}
                    {item.categoryLabel}
                  </span>

                  {item.region && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-slate-500" />
                      {item.region}
                    </span>
                  )}
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed break-words">
                  {item.text}
                </p>
              </div>

              {/* Timestamp & Prize Amount */}
              <div className="text-right flex-shrink-0 space-y-0.5">
                {item.prizeAmount && (
                  <div className="text-xs font-black text-amber-400">
                    {item.prizeAmount}
                  </div>
                )}
                <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  <span suppressHydrationWarning>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
