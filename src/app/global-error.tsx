'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-md w-full text-center space-y-6 bg-slate-900/80 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-2xl font-bold">
            !
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Application Error
          </h1>
          <p className="text-sm text-slate-400">
            An unexpected error occurred. Please refresh or try again.
          </p>
          {error?.digest && (
            <p className="text-xs text-slate-500 font-mono">
              Digest: #{error.digest}
            </p>
          )}
          {reset && (
            <button
              onClick={() => reset()}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors shadow-lg shadow-emerald-500/20"
            >
              Try Again
            </button>
          )}
        </div>
      </body>
    </html>
  );
}
