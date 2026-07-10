'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { register } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { HelpTooltip } from '@/components/ui/help-tooltip';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'professional'>('individual');
  const mutation = useMutation({
    mutationFn: (formData: FormData) => {
      const password = String(formData.get('password'));
      if (password !== String(formData.get('confirmPassword'))) throw new Error('Passwords do not match');
      return register({
        fullName: String(formData.get('fullName')),
        email: String(formData.get('email')),
        phoneNumber: String(formData.get('phoneNumber')),
        password,
        role: accountType === 'professional' ? 'agent' : 'owner',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['current-user'] });
      router.push(searchParams.get('returnTo') ?? searchParams.get('next') ?? '/dashboard');
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
        <div className="grid gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-bold">
            Account type
            <HelpTooltip text="Choose Individual for personal buying, renting, saving, inquiries, and owner-posted listings. Choose Company / Professional for agencies, agents, developers, builders, and property businesses." />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <RoleCard
              checked={accountType === 'individual'}
              label="Individual"
              description="For buyers, tenants, and owners posting personal property."
              onChange={() => setAccountType('individual')}
            />
            <RoleCard
              checked={accountType === 'professional'}
              label="Company / Professional"
              description="For agents, agencies, developers, and property businesses."
              onChange={() => setAccountType('professional')}
            />
          </div>
          <p className="text-xs text-muted">
            Professional company, agency, developer, subscription, and verification tools are being expanded in the next phase.
          </p>
        </div>
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
      <p className="mt-4 text-sm font-semibold">Already registered? <Link className="text-trust" href={searchParams.get('returnTo') ? `/login?returnTo=${encodeURIComponent(searchParams.get('returnTo') as string)}` : '/login'}>Login</Link></p>
    </Card>
  );
}

function RoleCard({ checked, label, description, onChange }: { checked: boolean; label: string; description: string; onChange: () => void }) {
  return (
    <label className={`grid cursor-pointer gap-2 rounded-md border p-4 ${checked ? 'border-trust bg-emerald-50' : 'border-line bg-white'}`}>
      <span className="flex items-center gap-2 text-sm font-black">
        <input type="radio" name="accountType" checked={checked} onChange={onChange} />
        {label}
      </span>
      <span className="text-xs font-semibold leading-5 text-muted">{description}</span>
    </label>
  );
}
