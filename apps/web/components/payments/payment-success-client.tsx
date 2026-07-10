'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { getPaymentSessionStatus } from '@/lib/api/payments';

export function PaymentSuccessClient() {
  const sessionId = useSearchParams().get('session_id') ?? '';
  const query = useQuery({ queryKey: ['payment-session', sessionId], queryFn: () => getPaymentSessionStatus(sessionId), enabled: Boolean(sessionId), refetchInterval: (state) => state.state.data?.status === 'pending' ? 3000 : false });
  if (!sessionId) return <p className="text-muted">The Checkout session is missing. Check your dashboard for the latest status.</p>;
  if (query.data?.status === 'paid') return <p className="font-semibold text-emerald-700">Payment confirmed. Your paid benefit is active or being provisioned.</p>;
  if (query.data?.status === 'failed') return <p className="font-semibold text-red-700">Payment failed. You can retry from the package page.</p>;
  return <p className="text-muted">Payment received. Stripe webhook confirmation and activation are pending; this page will update automatically.</p>;
}
