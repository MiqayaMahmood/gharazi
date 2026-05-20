import { BadRequestException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  it('returns a clear error when a developer profile is missing', async () => {
    const prisma = {
      developer: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new ProjectsService(prisma as never, {} as never);

    await expect(service.create('user-1', {
      cityId: '33333333-3333-4333-8333-333333333333',
      areaId: '44444444-4444-4444-8444-444444444444',
      projectTypeId: '22222222-2222-4222-8222-222222222222',
      name: 'Test Project',
      description: 'A transparent project overview long enough for validation.',
      possessionStatus: 'under_construction',
    })).rejects.toThrow(BadRequestException);
  });
});
