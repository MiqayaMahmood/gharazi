'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { requestOtp, verifyOtp } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const phoneSchema = z.object({ phoneNumber: z.string().min(10, 'Enter a valid Pakistan phone number') });
const otpSchema = z.object({ code: z.string().min(4, 'Enter the OTP code') });

export function OtpLoginForm() {
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({ resolver: zodResolver(phoneSchema), defaultValues: { phoneNumber: '' } });
  const otpForm = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema), defaultValues: { code: '' } });
  const requestMutation = useMutation({ mutationFn: requestOtp, onSuccess: (_, value) => { setPhoneNumber(value); setStep('otp'); } });
  const verifyMutation = useMutation({ mutationFn: (code: string) => verifyOtp(phoneNumber, code), onSuccess: () => { setStep('success'); router.push(next); } });

  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-black">Login with OTP</h1>
      <p className="mt-2 text-sm text-muted">Use your mobile number to continue. No password required.</p>
      {step === 'phone' ? (
        <form className="mt-6 grid gap-4" onSubmit={phoneForm.handleSubmit((values) => requestMutation.mutate(values.phoneNumber))}>
          <div>
            <label className="mb-1 block text-sm font-bold" htmlFor="phone">Phone number</label>
            <Input id="phone" placeholder="+92 300 0000000" {...phoneForm.register('phoneNumber')} />
            {phoneForm.formState.errors.phoneNumber ? <p className="mt-1 text-sm text-red-700">{phoneForm.formState.errors.phoneNumber.message}</p> : null}
          </div>
          <Button disabled={requestMutation.isPending}>{requestMutation.isPending ? 'Sending...' : 'Request OTP'}</Button>
        </form>
      ) : null}
      {step === 'otp' ? (
        <form className="mt-6 grid gap-4" onSubmit={otpForm.handleSubmit((values) => verifyMutation.mutate(values.code))}>
          <div>
            <label className="mb-1 block text-sm font-bold" htmlFor="otp">OTP code</label>
            <Input id="otp" inputMode="numeric" placeholder="123456" {...otpForm.register('code')} />
            {otpForm.formState.errors.code ? <p className="mt-1 text-sm text-red-700">{otpForm.formState.errors.code.message}</p> : null}
          </div>
          <Button disabled={verifyMutation.isPending}>{verifyMutation.isPending ? 'Verifying...' : 'Verify and continue'}</Button>
          <button className="text-sm font-bold text-trust" type="button" onClick={() => requestMutation.mutate(phoneNumber)}>Resend OTP</button>
        </form>
      ) : null}
      {step === 'success' ? <p className="mt-6 text-sm font-semibold text-trust">Verified. Redirecting...</p> : null}
    </Card>
  );
}
