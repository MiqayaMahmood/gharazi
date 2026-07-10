import { Suspense } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { PaymentSuccessClient } from '@/components/payments/payment-success-client';

export default function PaymentSuccessPage() { return <main className="mx-auto max-w-2xl px-4 py-16"><Card className="p-8"><h1 className="text-3xl font-black">Confirming your payment</h1><div className="mt-4"><Suspense fallback={<p>Checking payment…</p>}><PaymentSuccessClient /></Suspense></div><div className="mt-6 flex gap-4 text-sm font-bold text-trust"><Link href="/dashboard">Dashboard</Link><Link href="/advertise">Packages</Link></div></Card></main>; }
