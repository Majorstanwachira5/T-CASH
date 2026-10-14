import RegisterForm from './RegisterForm';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-3 py-6 sm:px-6">
      <RegisterForm />
    </div>
  );
}
