'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Trophy,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Flag,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { KENYAN_REGIONS } from '@/lib/validations';

interface CommentItem {
  id: string;
  authorAlias: string;
  content: string;
  category: 'PLAYER_EXPERIENCE' | 'CONFIRMED_WIN' | 'LOSS_REPORTED' | 'SUGGESTION' | 'QUESTION';
  region: string | null;
  isVerifiedWin: boolean;
  createdAt: string;
  associatedEntry?: {
    entryReference: string;
    isWinner: boolean;
    prizeAwardedCents: string | number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PlayerComments({ currentUser }: { currentUser: any | null }) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Form State
  const [content, setContent] = useState('');
  const [authorAlias, setAuthorAlias] = useState('');
  const [category, setCategory] = useState<CommentItem['category']>('PLAYER_EXPERIENCE');
  const [region, setRegion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Report Modal State
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  // Filter State
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterRegion, setFilterRegion] = useState<string>('ALL');

  const fetchComments = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (filterCategory && filterCategory !== 'ALL') params.set('category', filterCategory);
      if (filterRegion && filterRegion !== 'ALL') params.set('region', filterRegion);

      const res = await fetch(`/api/comments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setComments(data.comments || []);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error('Failed to fetch comments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments(1);
  }, [filterCategory, filterRegion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg('');
    setErrorMsg('');

    if (!currentUser) {
      setErrorMsg('Please log in to post your comment.');
      return;
    }

    if (!content.trim() || content.trim().length < 3) {
      setErrorMsg('Comment must be at least 3 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          authorAlias: authorAlias.trim() || undefined,
          category,
          region: region || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to post comment');
      }

      setFeedbackMsg('Comment published to the community!');
      setContent('');
      fetchComments(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting comment';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!reportCommentId || !reportReason.trim()) return;
    setReporting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: reportCommentId,
          reason: reportReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg('Report submitted for administrative moderation review.');
        setReportCommentId(null);
        setReportReason('');
      } else {
        setErrorMsg(data.message || 'Report submission failed');
      }
    } catch {
      setErrorMsg('Failed to report comment');
    } finally {
      setReporting(false);
    }
  };

  return (
    <section className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            Player Community
          </h2>
          <p className="text-xs text-slate-400">
            Share feedback, report game outcomes, or ask questions. Authentic records only.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          <select
            aria-label="Filter comments by category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 font-semibold focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="PLAYER_EXPERIENCE">Player Experience</option>
            <option value="CONFIRMED_WIN">Confirmed Wins</option>
            <option value="LOSS_REPORTED">Losses / Near Misses</option>
            <option value="SUGGESTION">Suggestions</option>
            <option value="QUESTION">Questions</option>
          </select>

          {/* Region filter */}
          <select
            aria-label="Filter comments by region"
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 font-semibold focus:outline-none"
          >
            <option value="ALL">All Regions</option>
            {KENYAN_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback & Error alerts */}
      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Comment Submission Form (Compact) */}
      <form onSubmit={handleSubmit} className="bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800/80 space-y-3">
        <div className="space-y-1">
          <textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            placeholder={
              currentUser
                ? 'Share your experience, near miss, question, or suggestions...'
                : 'Sign in to post a community comment.'
            }
            disabled={!currentUser || submitting}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-slate-500 px-1">
            <span>Rate limited: 1 comment per 20 seconds</span>
            <span>{content.length}/500</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category selection */}
            <select
              aria-label="Comment category"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              disabled={!currentUser || submitting}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200 font-medium focus:outline-none"
            >
              <option value="PLAYER_EXPERIENCE">Player Experience</option>
              <option value="LOSS_REPORTED">Loss / Near Miss</option>
              <option value="CONFIRMED_WIN">Confirmed Win</option>
              <option value="SUGGESTION">Suggestion</option>
              <option value="QUESTION">Question</option>
            </select>

            {/* Region selection */}
            <select
              aria-label="Optional broad region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={!currentUser || submitting}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 font-medium focus:outline-none"
            >
              <option value="">Region (Optional)</option>
              {KENYAN_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Optional Alias */}
            <input
              type="text"
              placeholder="Alias (optional)"
              maxLength={25}
              value={authorAlias}
              onChange={(e) => setAuthorAlias(e.target.value)}
              disabled={!currentUser || submitting}
              className="w-28 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!currentUser || submitting || !content.trim()}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Post Comment</span>
          </button>
        </div>
      </form>

      {/* Comments List (Compact, 8-12px internal gaps) */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Loading community comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-500">
            No comments posted yet under this filter. Be the first to share your experience!
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                c.isVerifiedWin
                  ? 'bg-gradient-to-r from-amber-500/10 to-slate-950 border-amber-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white text-[12px]">{c.authorAlias}</span>

                  {/* Category Pill */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      c.isVerifiedWin
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : c.category === 'LOSS_REPORTED'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {c.isVerifiedWin ? 'Verified Winner' : c.category.replace('_', ' ')}
                  </span>

                  {c.isVerifiedWin && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      Backed by Official Win
                    </span>
                  )}

                  {c.region && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-slate-500" />
                      {c.region}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  <button
                    onClick={() => setReportCommentId(c.id)}
                    title="Report comment"
                    className="p-1 rounded text-slate-500 hover:text-rose-400 text-[10px]"
                  >
                    <Flag className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed break-words">
                {c.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} comments)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchComments(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchComments(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportCommentId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl max-w-sm w-full space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-rose-400" />
              Report Inappropriate Comment
            </h3>
            <p className="text-[11px] text-slate-400">
              Please specify why this comment violates our community standards (spam, abusive language, or fraudulent claims):
            </p>
            <textarea
              rows={2}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="e.g. Inappropriate language or spam"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setReportCommentId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={reporting || !reportReason.trim()}
                className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold disabled:opacity-50"
              >
                {reporting ? 'Reporting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
