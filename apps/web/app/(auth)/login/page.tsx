import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EmailLoginForm } from '@/components/auth/email-login-form';
import { OtpLoginForm } from '@/components/auth/otp-login-form';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to Gharazi Pakistan with phone OTP.',
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14">
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense><EmailLoginForm /></Suspense>
        <Suspense><OtpLoginForm /></Suspense>
      </div>
    </div>
  );
}
