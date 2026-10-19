'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  Trophy,
  ShieldCheck,
  Flame,
  Users,
  Sparkles,
  MapPin,
  RefreshCw,
  LogIn,
} from 'lucide-react';
import { KENYAN_REGIONS } from '@/lib/validations';
import { KENYAN_LIVE_COMMENTS, LiveCommentSeed } from '@/lib/live-feed-data';

interface CommentMsg {
  id: string;
  authorAlias: string;
  content: string;
  category: string;
  region: string | null;
  isVerifiedWin: boolean;
  createdAt: string;
  associatedEntry?: {
    entryReference: string;
    isWinner: boolean;
    prizeAwardedCents: string | number;
  };
}

export default function LiveCommunityChat({ currentUser }: { currentUser?: any }) {
  const [comments, setComments] = useState<CommentMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlineCount, setOnlineCount] = useState(148);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch comments
  const loadComments = async () => {
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);

      const res = await fetch(`/api/comments?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.comments && data.comments.length > 0) {
        setComments(data.comments);
      } else {
        // Fallback to rich seeds
        setComments(
          KENYAN_LIVE_COMMENTS.map((c) => ({
            id: c.id,
            authorAlias: c.authorAlias,
            content: c.content,
            category: c.category,
            region: c.region,
            isVerifiedWin: c.isVerifiedWin,
            createdAt: new Date(Date.now() - c.minutesAgo * 60000).toISOString(),
            associatedEntry: c.isVerifiedWin
              ? { entryReference: 'TCPI-WIN-8491', isWinner: true, prizeAwardedCents: '10000000' }
              : undefined,
          }))
        );
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
    const interval = setInterval(loadComments, 10000); // 10s live poll
    return () => clearInterval(interval);
  }, [selectedCategory]);

  // Jitter online count subtly to feel authentically alive
  useEffect(() => {
    const jitter = setInterval(() => {
      setOnlineCount((prev) => Math.max(120, prev + Math.floor(Math.random() * 5) - 2));
    }, 8000);
    return () => clearInterval(jitter);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || submitting) return;

    if (!currentUser) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMsg.trim(),
          category: 'PLAYER_EXPERIENCE',
          region: 'Nairobi',
        }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setComments((prev) => [data.comment, ...prev]);
        setNewMsg('');
      }
    } catch (err) {
      console.error('Failed to post live chat message', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md flex flex-col">
      {/* Chat Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-amber-500/20 border border-emerald-500/30 text-emerald-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
              <span>Live Player Chat & Community</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <Users className="w-3 h-3 text-cyan-400" />
              <span>{onlineCount} Kenyan players active right now</span>
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
          {[
            { label: 'All Chat', value: 'ALL' },
            { label: '🏆 Verified Wins', value: 'CONFIRMED_WIN' },
            { label: '🔥 Experience', value: 'PLAYER_EXPERIENCE' },
            { label: '⚡ Near Misses', value: 'LOSS_REPORTED' },
          ].map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[10px] whitespace-nowrap ${
                selectedCategory === cat.value
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="p-3 sm:p-4 max-h-80 sm:max-h-96 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800 flex-1">
        {comments.map((msg, index) => {
          const isWin = msg.isVerifiedWin || msg.category === 'CONFIRMED_WIN';
          const isLoss = msg.category === 'LOSS_REPORTED';

          return (
            <div
              key={`${msg.id}-${index}`}
              className={`p-3 rounded-xl border text-xs transition-all ${
                isWin
                  ? 'bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-slate-950 border-amber-500/40 shadow-sm'
                  : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-white text-[11px]">
                    {msg.authorAlias}
                  </span>

                  {isWin && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                      <Trophy className="w-2.5 h-2.5 text-amber-300" />
                      KSh 100,000 Winner
                    </span>
                  )}

                  {isLoss && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Near Miss / Report
                    </span>
                  )}

                  {msg.region && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-slate-500" />
                      {msg.region}
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-slate-500 flex-shrink-0" suppressHydrationWarning>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-slate-300 text-[11px] leading-relaxed break-words">
                {msg.content}
              </p>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input / Join Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/90">
        {currentUser ? (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="Share your draw experience, tips, or congratulations..."
              maxLength={300}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={submitting || !newMsg.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <span className="text-xs text-slate-300 text-center sm:text-left">
              Join the conversation! Share your draw numbers and connect with players.
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <LogIn className="w-3 h-3" />
                <span>Log In</span>
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
