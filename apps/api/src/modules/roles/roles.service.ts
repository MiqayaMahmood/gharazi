import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string) {
    const role = await this.prisma.role.findUnique({ where: { code } });
    if (!role) {
      throw new NotFoundException(`Role "${code}" was not found`);
    }

    return role;
  }

  async assignRole(userId: string, roleCode: string): Promise<void> {
    const role = await this.findByCode(roleCode);
    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId,
        roleId: role.id,
      },
    });
  }

  async assignDefaultRole(userId: string): Promise<void> {
    await this.assignRole(userId, 'buyer');
  }

  async getUserRoleCodes(userId: string): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
      orderBy: { role: { code: 'asc' } },
    });

    return roles.map((userRole) => userRole.role.code);
  }
}
