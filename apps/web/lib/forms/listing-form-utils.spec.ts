import { getListingCompleteness, validateListingMediaFile } from './listing-form-utils';

describe('listing form utilities', () => {
  it('distinguishes required readiness from optional recommendations', () => {
    const result = getListingCompleteness({
      purposeId: 'purpose',
      propertyTypeId: 'type',
      cityId: 'city',
      areaId: 'area',
      title: 'A complete property title',
      description: 'A sufficiently useful property description for prospective buyers.',
      priceAmount: 10,
      areaValue: 5,
      areaUnit: 'marla',
    }, []);

    expect(result.requiredReady).toBe(true);
    expect(result.requiredComplete).toBe(result.requiredTotal);
    expect(result.recommendedComplete).toBe(0);
    expect(result.percent).toBeLessThan(100);
  });

  it('counts media and contact details as recommendations', () => {
    const result = getListingCompleteness({ contactName: 'Seller', contactPhone: '03001234567' }, [{ url: 'https://example.com/photo.jpg' }]);
    expect(result.recommendedComplete).toBe(3);
  });

  it('validates media types consistently with the existing upload allowlist', () => {
    expect(validateListingMediaFile({ type: 'image/webp' }, 'image')).toBeUndefined();
    expect(validateListingMediaFile({ type: 'application/pdf' }, 'floor_plan')).toBeUndefined();
    expect(validateListingMediaFile({ type: 'image/svg+xml' }, 'image')).toMatch(/JPEG/);
    expect(validateListingMediaFile({ type: 'video/quicktime' }, 'video')).toMatch(/MP4/);
  });
});
