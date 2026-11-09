import { buildPropertyWhatsAppHref, buildTelephoneHref, normalizePakistanPhone } from './contact-links';

describe('property contact links', () => {
  it.each([
    ['+92 300 1234567', '923001234567'],
    ['0092 300 1234567', '923001234567'],
    ['0300-1234567', '923001234567'],
    ['3001234567', '923001234567'],
  ])('normalizes Pakistan number %s', (input, expected) => {
    expect(normalizePakistanPhone(input)).toBe(expected);
  });

  it.each([undefined, '', 'invalid', '+1 212 555 0100', '0300123'])(
    'does not create a call link for %s',
    (input) => expect(buildTelephoneHref(input)).toBeUndefined(),
  );

  it('creates an encoded property-specific WhatsApp URL', () => {
    const href = buildPropertyWhatsAppHref('https://wa.me/923001234567', '10 Marla House', 'LST-100');
    expect(href).toContain('https://wa.me/923001234567?text=');
    expect(new URL(href as string).searchParams.get('text')).toContain('10 Marla House');
    expect(new URL(href as string).searchParams.get('text')).toContain('LST-100');
  });

  it.each([undefined, 'https://example.com/923001234567', 'https://wa.me/123', 'javascript:alert(1)'])(
    'rejects a missing or untrusted WhatsApp URL: %s',
    (url) => expect(buildPropertyWhatsAppHref(url, 'Listing')).toBeUndefined(),
  );
});
