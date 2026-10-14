'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatKsh } from '@/lib/currency';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [transaction, setTransaction] = useState<any>(null);

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      setMessage('No payment reference found in query string.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });

        const data = await res.json();
        if (data.success) {
          setSuccess(true);
          setMessage(data.message || 'Payment confirmed and verified.');
          setTransaction(data.transaction);
        } else {
          setSuccess(false);
          setMessage(data.message || 'Payment verification could not be completed.');
        }
      } catch (err: unknown) {
        setSuccess(false);
        setMessage('Network error during payment verification.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [reference]);

  return (
    <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center space-y-6">
      {loading ? (
        <div className="py-8 space-y-4">
          <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-white">Authoritatively Verifying Payment...</h2>
          <p className="text-xs text-slate-400">
            Contacting payment gateway to confirm settlement of ref: {reference}
          </p>
        </div>
      ) : success ? (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white">Payment Confirmed!</h2>
          <p className="text-sm text-slate-300">{message}</p>

          {transaction && (
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Reference:</span>
                <span className="font-mono text-white">{transaction.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-emerald-400">
                  {formatKsh(transaction.amountCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Purpose:</span>
                <span className="text-slate-200">{transaction.purpose}</span>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/play"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:scale-105 transition-all"
            >
              <span>Enter Draw Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white">Verification Incomplete</h2>
          <p className="text-sm text-slate-300">{message}</p>

          <div className="pt-4 flex flex-col gap-2">
            <Link
              href="/play"
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all"
            >
              Return to Game
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <Suspense fallback={<RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
