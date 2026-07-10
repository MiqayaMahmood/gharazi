import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function PaymentCancelPage() { return <main className="mx-auto max-w-2xl px-4 py-16"><Card className="p-8"><h1 className="text-3xl font-black">Payment canceled</h1><p className="mt-4 text-muted">No paid benefit was activated. You can return to the packages page and retry whenever you are ready.</p><Link className="mt-6 inline-block font-bold text-trust" href="/advertise">Return to packages</Link></Card></main>; }
