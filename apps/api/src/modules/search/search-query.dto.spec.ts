import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchListingsQueryDto } from './dto/search-listings-query.dto';
import { SearchProjectsQueryDto } from './dto/search-projects-query.dto';

describe('search query DTOs', () => {
  it('rejects property type codes in listing ID fields with a useful message', async () => {
    const dto = plainToInstance(SearchListingsQueryDto, { propertyTypeId: 'commercial' });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'propertyTypeId',
          constraints: expect.objectContaining({
            isUuid: expect.stringContaining('Use propertyTypeCode'),
          }),
        }),
      ]),
    );
  });

  it('accepts listing code and slug query params separately from UUID fields', async () => {
    const dto = plainToInstance(SearchListingsQueryDto, {
      purposeCode: 'sale',
      propertyTypeCode: 'commercial',
      citySlug: 'lahore',
      areaSlug: 'dha-phase-6-lahore',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects project type codes in project ID fields with a useful message', async () => {
    const dto = plainToInstance(SearchProjectsQueryDto, { projectTypeId: 'mixed-use' });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'projectTypeId',
          constraints: expect.objectContaining({
            isUuid: expect.stringContaining('Use projectTypeCode'),
          }),
        }),
      ]),
    );
  });

  it('accepts project code and slug query params separately from UUID fields', async () => {
    const dto = plainToInstance(SearchProjectsQueryDto, {
      projectTypeCode: 'mixed-use',
      citySlug: 'karachi',
      areaSlug: 'clifton-karachi',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
