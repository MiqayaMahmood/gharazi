'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ListingImage } from '@/types/marketplace';

export function ListingGallery({ images, title }: { images?: ListingImage[]; title: string }) {
  const orderedImages = useMemo(
    () => [...(images ?? [])].filter((image) => image.url).sort((a, b) => Number(b.isCover) - Number(a.isCover) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [images],
  );
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const selectedImage = orderedImages[selected];

  function previous() {
    setSelected((current) => (current === 0 ? orderedImages.length - 1 : current - 1));
  }

  function next() {
    setSelected((current) => (current === orderedImages.length - 1 ? 0 : current + 1));
  }

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowLeft' && orderedImages.length > 1) {
        setSelected((current) => (current === 0 ? orderedImages.length - 1 : current - 1));
      }
      if (event.key === 'ArrowRight' && orderedImages.length > 1) {
        setSelected((current) => (current === orderedImages.length - 1 ? 0 : current + 1));
      }
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [lightboxOpen, orderedImages.length]);

  if (!orderedImages.length) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl bg-stone-100 text-sm font-semibold text-muted">
        No listing images yet
      </div>
    );
  }

  return (
    <section className="grid gap-3" aria-label="Listing images">
      <button
        type="button"
        className="relative aspect-[16/9] overflow-hidden rounded-xl bg-stone-200 text-left"
        onClick={(event) => { previousFocusRef.current = event.currentTarget; setLightboxOpen(true); }}
        aria-label={`Open image viewer for ${title}`}
      >
        <Image src={selectedImage.url} alt={selectedImage.alt ?? title} fill className="object-cover" priority sizes="(min-width: 1024px) 820px, 100vw" />
      </button>
      {orderedImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {orderedImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={`relative aspect-[4/3] overflow-hidden rounded-md border bg-stone-100 ${index === selected ? 'border-trust ring-2 ring-trust/30' : 'border-line'}`}
              onClick={() => setSelected(index)}
              aria-label={`Show image ${index + 1} of ${orderedImages.length}`}
            >
              <Image src={image.url} alt={`${title} photo ${index + 1}`} fill className="object-cover" sizes="120px" />
            </button>
          ))}
        </div>
      ) : null}
      {lightboxOpen ? (
        <div ref={dialogRef} className="fixed inset-0 z-[60] bg-black/90 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]" role="dialog" aria-modal="true" aria-label={`${title} image viewer`}>
          <button ref={closeRef} className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] min-h-11 rounded-md bg-white px-3 py-2 text-sm font-bold text-ink" type="button" onClick={() => setLightboxOpen(false)}>
            Close
          </button>
          {orderedImages.length > 1 ? (
            <>
              <button className="absolute left-4 top-1/2 rounded-full bg-white/90 px-4 py-3 text-xl font-black text-ink" type="button" onClick={previous} aria-label="Previous image">
                ‹
              </button>
              <button className="absolute right-4 top-1/2 rounded-full bg-white/90 px-4 py-3 text-xl font-black text-ink" type="button" onClick={next} aria-label="Next image">
                ›
              </button>
            </>
          ) : null}
          <div className="flex h-full items-center justify-center px-8 py-12">
            <div className="relative h-full w-full">
              <Image src={selectedImage.url} alt={selectedImage.alt ?? title} fill className="object-contain" sizes="100vw" />
            </div>
          </div>
          <p className="absolute bottom-4 left-0 right-0 text-center text-sm font-semibold text-white">
            {selected + 1} / {orderedImages.length}
          </p>
        </div>
      ) : null}
    </section>
  );
}
