'use client';

import { useEffect } from 'react';
import { TriangleAlert, RefreshCw } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root error boundary caught:', error);
  }, [error]);

  return (
    <main className="flex-1 flex items-center justify-center min-h-[60vh] px-3 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <TriangleAlert className="w-16 h-16 text-rose-400" />
        </div>

        <h2 className="text-2xl font-black text-white">Something Went Wrong</h2>

        <p className="text-sm text-slate-400 leading-relaxed">
          An unexpected error occurred while rendering this page. Your request
          could not be completed.
        </p>

        {error?.digest && (
          <p className="text-[11px] text-slate-500 font-mono">
            Error ID: #{error.digest}
          </p>
        )}

        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black text-sm shadow-lg hover:from-amber-400 hover:to-emerald-400 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    </main>
  );
}
