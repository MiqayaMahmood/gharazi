import { buildWhatsAppUrl, normalizePakistanWhatsAppNumber } from './whatsapp';

describe('Pakistan WhatsApp contact formatting', () => {
  it.each([
    ['+92 300 1234567', '923001234567'],
    ['0092-300-1234567', '923001234567'],
    ['0300 1234567', '923001234567'],
    ['3001234567', '923001234567'],
    ['042 12345678', '924212345678'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizePakistanWhatsAppNumber(input)).toBe(expected);
  });

  it.each([undefined, null, '', 'not-a-phone', '0300 123', '+1 212 555 0100', '00000000000'])(
    'rejects an invalid or missing value: %s',
    (input) => expect(normalizePakistanWhatsAppNumber(input)).toBeUndefined(),
  );

  it('builds a standard wa.me URL without sending a message', () => {
    expect(buildWhatsAppUrl('+92 300 1234567')).toBe('https://wa.me/923001234567');
  });
});
