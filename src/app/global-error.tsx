'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-xl font-black">
            !
          </div>
          <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          <p className="text-slate-400 text-xs">
            An unexpected error occurred. Please try reloading the application.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-bold rounded-xl text-xs transition-all shadow"
            >
              Try Again
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
