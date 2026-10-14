'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  CreditCard,
  Gamepad2,
  Trophy,
  History,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Plus,
  MessageSquare,
  EyeOff,
  Eye,
  Trash2,
  Flag,
} from 'lucide-react';
import { formatKsh, formatKshPlain } from '@/lib/currency';

export const dynamic = 'force-dynamic';

interface OverviewStats {
  totalUsers: number;
  totalEntries: number;
  winningEntries: number;
  successfulPaymentsCount: number;
  pendingPaymentsCount: number;
  failedPaymentsCount: number;
  grossCollectedCents: string | number;
  prizeLiabilityCents: string | number;
  totalPrizePaidCents: string | number;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'PAYMENTS' | 'GAME' | 'PRIZES' | 'COMMUNITY' | 'AUDIT'>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [suspendModalUser, setSuspendModalUser] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Payment Management State
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [paymentSearch, setPaymentSearch] = useState('');

  // Game Config State
  const [gameConfigs, setGameConfigs] = useState<any[]>([]);
  const [targetNumbersInput, setTargetNumbersInput] = useState<string>('7, 14, 21, 33, 42, 50, 63, 77, 88, 99');
  const [entryPriceKshInput, setEntryPriceKshInput] = useState<number>(100);
  const [repeatCreditKshInput, setRepeatCreditKshInput] = useState<number>(2);
  const [prizeAmountKshInput, setPrizeAmountKshInput] = useState<number>(50000);
  const [isPublishingConfig, setIsPublishingConfig] = useState(false);

  // Prize Claims State
  const [prizeClaims, setPrizeClaims] = useState<any[]>([]);
  const [payoutModalClaim, setPayoutModalClaim] = useState<any | null>(null);
  const [payoutRefInput, setPayoutRefInput] = useState('');

  // Community Management State
  const [adminComments, setAdminComments] = useState<any[]>([]);
  const [commentSearch, setCommentSearch] = useState('');
  const [commentStatusFilter, setCommentStatusFilter] = useState('ALL');

