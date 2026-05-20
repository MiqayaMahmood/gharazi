'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const slides = [
  {
    tag: 'Verified search',
    heading: 'Find verified homes faster',
    subheading: 'Search cleaner listings with freshness, trust, and direct inquiry signals built in.',
    cta: 'Search properties',
    href: '/buy',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80',
  },
  {
    tag: 'New projects',
    heading: 'Compare projects with more transparency',
    subheading: 'Review possession, legal status, payment plans, units, and developer details before you inquire.',
    cta: 'Explore projects',
    href: '/projects',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
  },
  {
    tag: 'For owners and agents',
    heading: 'Post property and manage leads',
    subheading: 'Create listings, receive inquiries, and keep buyer conversations organized from your dashboard.',
    cta: 'Post property',
    href: '/login?next=/dashboard/listings/new',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80',
  },
];

export function HeroCarousel({ fullWidth = false }: { fullWidth?: boolean }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[active];
  return (
    <div className={cn('relative min-h-[360px] overflow-hidden bg-ink text-white shadow-soft', fullWidth ? 'rounded-none' : 'rounded-xl')}>
      <div className="absolute inset-0 bg-cover bg-center opacity-45" style={{ backgroundImage: `url(${slide.image})` }} />
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/20" />
      <div className={cn('relative mx-auto flex min-h-[360px] max-w-7xl flex-col justify-between p-6 md:p-8', fullWidth && 'min-h-[420px]')}>
        <div>
          <Badge className="border-white/30 bg-white/15 text-white">{slide.tag}</Badge>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight md:text-6xl">{slide.heading}</h1>
          <p className="mt-4 max-w-xl text-base text-white/85 md:text-lg">{slide.subheading}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={slide.href} asChild>{slide.cta}</Button>
            <Button href="/contact" asChild variant="secondary">Talk to support</Button>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-2">
          {slides.map((item, index) => (
            <button
              key={item.heading}
              aria-label={`Show slide ${index + 1}`}
              className={cn('h-2.5 rounded-full bg-white/45 transition-all', active === index ? 'w-8 bg-white' : 'w-2.5')}
              onClick={() => setActive(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
