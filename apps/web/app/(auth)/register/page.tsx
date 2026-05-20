import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = { title: 'Register', description: 'Create your Gharazi Pakistan account.' };

export default function RegisterPage() {
  return <div className="mx-auto max-w-7xl px-4 py-14"><Suspense><RegisterForm /></Suspense></div>;
}
