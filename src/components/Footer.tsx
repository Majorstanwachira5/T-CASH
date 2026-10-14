'use client';

import Link from 'next/link';
import { ShieldCheck, Award, Lock, HelpCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center font-black text-slate-950 text-xs">
                TC
              </div>
              <span className="text-base font-extrabold text-white tracking-tight">
                T CPI
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              Kenya’s premier 10-box mystery number draw game. Match all ten ordered positions
              to unlock the grand published prize of KSh 50,000. Verified outcomes with cryptographically
              secure RNG and transparent tamper-evident audit trails.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-300">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                18+ Adult Verified
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                <Lock className="w-3 h-3 text-cyan-400" />
                Paystack Encrypted
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                <Award className="w-3 h-3 text-amber-400" />
                KSh 50,000 Prize
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/" className="hover:text-amber-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/play" className="hover:text-emerald-400 transition-colors">
                  Enter Draw (KSh 100)
                </Link>
              </li>
              <li>
                <Link href="/#rules" className="hover:text-slate-200 transition-colors">
                  Official Game Rules
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-slate-200 transition-colors">
                  Player Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-purple-400 transition-colors">
                  Admin Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Compliance</h4>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-amber-400" />
                Player Protection Notice
              </div>
              <div>Participate responsibly. 18+ only. Strict server RNG validation.</div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <div>
            &copy; 2026 T CPI. All rights reserved. Registered under Kenya Consumer & Gaming Regulations.
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-emerald-400 font-medium">Server Online (Port 3005)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
