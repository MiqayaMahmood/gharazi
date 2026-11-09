import { formatArea } from './utils';

describe('formatArea', () => {
  it.each([
    [10, 'marla', '10 Marla'],
    [1, 'kanal', '1 Kanal'],
    [1800, 'square feet', '1,800 sq ft'],
    [500, 'sq_yd', '500 sq yd'],
  ] as const)('formats %s %s consistently', (value, unit, expected) => {
    expect(formatArea(value, unit)).toBe(expected);
  });

  it.each([[undefined, 'marla'], [0, 'marla'], [10, undefined], [-1, 'sq ft']] as const)(
    'does not invent an area for %s %s',
    (value, unit) => expect(formatArea(value, unit)).toBeUndefined(),
  );
});
