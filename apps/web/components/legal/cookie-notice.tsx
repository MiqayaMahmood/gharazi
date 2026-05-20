'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const COOKIE_NOTICE_KEY = 'gharazi_cookie_notice_accepted';

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(COOKIE_NOTICE_KEY) !== 'true');
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white p-4 shadow-soft">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-6 text-muted">
          Gharazi uses essential storage and may use analytics, preferences, advertising, WordPress, or map integrations as configured. Learn more in our <Link className="font-bold text-trust" href="/cookie-policy">Cookie Policy</Link>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild href="/cookie-policy" variant="secondary">Learn more</Button>
          <Button onClick={() => { window.localStorage.setItem(COOKIE_NOTICE_KEY, 'true'); setVisible(false); }}>Accept</Button>
        </div>
      </div>
    </div>
  );
}