  // Load Overview Data
  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/overview');
      if (res.status === 403 || res.status === 401) {
        router.push('/login?redirect=/admin');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentEntries(data.recentEntries || []);
        setRecentPayments(data.recentPayments || []);
        setRecentAudits(data.recentAudits || []);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  // Load Users
  const loadUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}`);
      const data = await res.json();
      if (data.success) setUsersList(data.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Payments
  const loadPayments = async () => {
    try {
      const res = await fetch(`/api/admin/payments?search=${encodeURIComponent(paymentSearch)}`);
      const data = await res.json();
      if (data.success) setPaymentsList(data.payments || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Game Configs
  const loadGameConfigs = async () => {
    try {
      const res = await fetch('/api/admin/game-config');
      const data = await res.json();
      if (data.success) setGameConfigs(data.configs || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Prize Claims
  const loadPrizes = async () => {
    try {
      const res = await fetch('/api/admin/prizes');
      const data = await res.json();
      if (data.success) setPrizeClaims(data.claims || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Community Comments
  const loadComments = async () => {
    try {
      const params = new URLSearchParams();
      if (commentSearch) params.set('search', commentSearch);
      if (commentStatusFilter && commentStatusFilter !== 'ALL') params.set('status', commentStatusFilter);

      const res = await fetch(`/api/admin/comments?${params.toString()}`);
      const data = await res.json();
      if (data.success) setAdminComments(data.comments || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'USERS') loadUsers();
    if (activeTab === 'PAYMENTS') loadPayments();
    if (activeTab === 'GAME') loadGameConfigs();
    if (activeTab === 'PRIZES') loadPrizes();
    if (activeTab === 'COMMUNITY') loadComments();
  }, [activeTab, commentStatusFilter]);

  // Handle Comment Moderation
  const handleModerateComment = async (commentId: string, action: 'HIDE' | 'RESTORE' | 'DELETE') => {
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, action, moderationNotes: `Admin action: ${action}` }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.message || `Comment action ${action} applied.`);
        loadComments();
      } else {
        setErrorMsg(data.message || 'Moderation failed');
      }
    } catch {
      setErrorMsg('Failed to apply moderation action');
    }
  };

  // Handle User Action
  const handleUserAction = async (userId: string, action: string, reason?: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`User status updated: ${action}`);
        setSuspendModalUser(null);
        setSuspendReason('');
        loadUsers();
      } else {
        setErrorMsg(data.message || 'Action failed');
      }
    } catch {
      setErrorMsg('Failed to execute user action');
    }
  };

  // Handle Publish New Game Config
  const handlePublishConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishingConfig(true);
    setActionMsg('');
    setErrorMsg('');

    try {
      const parsedNumbers = targetNumbersInput
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n));

      if (parsedNumbers.length !== 10) {
        throw new Error('Must specify exactly 10 comma-separated numbers (1 to 99)');
      }

      const res = await fetch('/api/admin/game-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `T CPI Official Draw #${(gameConfigs[0]?.version || 0) + 1}`,
          description: 'Official 10-Box Mystery Number Draw',
          entryPriceKsh: Number(entryPriceKshInput),
          repeatCreditKsh: Number(repeatCreditKshInput),
          prizeAmountKsh: Number(prizeAmountKshInput),
          totalPositions: 10,
          numberMin: 1,
          numberMax: 99,
          isUniqueRequired: false,
          targetNumbers: parsedNumbers,
          isPublished: true,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update config');
      }

      setActionMsg(data.message || 'New game configuration published successfully!');
      loadGameConfigs();
      loadOverview();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      setErrorMsg(msg);
    } finally {
      setIsPublishingConfig(false);
    }
  };

  // Handle Prize Payout Recording
  const handleRecordPayout = async () => {
    if (!payoutModalClaim || !payoutRefInput) return;
    try {
      const res = await fetch('/api/admin/prizes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: payoutModalClaim.id,
          action: 'RECORD_PAYOUT',
          payoutMethod: 'MPESA',
          payoutReference: payoutRefInput,
          notes: `Official payout settled via M-PESA: ${payoutRefInput}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMsg('Payout reference recorded and notification sent to player!');
        setPayoutModalClaim(null);
        setPayoutRefInput('');
        loadPrizes();
        loadOverview();
      } else {
        setErrorMsg(data.message || 'Payout failed');
      }
    } catch {
      setErrorMsg('Failed to process payout record');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Admin Top Header (Compact) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.2 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3" /> Administration Console
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">T CPI Core Engine v1.1</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
            Admin Management Console
          </h1>
        </div>

        <button
          onClick={() => {
            loadOverview();
            if (activeTab === 'USERS') loadUsers();
            if (activeTab === 'PAYMENTS') loadPayments();
            if (activeTab === 'GAME') loadGameConfigs();
            if (activeTab === 'PRIZES') loadPrizes();
            if (activeTab === 'COMMUNITY') loadComments();
          }}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {actionMsg && (
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{actionMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs (Compact) */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: Shield },
          { id: 'USERS', label: 'Users', icon: Users },
          { id: 'PAYMENTS', label: 'Payments', icon: CreditCard },
          { id: 'GAME', label: 'Game & Targets', icon: Gamepad2 },
          { id: 'PRIZES', label: 'Prizes', icon: Trophy },
          { id: 'COMMUNITY', label: 'Community & Feed', icon: MessageSquare },
          { id: 'AUDIT', label: 'Audit Logs', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setActionMsg('');
                setErrorMsg('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'OVERVIEW' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Collected</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">
                {formatKsh(stats.grossCollectedCents)}
              </div>
              <div className="text-[10px] text-slate-500">
                {stats.successfulPaymentsCount} verified payments
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase">Prize Liabilities</span>
              <div className="text-xl sm:text-2xl font-black text-amber-400">
                {formatKsh(stats.prizeLiabilityCents)}
              </div>
              <div className="text-[10px] text-slate-500">Awaiting disbursement</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Settled Payouts</span>
              <div className="text-xl sm:text-2xl font-black text-cyan-400">
                {formatKsh(stats.totalPrizePaidCents)}
              </div>
              <div className="text-[10px] text-slate-500">Disbursed via M-PESA</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Entries</span>
              <div className="text-xl sm:text-2xl font-black text-white">
                {stats.totalEntries}
              </div>
              <div className="text-[10px] text-slate-500">Across {stats.totalUsers} registered users</div>
            </div>
          </div>

          {/* Compact Feeds */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                Recent Authoritative Entries
              </h3>
              <div className="divide-y divide-slate-800/80 text-xs">
                {recentEntries.slice(0, 5).map((e) => (
                  <div key={e.id} className="py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-200">{e.entryReference}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{e.user?.email}</span>
                    </div>
                    <span className="font-bold text-emerald-400 text-[11px]">
                      {e.matchedCount} of 10 matched
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                Recent Paystack Transactions
              </h3>
              <div className="divide-y divide-slate-800/80 text-xs">
                {recentPayments.slice(0, 5).map((p) => (
                  <div key={p.id} className="py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-slate-200">{p.reference}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{p.user?.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{formatKsh(p.amountCents)}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: COMMUNITY & FEED MANAGEMENT (New requirement) */}
      {activeTab === 'COMMUNITY' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search comments..."
                  value={commentSearch}
                  onChange={(e) => setCommentSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadComments()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                aria-label="Filter by status"
                value={commentStatusFilter}
                onChange={(e) => setCommentStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="FLAGGED">Flagged / Reported</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </div>

            <button
              onClick={loadComments}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-bold hover:text-white"
            >
              Search Comments
            </button>
          </div>

          {/* Comments Moderation Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Author</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Content</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Reports</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-medium text-[11px]">
                {adminComments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No comments found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  adminComments.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-white">{c.authorAlias}</div>
                        <div className="text-[10px] text-slate-400">{c.user?.email}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 font-bold">
                          {c.category}
                        </span>
                        {c.isVerifiedWin && (
                          <div className="text-[9px] text-amber-400 font-bold mt-0.5">Verified Win</div>
                        )}
                      </td>
                      <td className="py-2 px-3 max-w-xs break-words text-slate-200">
                        {c.content}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : c.status === 'FLAGGED'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {c.reportedCount > 0 ? (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-bold text-[10px]">
                            {c.reportedCount} report(s)
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          {c.status !== 'HIDDEN' ? (
                            <button
                              onClick={() => handleModerateComment(c.id, 'HIDE')}
                              title="Hide comment from public feed"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            >
                              <EyeOff className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleModerateComment(c.id, 'RESTORE')}
                              title="Restore comment to active"
                              className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleModerateComment(c.id, 'DELETE')}
                            title="Permanently remove"
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'USERS' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search user by email or name..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
              className="w-full sm:w-72 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
            />
            <button
              onClick={loadUsers}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300"
            >
              Search
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Balance</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-medium text-[11px]">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3">
                      <div className="font-bold text-white">{u.fullName}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-2 px-3">{u.role}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${u.status === 'ACTIVE' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-emerald-400">
                      {formatKsh(u.wallet?.balanceCents || 0)}
                    </td>
                    <td className="py-2 px-3">
                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setSuspendModalUser(u)}
                          className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserAction(u.id, 'REACTIVATE')}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl max-w-sm w-full space-y-3">
            <h3 className="text-sm font-bold text-white">
              Suspend: {suspendModalUser.email}
            </h3>
            <textarea
              rows={2}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Official reason for suspension..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSuspendModalUser(null)}
                className="px-3 py-1 rounded bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUserAction(suspendModalUser.id, 'SUSPEND', suspendReason)}
                className="px-3 py-1 rounded bg-rose-500 text-slate-950 text-xs font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS RECONCILIATION */}
      {activeTab === 'PAYMENTS' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by Paystack reference or email..."
              value={paymentSearch}
              onChange={(e) => setPaymentSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPayments()}
              className="w-full sm:w-72 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
            />
            <button onClick={loadPayments} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
              Filter
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Reference</th>
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-medium text-[11px]">
                {paymentsList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 px-3 font-mono text-slate-200">{p.reference}</td>
                    <td className="py-2 px-3 text-slate-300">{p.user?.email}</td>
                    <td className="py-2 px-3 font-bold text-white">{formatKsh(p.amountCents)}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${p.status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GAME CONFIGURATION */}
      {activeTab === 'GAME' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white">Publish New Game Draw</h2>
            <form onSubmit={handlePublishConfig} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Target Numbers (10 comma-separated)</label>
                <input
                  type="text"
                  required
                  value={targetNumbersInput}
                  onChange={(e) => setTargetNumbersInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-amber-400 font-mono font-bold mt-1"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Entry (KSh)</label>
                  <input
                    type="number"
                    value={entryPriceKshInput}
                    onChange={(e) => setEntryPriceKshInput(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Repeat Credit (KSh)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={repeatCreditKshInput}
                    onChange={(e) => setRepeatCreditKshInput(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-emerald-400 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Prize (KSh)</label>
                  <input
                    type="number"
                    value={prizeAmountKshInput}
                    onChange={(e) => setPrizeAmountKshInput(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-amber-400 mt-0.5"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPublishingConfig}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow flex items-center gap-1.5"
              >
                {isPublishingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Publish Draw</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: PRIZE PAYOUTS */}
      {activeTab === 'PRIZES' && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-white">Winning Entries & Claims</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Claim Ref</th>
                  <th className="py-2 px-3">Player</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Payout Ref</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-medium text-[11px]">
                {prizeClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono font-bold text-amber-400">{c.claimReference}</td>
                    <td className="py-2 px-3">{c.user?.fullName}</td>
                    <td className="py-2 px-3 font-bold text-emerald-400">{formatKsh(c.amountCents)}</td>
                    <td className="py-2 px-3">{c.status}</td>
                    <td className="py-2 px-3 font-mono">{c.payoutReference || 'Pending'}</td>
                    <td className="py-2 px-3">
                      {c.status !== 'PAID' && (
                        <button
                          onClick={() => setPayoutModalClaim(c)}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold"
                        >
                          Disburse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout modal */}
      {payoutModalClaim && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl max-w-sm w-full space-y-3">
            <h3 className="text-sm font-bold text-white">
              Record Payout: {formatKsh(payoutModalClaim.amountCents)}
            </h3>
            <input
              type="text"
              placeholder="M-PESA Reference code (e.g. QKH78923XY)..."
              value={payoutRefInput}
              onChange={(e) => setPayoutRefInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setPayoutModalClaim(null)} className="px-3 py-1 rounded bg-slate-800 text-xs">
                Cancel
              </button>
              <button onClick={handleRecordPayout} className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-xs">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Admin</th>
                  <th className="py-2 px-3">Target</th>
                  <th className="py-2 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono text-[10px]">
                {recentAudits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 px-3 text-purple-300 font-bold">{a.action}</td>
                    <td className="py-2 px-3 text-slate-300">{a.admin?.email}</td>
                    <td className="py-2 px-3 text-slate-400">{a.targetType}</td>
                    <td className="py-2 px-3 text-slate-400 max-w-xs truncate">{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
