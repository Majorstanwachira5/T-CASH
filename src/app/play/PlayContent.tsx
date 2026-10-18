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
  attemptNumber?: number;
  createdAt: string;
}

export default function PlayContent() {
  const router = useRouter();
  const [config, setConfig] = useState<GameConfigData | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; fullName: string; balanceCents: string | number; phone?: string | null } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Direct M-PESA state
  const [phone, setPhone] = useState('');
  const [isWaitingForPin, setIsWaitingForPin] = useState(false);
  const [promptStatus, setPromptStatus] = useState<string | null>(null);

  // Game state
  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'PAYSTACK' | 'REPEAT_CREDIT'>('PAYSTACK');
  const [pastEntriesCount, setPastEntriesCount] = useState<number>(0);
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
        if (userData.user.phone) {
          setPhone(userData.user.phone);
        }
      } else {
        setUser(null);
      }

      const histData = await histRes.json();
      if (histData.success && histData.entries) {
        setPastEntriesCount(histData.entries.length);
        if (histData.entries.length > 0) {
          setHasEnteredBefore(true);
        }
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

  // Set smart default payment method based on available wallet balance
  useEffect(() => {
    if (!user) return;
    const balance = Number(user.balanceCents || 0);
    if (hasEnteredBefore) {
      if (balance >= 200) {
        setPaymentMethod('REPEAT_CREDIT');
      } else {
        setPaymentMethod('PAYSTACK');
      }
    } else {
      if (balance >= 10000) {
        setPaymentMethod('WALLET');
      } else {
        setPaymentMethod('PAYSTACK');
      }
    }
  }, [user, hasEnteredBefore]);

  // Check URL parameters for seamless auto-reveal after Paystack redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('paymentRef') || params.get('reference') || params.get('trxref');
    const autoRevealParam = params.get('autoReveal');

    if (refParam && (autoRevealParam === 'true' || autoRevealParam === '1')) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      executeVerifiedDraw(refParam);
    }
  }, []);

  const executeVerifiedDraw = async (ref: string) => {
    setIsSubmitting(true);
    setErrorMsg('');
    setDisplayedBoxes(Array(10).fill(null));
    setRevealingIndex(-1);

    try {
      const playRes = await fetch('/api/game/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'PAYSTACK',
          paymentReference: ref,
          idempotencyKey: `entry_${ref}`,
        }),
      });

      const playData = await playRes.json();
      if (!playData.success) {
        throw new Error(playData.message || 'Draw execution failed');
      }

      const result: GameEntryOutcome = playData.entry;
      setOutcome(result);
      animateReveal(result.generatedNumbers);

      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to authorize draw';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  const handlePlay = async () => {
    if (!user) {
      router.push('/login?redirect=/play');
      return;
    }

    const cleanDigits = phone.replace(/[^0-9]/g, '');
    if (!cleanDigits || cleanDigits.length < 8) {
      setErrorMsg('Please enter your Safaricom M-PESA phone number above to receive the prompt.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    setOutcome(null);
    setDisplayedBoxes(Array(10).fill(null));
    setRevealingIndex(-1);
    setIsWaitingForPin(true);
    setPromptStatus('Sending M-PESA prompt to your phone...');

    const idempotencyKey = `direct_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // 1. Direct server-to-server STK push charge via Paystack
      const chargeRes = await fetch('/api/payments/charge-mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          amountKsh: 100,
          purpose: 'GAME_ENTRY',
          idempotencyKey,
        }),
      });

      const chargeData = await chargeRes.json();
      if (!chargeData.success) {
        throw new Error(chargeData.message || 'Failed to trigger M-PESA prompt');
      }

      const reference = chargeData.reference;
      setPromptStatus('📱 STK prompt sent! Enter your M-PESA PIN on your phone...');

      // 2. Poll transaction verification every 2.5s (up to 55s)
      let pollCount = 0;
      const maxPolls = 22;
      const pollTimer = setInterval(async () => {
        pollCount++;
        try {
          const verifyRes = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`);
          const verifyData = await verifyRes.json();

          if (verifyData.success && verifyData.status === 'SUCCESS') {
            clearInterval(pollTimer);
            setIsWaitingForPin(false);
            setPromptStatus('Payment confirmed! Revealing numbers...');
            await executeVerifiedDraw(reference);
            return;
          }

          if (verifyData.status === 'FAILED') {
            clearInterval(pollTimer);
            setIsWaitingForPin(false);
            setIsSubmitting(false);
            setPromptStatus(null);
            setErrorMsg('Payment was cancelled or failed on your phone.');
            return;
          }

          if (pollCount >= maxPolls) {
            clearInterval(pollTimer);
            setIsWaitingForPin(false);
            setIsSubmitting(false);
            setPromptStatus(null);
            setErrorMsg('Payment request timed out. If you entered your PIN, please refresh.');
          }
        } catch (e) {
          console.error('Polling verification error:', e);
        }
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to prompt M-PESA payment';
      setErrorMsg(msg);
      setIsSubmitting(false);
      setIsWaitingForPin(false);
      setPromptStatus(null);
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
    }, 150);
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
            {user && (
              <span className={`px-2 py-0.2 rounded border text-[10px] font-black uppercase ${
                pastEntriesCount >= 10
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              }`}>
                Attempt #{pastEntriesCount + 1}
                {pastEntriesCount >= 10 ? ' (Jackpot Eligible)' : ` (${10 - pastEntriesCount} to qualify)`}
              </span>
            )}
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
              <>
                <div className="text-xs font-bold text-white">
                  Drawn Result: Matched {outcome.matchedCount} of 10 positions
                </div>
                {outcome.attemptNumber !== undefined && outcome.attemptNumber < 10 && (
                  <div className="text-[10px] text-cyan-300 font-semibold">
                    🎯 Attempt {outcome.attemptNumber} of 10 — {10 - outcome.attemptNumber} more play{10 - outcome.attemptNumber !== 1 ? 's' : ''} until jackpot eligible!
                  </div>
                )}
                {outcome.attemptNumber !== undefined && outcome.attemptNumber >= 10 && (
                  <div className="text-[10px] text-amber-300 font-semibold">
                    ⚡ You are now jackpot eligible! Next play could win KSh 50,000!
                  </div>
                )}
              </>
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

        {/* Primary Play Action & Direct M-PESA Phone Input */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col items-center gap-3">
          {/* Direct Phone Number Input Field */}
          <div className="w-full sm:w-80 space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label htmlFor="mpesa-phone-input" className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                M-PESA Phone Number
              </label>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Instant STK Push
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400 font-black text-xs font-mono select-none">
                🇰🇪 +254
              </div>
              <input
                id="mpesa-phone-input"
                type="tel"
                placeholder="712 345 678"
                value={phone.replace(/^\+254/, '').replace(/^254/, '')}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting || isWaitingForPin}
                className="w-full pl-22 pr-4 py-3 rounded-xl bg-slate-950 border-2 border-emerald-500/50 text-white font-mono text-base font-bold placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 transition-all shadow-inner disabled:opacity-60"
              />
            </div>
          </div>

          {/* Active waiting for PIN alert */}
          {isWaitingForPin && promptStatus && (
            <div className="w-full sm:w-80 p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/60 text-emerald-300 text-xs flex items-center gap-2.5 animate-pulse shadow-lg">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 flex-shrink-0" />
              <span className="font-bold">{promptStatus}</span>
            </div>
          )}

          {/* Primary Gold Play Action Button */}
          <button
            type="button"
            id="tcpi-play-btn"
            onClick={handlePlay}
            disabled={isSubmitting || isWaitingForPin}
            className={`w-full sm:w-80 py-4 px-6 rounded-2xl font-black text-base tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.5)] border border-yellow-200/60 flex items-center justify-center gap-2.5 transition-all transform ${
              isSubmitting || isWaitingForPin
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700'
                : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 hover:scale-105 active:scale-95 cursor-pointer'
            }`}
          >
            {isSubmitting || isWaitingForPin ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                <span>Waiting for M-PESA PIN...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-slate-950 fill-slate-950" />
                <span>PLACE 100 TO WIN</span>
              </>
            )}
          </button>
          <span className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
            <span>💚</span> M-PESA STK prompt will appear on your phone screen
          </span>
        </div>
      </div>

      {/* PLAYER COMMUNITY COMMENT SECTION (Underneath game) */}
      <PlayerComments currentUser={user} />

      {/* CONTINUOUS LIVE ACTIVITY FEED (Underneath comments) */}
      <ActivityFeed />
    </div>
  );
}
