import Link from 'next/link';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { formatKshPlain } from '@/lib/currency';
import { getAuthUser } from '@/lib/auth';
import {
  Gamepad2,
  Trophy,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import ActivityFeed from '@/components/ActivityFeed';
import LiveCommunityChat from '@/components/LiveCommunityChat';

export const dynamic = 'force-dynamic';

async function getPublishedGameConfig() {
  try {
    const config = await prisma.gameConfig.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });
    return config ? serializeBigInt(config) : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [config, user] = await Promise.all([
    getPublishedGameConfig(),
    getAuthUser(),
  ]);
  const targetNumbers: number[] = config?.targetNumbers
    ? JSON.parse(config.targetNumbers)
    : [7, 14, 21, 33, 42, 50, 63, 77, 88, 99];

  return (
    <div className="flex flex-col w-full overflow-hidden space-y-6 sm:space-y-8">
      {/* Hero Section (Compact & Mobile First) */}
      <section className="relative pt-6 pb-8 md:pt-10 md:pb-12 px-3 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4 sm:space-y-5">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Draw #{config?.version || 1} Is Live Now</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Unveil Ten Numbers.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400">
                Win KSh 100,000 Grand Prize.
              </span>
            </h1>
            <p className="max-w-xl mx-auto text-xs sm:text-base font-medium text-slate-300 leading-normal">
              Your KSh 100,000 is just one click away! Flip 10 mystery boxes, match the winning numbers, and get paid instantly to your M-PESA.
            </p>
          </div>

          {/* Key Value Stats (Compact 3-column card) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-md mx-auto">
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Standard Entry</div>
              <div className="text-sm sm:text-lg font-black text-white mt-0.5">
                {config ? formatKshPlain(config.entryPriceCents) : 'KSh 100'}
              </div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-b from-amber-500/10 to-slate-900/90 border border-amber-500/30">
              <div className="text-[10px] text-amber-400 font-bold flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3" />
                Grand Prize
              </div>
              <div className="text-sm sm:text-lg font-black text-amber-400 mt-0.5">
                {config ? formatKshPlain(config.prizeAmountCents) : 'KSh 100,000'}
              </div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Repeat Credit</div>
              <div className="text-sm sm:text-lg font-black text-emerald-400 mt-0.5">
                {config ? formatKshPlain(config.repeatCreditCents) : 'KSh 2'}
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            <Link
              href="/play"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <Gamepad2 className="w-4 h-4 text-slate-950" />
              <span>PLAY NOW (KSh 100)</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </Link>
            <Link
              href="#published-targets"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <span>View Target Combination</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Target Combination Showcase (Compact 10 Boxes) */}
      <section id="published-targets" className="max-w-4xl mx-auto px-3 sm:px-6 w-full space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-white">
              Official Target Combination (Draw #{config?.version || 1})
            </h2>
            <p className="text-[11px] text-slate-400">
              Match these 10 ordered numbers to win KSh 100,000.
            </p>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            Published
          </span>
        </div>

        {/* 10 Boxes Display (Mobile 5x2, Desktop 10 across) */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2 p-3 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl">
          {targetNumbers.map((num, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/30 text-center"
            >
              <span className="text-[9px] text-slate-400 font-bold">#{idx + 1}</span>
              <span className="text-base sm:text-xl font-black text-amber-400">
                {num}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Live Activity Feed & Active Player Chat Stream */}
      <section className="max-w-4xl mx-auto px-3 sm:px-6 w-full space-y-6">
        <ActivityFeed />
        <LiveCommunityChat currentUser={user} />
      </section>

      {/* How It Works (Compact 3 Steps) */}
      <section className="max-w-4xl mx-auto px-3 sm:px-6 w-full space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-white">
          How to Play T CPI
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-xs font-black text-emerald-400">1. Authorize Entry</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Pay KSh 100 via Paystack M-PESA or your wallet. Repeat entries cost KSh 2!
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-xs font-black text-amber-400">2. Flip 10 Mystery Boxes</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Watch the sequential reveal! CSPRNG generates your numbers with SHA-256 seed.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-xs font-black text-cyan-400">3. Claim KSh 100,000</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Match all 10 target positions for prompt official M-PESA disbursement.
            </p>
          </div>
        </div>
      </section>

      {/* Rules & Integrity (Compact) */}
      <section id="rules" className="max-w-4xl mx-auto px-3 sm:px-6 w-full pb-6 space-y-2 text-xs">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 space-y-1">
          <div className="text-white font-bold flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Official Game Rules & Integrity Standards
          </div>
          <p className="text-[11px] leading-relaxed">
            18+ only. Server-side authoritative determination (browser code never decides outcomes).
            Idempotent payment tokens prevent duplicate charges. No fabricated testimonials.
          </p>
        </div>
      </section>
    </div>
  );
}
