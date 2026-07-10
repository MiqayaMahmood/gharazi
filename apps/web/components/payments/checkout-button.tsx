'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createCheckout, CheckoutPayload } from '@/lib/api/payments';

export function CheckoutButton({ payload, children = 'Buy Now', variant }: { payload: CheckoutPayload; children?: React.ReactNode; variant?: 'secondary' | 'ghost' }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return <div>
    <Button type="button" variant={variant} disabled={pending} onClick={async () => {
      setPending(true); setError('');
      try { const session = await createCheckout(payload); window.location.assign(session.checkoutUrl); }
      catch (caught) { setError(caught instanceof Error ? caught.message : 'Checkout could not be started'); setPending(false); }
    }}>{pending ? 'Opening secure checkout…' : children}</Button>
    {error ? <p className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
  </div>;
}
