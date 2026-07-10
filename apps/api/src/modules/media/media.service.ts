import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { PresignUploadDto } from './dto/presign-upload.dto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async presign(userId: string, dto: PresignUploadDto) {
    if (!ALLOWED_TYPES.includes(dto.contentType)) throw new UnprocessableEntityException('Unsupported media file type');
    await this.assertCanUpload(userId, dto.entityType, dto.entityId);
    const key = `${dto.entityType}s/${dto.entityId}/${randomUUID()}-${this.cleanName(dto.filename)}`;
    const publicBase = this.config.get<string>('CLOUDFRONT_BASE_URL') ?? this.config.get<string>('S3_PUBLIC_BASE_URL');
    const bucket = this.config.get<string>('S3_BUCKET_NAME');
    const region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';
    const url = publicBase ? `${publicBase.replace(/\/$/, '')}/${key}` : bucket ? `https://${bucket}.s3.${region}.amazonaws.com/${key}` : `/uploads/${key}`;
    if (!bucket || !this.config.get<string>('AWS_ACCESS_KEY_ID') || !this.config.get<string>('AWS_SECRET_ACCESS_KEY')) {
      return { uploadUrl: url, storageKey: key, url, method: 'PUT', mode: 'development' };
    }
    return { uploadUrl: this.s3PresignedPutUrl(bucket, region, key, dto.contentType), storageKey: key, url, method: 'PUT', mode: 's3' };
  }

  private async assertCanUpload(userId: string, entityType: 'listing' | 'project', entityId: string) {
    if (entityType === 'listing') {
      const listing = await this.prisma.listing.findFirst({
        where: { id: entityId, deletedAt: null, OR: [{ ownerUserId: userId }, { managedByUserId: userId }] },
      });
      if (!listing) throw new ForbiddenException('Listing is not available for upload');
      return;
    }
    const project = await this.prisma.project.findFirst({
      where: { id: entityId, deletedAt: null, developer: { ownerUserId: userId } },
    });
    if (!project) throw new ForbiddenException('Project is not available for upload');
  }

  private cleanName(filename: string) {
    return filename.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'media';
  }

  private s3PresignedPutUrl(bucket: string, region: string, key: string, contentType: string) {
    const accessKey = this.config.getOrThrow<string>('AWS_ACCESS_KEY_ID');
    const secretKey = this.config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY');
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = `${date}T${now.toISOString().slice(11, 19).replace(/:/g, '')}Z`;
    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const credentialScope = `${date}/${region}/s3/aws4_request`;
    const credential = `${accessKey}/${credentialScope}`;
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    const params = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': '900',
      'X-Amz-SignedHeaders': 'content-type;host',
    });
    const canonicalRequest = [
      'PUT',
      `/${encodedKey}`,
      params.toString(),
      `content-type:${contentType}\nhost:${host}\n`,
      'content-type;host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, this.sha256(canonicalRequest)].join('\n');
    const signingKey = this.hmac(this.hmac(this.hmac(this.hmac(`AWS4${secretKey}`, date), region), 's3'), 'aws4_request');
    params.set('X-Amz-Signature', createHmac('sha256', signingKey).update(stringToSign).digest('hex'));
    return `https://${host}/${encodedKey}?${params.toString()}`;
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private hmac(key: string | Buffer, value: string) {
    return createHmac('sha256', key).update(value).digest();
  }
}
