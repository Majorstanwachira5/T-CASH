'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Gamepad2,
  Sparkles,
  Trophy,
  Wallet,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { formatKsh, formatKshPlain } from '@/lib/currency';
import PlayerComments from '@/components/PlayerComments';
import ActivityFeed from '@/components/ActivityFeed';

export const dynamic = 'force-dynamic';

interface GameConfigData {
  id: string;
  version: number;
  name: string;
  entryPriceCents: string | number;
  repeatCreditCents: string | number;
  prizeAmountCents: string | number;
  totalPositions: number;
  numberMin: number;
  numberMax: number;
  isPublished: boolean;
  targetNumbers: number[];
}

interface GameEntryOutcome {
  entryReference: string;
  generatedNumbers: number[];
  targetNumbers: number[];
  matchedIndices: number[];
  matchedCount: number;
  isWinner: boolean;
  prizeAwardedCents: string | number;
  ruleVersion: number;
  createdAt: string;
}

export default function PlayPage() {
  const router = useRouter();
  const [config, setConfig] = useState<GameConfigData | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; fullName: string; balanceCents: string | number } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Game state
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'PAYSTACK' | 'REPEAT_CREDIT'>('WALLET');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [revealingIndex, setRevealingIndex] = useState<number>(-1);
  const [outcome, setOutcome] = useState<GameEntryOutcome | null>(null);
  const [hasEnteredBefore, setHasEnteredBefore] = useState(false);

  // 10 boxes displayed state
  const [displayedBoxes, setDisplayedBoxes] = useState<Array<number | null>>(Array(10).fill(null));

  const loadData = async () => {
    try {
      setLoadingConfig(true);
      const [configRes, userRes, histRes] = await Promise.all([
        fetch('/api/game/current'),
        fetch('/api/auth/me'),
        fetch('/api/game/history'),
      ]);

      const configData = await configRes.json();
      if (configData.success && configData.config) {
        setConfig(configData.config);
      }

      const userData = await userRes.json();
      if (userData.authenticated && userData.user) {
        setUser(userData.user);
      } else {
        setUser(null);
      }

      const histData = await histRes.json();
      if (histData.success && histData.entries && histData.entries.length > 0) {
        setHasEnteredBefore(true);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to load current game draw information.');
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (hasEnteredBefore) {
      setPaymentMethod('REPEAT_CREDIT');
    } else {
      setPaymentMethod('WALLET');
    }
  }, [hasEnteredBefore]);

  const handlePlay = async () => {
    if (!user) {
      router.push('/login?redirect=/play');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    setOutcome(null);
    setDisplayedBoxes(Array(10).fill(null));
    setRevealingIndex(-1);

    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      if (paymentMethod === 'PAYSTACK') {
        const initRes = await fetch('/api/payments/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountKsh: 100,
            purpose: 'GAME_ENTRY',
            idempotencyKey,
          }),
        });
        const initData = await initRes.json();
        if (!initData.success) {
          throw new Error(initData.message || 'Payment initialization failed');
        }
        window.location.href = initData.data.authorizationUrl;
        return;
      }

      const playRes = await fetch('/api/game/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          idempotencyKey,
        }),
      });

      const playData = await playRes.json();
      if (!playData.success) {
        throw new Error(playData.message || 'Draw execution failed');
      }

      const result: GameEntryOutcome = playData.entry;
      setOutcome(result);
      animateReveal(result.generatedNumbers);

      // Refresh user balance
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.authenticated) {
        setUser(meData.user);
      }
      setHasEnteredBefore(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to authorize draw';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  const animateReveal = (numbers: number[]) => {
    const revealed: Array<number | null> = Array(10).fill(null);
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx < 10) {
        revealed[currentIdx] = numbers[currentIdx];
        setDisplayedBoxes([...revealed]);
        setRevealingIndex(currentIdx);
        currentIdx++;
      } else {
        clearInterval(interval);
        setRevealingIndex(-1);
        setIsSubmitting(false);
      }
    }, 150); // Fast 150ms sequential reveal for crisp mobile interaction
  };

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Top Banner (Compact: Draw info & Wallet in a single line on mobile) */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
              Draw #{config?.version || 1}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
              <ShieldCheck className="w-3 h-3 text-cyan-400" /> CSPRNG Verified
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white mt-0.5">
            10-Box Mystery Draw
          </h1>
        </div>

        {/* User Balance pill */}
        {user ? (
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <div className="text-right">
              <div className="text-[9px] text-slate-400 uppercase font-bold">Balance</div>
              <div className="text-xs sm:text-sm font-black text-emerald-400">
                {formatKsh(user.balanceCents)}
              </div>
            </div>
            <Link
              href="/dashboard#wallet"
              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold ml-1 hover:bg-emerald-500/30"
            >
              +
            </Link>
          </div>
        ) : (
          <Link
            href="/login?redirect=/play"
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 font-bold text-xs"
          >
            Sign In to Play
          </Link>
        )}
      </div>

      {/* Target Numbers Strip (Ultra-compact target preview) */}
      <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="font-bold text-amber-400 flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Targets for {config ? formatKshPlain(config.prizeAmountCents) : 'KSh 50,000'} Jackpot:
          </span>
          <span className="text-[10px] text-slate-400">Range: 1 – 99</span>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-1.5">
          {config?.targetNumbers ? (
            config.targetNumbers.map((num, i) => (
              <div
                key={i}
                className="py-1 px-1 rounded-lg bg-slate-950 border border-amber-500/30 text-center"
              >
                <div className="text-[8px] text-slate-500">#{i + 1}</div>
                <div className="text-xs sm:text-sm font-black text-amber-400">{num}</div>
              </div>
            ))
          ) : (
            <div className="col-span-10 text-center py-1 text-xs text-slate-500">
              Loading targets...
            </div>
          )}
        </div>
      </div>

      {/* THE 10 MYSTERY BOXES (Compact & Visible Above The Fold on Mobile) */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-white text-[12px]">Your 10 Mystery Positions</span>
          <span className="text-[10px] text-slate-400">All 10 required for grand prize</span>
        </div>

        {/* 10 Boxes Grid: Mobile 5x2, Desktop 10 across */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
          {Array.from({ length: 10 }).map((_, idx) => {
            const val = displayedBoxes[idx];
            const isRevealing = revealingIndex === idx;
            const targetVal = config?.targetNumbers?.[idx];
            const isMatch = val !== null && targetVal !== undefined && val === targetVal;

            return (
              <div
                key={idx}
                className={`aspect-[3/4] sm:aspect-square flex flex-col items-center justify-center rounded-xl p-1 transition-all duration-200 select-none ${
                  val !== null
                    ? isMatch
                      ? 'bg-gradient-to-b from-emerald-600 to-emerald-950 border-2 border-emerald-400 shadow-md scale-102'
                      : 'bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700'
                    : isRevealing
                    ? 'bg-amber-500/20 border-2 border-amber-400 animate-pulse'
                    : 'bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800'
                }`}
              >
                <span className="text-[8px] font-bold text-slate-400 mb-0.5">#{idx + 1}</span>

                <div className="flex-1 flex items-center justify-center">
                  {val !== null ? (
                    <span
                      className={`text-xl sm:text-2xl font-black ${
                        isMatch ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {val}
                    </span>
                  ) : (
                    <span className="text-xl sm:text-2xl font-black text-slate-600">?</span>
                  )}
                </div>

                {val !== null && (
                  <span
                    className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                      isMatch
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isMatch ? 'MATCH' : 'MISS'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Outcome result pill if finished */}
        {outcome && (
          <div
            className={`p-3 rounded-xl border text-center space-y-1 ${
              outcome.isWinner
                ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}
          >
            {outcome.isWinner ? (
              <div className="font-black text-sm text-amber-400 flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4 animate-bounce" />
                CONGRATULATIONS! QUALIFYING 10-OF-10 MATCH ({formatKsh(outcome.prizeAwardedCents)})
              </div>
            ) : (
              <div className="text-xs font-bold text-white">
                Drawn Result: Matched {outcome.matchedCount} of 10 positions
              </div>
            )}
            <div className="text-[10px] text-slate-400 font-mono">
              Ref: {outcome.entryReference} • Rule #{outcome.ruleVersion}
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Compact Controls & Payment Selector */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            {/* Wallet button */}
            <button
              type="button"
              onClick={() => setPaymentMethod('WALLET')}
              disabled={isSubmitting}
              className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                paymentMethod === 'WALLET'
                  ? 'bg-emerald-500/15 border-emerald-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">Wallet</div>
                <div className="text-[9px] text-slate-400">
                  {config ? formatKshPlain(config.entryPriceCents) : 'KSh 100'}
                </div>
              </div>
            </button>

            {/* Repeat credit button */}
            <button
              type="button"
              onClick={() => setPaymentMethod('REPEAT_CREDIT')}
              disabled={isSubmitting || !hasEnteredBefore}
              className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                paymentMethod === 'REPEAT_CREDIT'
                  ? 'bg-amber-500/15 border-amber-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 disabled:opacity-40'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-amber-400 truncate">Repeat</div>
                <div className="text-[9px] text-slate-400">
                  {config ? formatKshPlain(config.repeatCreditCents) : 'KSh 2'}
                </div>
              </div>
            </button>

            {/* Paystack button */}
            <button
              type="button"
              onClick={() => setPaymentMethod('PAYSTACK')}
              disabled={isSubmitting}
              className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                paymentMethod === 'PAYSTACK'
                  ? 'bg-cyan-500/15 border-cyan-400 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <CreditCard className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-cyan-400 truncate">M-PESA</div>
                <div className="text-[9px] text-slate-400">Checkout</div>
              </div>
            </button>
          </div>

          {/* Primary Play Action Button */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handlePlay}
              disabled={isSubmitting}
              className={`w-full sm:w-72 py-3 px-4 rounded-xl font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all ${
                isSubmitting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500 hover:from-amber-300 hover:to-emerald-400 text-slate-950 hover:scale-102 active:scale-98'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authorizing Draw...</span>
                </>
              ) : (
                <>
                  <Gamepad2 className="w-5 h-5" />
                  <span>
                    {paymentMethod === 'REPEAT_CREDIT'
                      ? 'PLAY REPEAT (KSh 2)'
                      : 'PLAY NOW (KSh 100)'}
                  </span>
                </>
              )}
            </button>
            <span className="text-[10px] text-slate-500">
              CSPRNG execution validated on server • Guarded against duplicate requests
            </span>
          </div>
        </div>
      </div>

      {/* PLAYER COMMUNITY COMMENT SECTION (Underneath game) */}
      <PlayerComments currentUser={user} />

      {/* CONTINUOUS LIVE ACTIVITY FEED (Underneath comments) */}
      <ActivityFeed />
    </div>
  );
}
