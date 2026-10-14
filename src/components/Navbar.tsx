'use client';

import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Gamepad2,
  Wallet,
  User,
  Shield,
  Menu,
  X,
  LogOut,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { formatKsh } from '@/lib/currency';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN' | 'AUDITOR';
  balanceCents: string | number;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-13 sm:h-14">
          {/* Logo */}
          <NextLink href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-emerald-500 to-cyan-500 p-[1.5px] shadow-md shadow-amber-500/20 group-hover:shadow-emerald-500/30 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-400 text-sm tracking-wider">
                  TC
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-lg text-white tracking-tight">
                T CPI
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hidden xs:inline">
                OFFICIAL
              </span>
            </div>
          </NextLink>

          {/* Desktop Navigation Links (Compact) */}
          <nav className="hidden md:flex items-center gap-1">
            <NextLink
              href="/"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                pathname === '/'
                  ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Home
            </NextLink>
            <NextLink
              href="/play"
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                pathname === '/play'
                  ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                  : 'text-slate-200 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
              Play Now
            </NextLink>
            <NextLink
              href="/#rules"
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition-all"
            >
              Rules
            </NextLink>

            {user && (
              <NextLink
                href="/dashboard"
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  pathname === '/dashboard'
                    ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Dashboard
              </NextLink>
            )}

            {user && (user.role === 'ADMIN' || user.role === 'AUDITOR') && (
              <NextLink
                href="/admin"
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  pathname?.startsWith('/admin')
                    ? 'text-purple-400 bg-purple-500/15 border border-purple-500/30'
                    : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                Admin
              </NextLink>
            )}
          </nav>

          {/* User status & Auth Actions */}
          <div className="hidden md:flex items-center gap-2" suppressHydrationWarning>
            {mounted && !loading && user ? (
              <div className="flex items-center gap-2">
                {/* Wallet Pill */}
                <NextLink
                  href="/dashboard#wallet"
                  className="flex items-center gap-1.5 bg-slate-900/90 border border-emerald-500/30 px-2.5 py-1 rounded-lg hover:border-emerald-500/60 transition-all"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Wallet:</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {formatKsh(user.balanceCents)}
                  </span>
                </NextLink>

                {/* Profile Pill */}
                <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded-lg text-slate-200">
                  <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-amber-400">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium max-w-[100px] truncate">
                    {user.fullName.split(' ')[0]}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : mounted && !loading ? (
              <div className="flex items-center gap-1.5">
                <NextLink
                  href="/login"
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition-all"
                >
                  Log In
                </NextLink>
                <NextLink
                  href="/register"
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-sm transition-all flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Register
                </NextLink>
              </div>
            ) : null}
          </div>

          {/* Mobile Actions & Hamburger */}
          <div className="flex md:hidden items-center gap-1.5" suppressHydrationWarning>
            {mounted && user && (
              <NextLink
                href="/dashboard#wallet"
                className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md text-emerald-400 text-[11px] font-bold"
              >
                <Wallet className="w-3 h-3" />
                <span>{formatKsh(user.balanceCents)}</span>
              </NextLink>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-900 border border-slate-800 focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Android Optimized & Compact) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-3 pt-2 pb-4 space-y-1.5 shadow-xl">
          <NextLink
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-900 text-sm font-semibold"
          >
            <span>Home</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </NextLink>
          <NextLink
            href="/play"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm font-bold"
          >
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>Play Now (KSh 100)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
              KSh 50,000 Prize
            </span>
          </NextLink>
          <NextLink
            href="/#rules"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-900 text-sm font-semibold"
          >
            <span>Rules & Terms</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </NextLink>

          {user && (
            <NextLink
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-cyan-300 hover:bg-slate-900 text-sm font-semibold"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <span>My Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </NextLink>
          )}

          {user && (user.role === 'ADMIN' || user.role === 'AUDITOR') && (
            <NextLink
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-purple-300 bg-purple-950/30 border border-purple-500/30 text-sm font-semibold"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Admin Console</span>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-500" />
            </NextLink>
          )}

          <div className="pt-2 border-t border-slate-900">
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-rose-400 bg-rose-500/10 border border-rose-500/20 text-xs font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out ({user.email})</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <NextLink
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2 rounded-lg text-slate-200 bg-slate-900 border border-slate-800 text-xs font-bold text-center"
                >
                  Log In
                </NextLink>
                <NextLink
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2 rounded-lg text-slate-950 bg-gradient-to-r from-amber-400 to-emerald-400 text-xs font-bold text-center"
                >
                  Register
                </NextLink>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
