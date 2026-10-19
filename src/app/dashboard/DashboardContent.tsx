'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Wallet,
  Gamepad2,
  Trophy,
  CreditCard,
  History,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { formatKsh } from '@/lib/currency';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  status: string;
  balanceCents: string | number;
}

interface GameEntryHistory {
  id: string;
  entryReference: string;
  ruleVersion: number;
  gameName: string;
  targetNumbers: number[];
  generatedNumbers: number[];
  matchedPositions: number[];
  matchedCount: number;
  isWinner: boolean;
  prizeAwardedCents: string | number;
  status: string;
  createdAt: string;
}

interface LedgerEntry {
  id: string;
  transactionType: string;
  amountCents: string | number;
  balanceBeforeCents: string | number;
  balanceAfterCents: string | number;
  reference: string;
  reason: string;
  createdAt: string;
}

export default function DashboardContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<GameEntryHistory[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'ENTRIES' | 'WALLET' | 'PROFILE'>('ENTRIES');
  const [loading, setLoading] = useState(true);

  // Deposit modal state
  const [depositAmountKsh, setDepositAmountKsh] = useState<number>(100);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, histRes, walletRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/game/history'),
        fetch('/api/wallet/transactions'),
      ]);

      const meData = await meRes.json();
      if (!meData.authenticated || !meData.user) {
        router.push('/login?redirect=/dashboard');
        return;
      }
      setUser(meData.user);

      const histData = await histRes.json();
      if (histData.success) {
        setEntries(histData.entries || []);
      }

      const walletData = await walletRes.json();
      if (walletData.success) {
        setLedger(walletData.ledger || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeposit = async () => {
    setDepositError('');
    setIsDepositing(true);

    try {
      const idempotencyKey = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountKsh: Number(depositAmountKsh),
          purpose: 'WALLET_DEPOSIT',
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Deposit initialization failed');
      }

      window.location.href = data.data.authorizationUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deposit failed';
      setDepositError(msg);
      setIsDepositing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Top Banner Profile Summary (Compact) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-md">
            {user?.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white">{user?.fullName}</h1>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>

        {/* Balance card */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl">
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Wallet Balance
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {formatKsh(user?.balanceCents ?? 0)}
            </div>
          </div>
          <Link
            href="/play"
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 font-bold text-xs shadow hover:scale-105 transition-all"
          >
            Play Now
          </Link>
        </div>
      </div>

      {/* Tabs (Compact) */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ENTRIES')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === 'ENTRIES'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>My Game Entries ({entries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('WALLET')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === 'WALLET'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Wallet & Top Up ({ledger.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
            activeTab === 'PROFILE'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Account</span>
        </button>
      </div>

      {/* Tab: Game Entries History */}
      {activeTab === 'ENTRIES' && (
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <Gamepad2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Game Entries Yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Ready to unveil the 10 mystery numbers? Try your luck for the KSh 100,000 jackpot!
              </p>
              <Link
                href="/play"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 font-bold text-xs"
              >
                Enter Official Draw
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                        {entry.entryReference}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {entry.gameName} (Rule #{entry.ruleVersion})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {entry.isWinner ? (
                        <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> 10-of-10 WINNER ({formatKsh(entry.prizeAwardedCents)})
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
                          Matched {entry.matchedCount} of 10
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* 10 Boxes Compact Snapshot */}
                  <div>
                    <div className="grid grid-cols-10 gap-1">
                      {entry.generatedNumbers.map((num, i) => {
                        const isMatch = entry.matchedPositions.includes(i);
                        return (
                          <div
                            key={i}
                            className={`p-1 rounded-lg text-center text-xs font-black ${
                              isMatch
                                ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                                : 'bg-slate-950 border border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="text-[7px] opacity-70">#{i + 1}</div>
                            <div>{num}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Wallet & Deposit */}
      {activeTab === 'WALLET' && (
        <div className="space-y-4" id="wallet">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Deposit Funds via Paystack (M-PESA / Card)
            </h3>
            <p className="text-xs text-slate-400">
              Top up your wallet balance securely. Instant automated verification.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {[100, 200, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDepositAmountKsh(amt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    depositAmountKsh === amt
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  KSh {amt}
                </button>
              ))}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
                <span className="text-[11px] text-slate-400 font-bold">KSh</span>
                <input
                  type="number"
                  min={10}
                  value={depositAmountKsh}
                  onChange={(e) => setDepositAmountKsh(Number(e.target.value))}
                  className="w-20 bg-transparent text-white font-bold text-xs focus:outline-none"
                />
              </div>
            </div>

            {depositError && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {depositError}
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={isDepositing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isDepositing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
              <span>Deposit KSh {depositAmountKsh} Now</span>
            </button>
          </div>

          {/* Ledger table (Compact) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              Transaction Ledger (Immutable Records)
            </h3>

            {ledger.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No ledger transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Reference</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">Balance After</th>
                      <th className="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-medium text-[11px]">
                    {ledger.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-300">
                          {item.reference}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              item.transactionType.startsWith('CREDIT')
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {item.transactionType}
                          </span>
                        </td>
                        <td
                          className={`py-2 px-3 font-bold ${
                            item.transactionType.startsWith('CREDIT')
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {item.transactionType.startsWith('CREDIT') ? '+' : '-'}
                          {formatKsh(item.amountCents)}
                        </td>
                        <td className="py-2 px-3 text-slate-200 font-bold">
                          {formatKsh(item.balanceAfterCents)}
                        </td>
                        <td className="py-2 px-3 text-slate-400 max-w-xs truncate">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Profile */}
      {activeTab === 'PROFILE' && (
        <div className="max-w-md p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white">Account Details</h3>
          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-slate-400">Full Name</span>
              <div className="text-white font-semibold">{user?.fullName}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Email Address</span>
              <div className="text-white font-semibold">{user?.email}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Phone Number</span>
              <div className="text-white font-semibold">{user?.phone || 'Not provided'}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Account Status</span>
              <div className="text-emerald-400 font-semibold">{user?.status}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
