'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { forgotPassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function PasswordRequestForm() {
  const [sent, setSent] = useState(false);
  const mutation = useMutation({ mutationFn: (formData: FormData) => forgotPassword(String(formData.get('email'))), onSuccess: () => setSent(true) });
  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-black">Reset your password</h1>
      {sent ? <p className="mt-4 text-sm font-semibold text-trust">If an account exists, a reset link has been sent.</p> : (
        <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}>
          <Input name="email" placeholder="Email" type="email" required />
          <Button disabled={mutation.isPending}>{mutation.isPending ? 'Sending...' : 'Send reset link'}</Button>
        </form>
      )}
    </Card>
  );
}
