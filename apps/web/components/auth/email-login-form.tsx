'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { loginEmail } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function EmailLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const next = searchParams.get('returnTo') ?? searchParams.get('next') ?? '/dashboard';
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: (formData: FormData) => loginEmail(String(formData.get('email')), String(formData.get('password'))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['current-user'] });
      router.push(next);
    },
    onError: (err) => setError(err.message),
  });
  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-black">Login</h1>
      <p className="mt-2 text-sm text-muted">Use your email and password, or continue with OTP below.</p>
      <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}>
        <Input name="email" placeholder="Email" type="email" required />
        <Input name="password" placeholder="Password" type="password" required />
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <Button disabled={mutation.isPending}>{mutation.isPending ? 'Signing in...' : 'Login'}</Button>
      </form>
      <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm font-semibold">
        <Link className="text-trust" href={next ? `/register?returnTo=${encodeURIComponent(next)}` : '/register'}>Create account</Link>
        <Link className="text-trust" href="/forgot-password">Forgot password?</Link>
      </div>
    </Card>
  );
}
