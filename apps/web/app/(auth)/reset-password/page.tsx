import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return <div className="mx-auto max-w-7xl px-4 py-14"><Suspense><ResetPasswordForm /></Suspense></div>;
}
