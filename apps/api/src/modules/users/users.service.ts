import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUserProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        emailVerifiedAt: true,
        status: true,
        profile: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateCurrentUserProfile(userId: string, dto: UpdateCurrentUserDto) {
    const data = {
      fullName: dto.full_name,
      avatarUrl: dto.avatar_url,
      bio: dto.bio,
      preferredLanguage: dto.preferred_language,
      whatsappNumber: dto.whatsapp_number,
      companyName: dto.company_name,
      websiteUrl: dto.website_url,
    };

    return this.prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
        preferredLanguage: dto.preferred_language ?? 'en',
      },
    });
  }
}
