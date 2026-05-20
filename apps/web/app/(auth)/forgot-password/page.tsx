import { PasswordRequestForm } from '@/components/auth/password-request-form';

export const metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return <div className="mx-auto max-w-7xl px-4 py-14"><PasswordRequestForm /></div>;
}
