import { Suspense } from 'react';
import CallbackContent from './CallbackContent';
import { RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function PaymentCallbackPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <Suspense fallback={<RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
