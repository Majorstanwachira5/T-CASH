import { Suspense } from 'react';
import LoginForm from './LoginForm';
import { RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-3 py-6 sm:px-6">
      <Suspense fallback={<RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
