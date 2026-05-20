'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { resetPassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const router = useRouter();
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: (formData: FormData) => {
      const password = String(formData.get('password'));
      if (password !== String(formData.get('confirmPassword'))) throw new Error('Passwords do not match');
      return resetPassword(token, password);
    },
    onSuccess: () => router.push('/login'),
    onError: (err) => setError(err.message),
  });
  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-black">Choose a new password</h1>
      <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); setError(''); mutation.mutate(new FormData(event.currentTarget)); }}>
        <Input name="password" placeholder="New password" type="password" required />
        <Input name="confirmPassword" placeholder="Confirm password" type="password" required />
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <Button disabled={mutation.isPending || !token}>{mutation.isPending ? 'Updating...' : 'Reset password'}</Button>
      </form>
    </Card>
  );
}
