'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { changePassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function SecurityClient() {
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    mutationFn: (formData: FormData) => {
      const next = String(formData.get('newPassword'));
      if (next !== String(formData.get('confirmPassword'))) throw new Error('Passwords do not match');
      return changePassword(String(formData.get('currentPassword')), next);
    },
    onSuccess: () => setMessage('Password changed. Please log in again on your next session.'),
    onError: (err) => setMessage(err.message),
  });
  return (
    <Card className="max-w-xl p-6">
      <h1 className="text-2xl font-black">Security</h1>
      <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); setMessage(''); mutation.mutate(new FormData(event.currentTarget)); }}>
        <Input name="currentPassword" placeholder="Current password" type="password" required />
        <Input name="newPassword" placeholder="New password" type="password" required />
        <Input name="confirmPassword" placeholder="Confirm new password" type="password" required />
        <Button disabled={mutation.isPending}>{mutation.isPending ? 'Updating...' : 'Change password'}</Button>
        {message ? <p className="text-sm font-semibold text-muted">{message}</p> : null}
      </form>
    </Card>
  );
}
