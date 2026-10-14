'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/play';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.user?.role === 'ADMIN' && redirect === '/play') {
        router.push('/admin');
      } else {
        router.push(redirect);
      }
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm w-full space-y-4 bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl relative">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-slate-950 font-black text-lg shadow">
          TC
        </div>
        <h2 className="text-lg sm:text-xl font-black text-white">Sign In to T CPI</h2>
        <p className="text-[11px] text-slate-400">
          Enter the 10-box draw and view your entry history
        </p>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300">Email Address</label>
          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300">Password</label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      <div className="text-center text-[11px] text-slate-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-emerald-400 font-bold hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
}
