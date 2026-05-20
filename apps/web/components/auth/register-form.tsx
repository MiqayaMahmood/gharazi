'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { register } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: (formData: FormData) => {
      const password = String(formData.get('password'));
      if (password !== String(formData.get('confirmPassword'))) throw new Error('Passwords do not match');
      return register({
        fullName: String(formData.get('fullName')),
        email: String(formData.get('email')),
        phoneNumber: String(formData.get('phoneNumber')),
        password,
        role: String(formData.get('role')),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['current-user'] });
      router.push(searchParams.get('next') ?? '/dashboard');
    },
    onError: (err) => setError(err.message),
  });
  return (
    <Card className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-black">Create account</h1>
      <p className="mt-2 text-sm text-muted">Admin and moderator roles are assigned internally only.</p>
      <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); setError(''); mutation.mutate(new FormData(event.currentTarget)); }}>
        <Input name="fullName" placeholder="Full name" required />
        <Input name="email" placeholder="Email" type="email" required />
        <Input name="phoneNumber" placeholder="+92 300 0000000" required />
        <Select name="role" defaultValue="buyer">
          <option value="buyer">Buyer</option>
          <option value="tenant">Tenant</option>
          <option value="owner">Owner</option>
          <option value="agent">Agent</option>
          <option value="developer">Developer</option>
        </Select>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="password" placeholder="Password" type="password" required />
          <Input name="confirmPassword" placeholder="Confirm password" type="password" required />
        </div>
        <label className="flex gap-2 text-xs leading-5 text-muted">
          <input className="mt-1" type="checkbox" required />
          <span>By creating an account, I agree to the <Link className="font-bold text-trust" href="/terms">Terms</Link> and <Link className="font-bold text-trust" href="/privacy-policy">Privacy Policy</Link>.</span>
        </label>
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <Button disabled={mutation.isPending}>{mutation.isPending ? 'Creating...' : 'Register'}</Button>
      </form>
      <p className="mt-4 text-sm font-semibold">Already registered? <Link className="text-trust" href="/login">Login</Link></p>
    </Card>
  );
}
