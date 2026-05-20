import Script from 'next/script';

export function AdsenseScript() {
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!enabled || !client) return null;
  return (
    <Script
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      strategy="afterInteractive"
    />
  );
}
