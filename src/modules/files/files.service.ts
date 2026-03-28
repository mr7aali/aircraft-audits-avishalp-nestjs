import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Prisma } from '../../generated/prisma-client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { RegisterCloudinaryFileDto } from './dto/register-cloudinary-file.dto.js';
import { CloudinaryStorageAdapter } from './storage/cloudinary-storage.adapter.js';
import { LocalStorageAdapter } from './storage/local-storage.adapter.js';
import { S3StorageAdapter } from './storage/s3-storage.adapter.js';
import {
  FileCategory,
  ScanStatus,
} from '../../generated/prisma-client/enums.js';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cloudinaryStorageAdapter: CloudinaryStorageAdapter,
    private readonly localStorageAdapter: LocalStorageAdapter,
    private readonly s3StorageAdapter: S3StorageAdapter,
  ) {}

  async registerCloudinaryFile(
    dto: RegisterCloudinaryFileDto,
    user: AuthenticatedUser,
  ) {
    const cloudinaryUrl = this.normalizeCloudinaryUrl(dto.cloudinaryUrl);
    const publicId = this.resolvePublicId(dto, cloudinaryUrl);
    const storageKey = publicId ?? cloudinaryUrl;
    const originalFileName = this.resolveOriginalFileName(dto, cloudinaryUrl);
    const mimeType = this.resolveMimeType(dto, cloudinaryUrl, originalFileName);
    const sizeBytes = this.resolveSizeBytes(dto.sizeBytes);
    const category = dto.category ?? this.detectCategory(mimeType);

    const existing = await this.prisma.file.findUnique({
      where: { storageKey },
    });
    if (existing) {
      return {
        ...existing,
        cloudinaryUrl:
          this.extractDirectCloudinaryUrl(existing.metadataJson) ??
          cloudinaryUrl,
      };
    }

    const created = await this.prisma.file.create({
      data: {
        storageKey,
        originalFileName,
        mimeType,
        sizeBytes,
        fileCategory: category,
        scanStatus: ScanStatus.CLEAN,
        uploadedByUserId: user.id,
        metadataJson: this.buildCloudinaryMetadata(
          dto,
          cloudinaryUrl,
          publicId,
          mimeType,
        ) as Prisma.InputJsonValue,
      },
    });

    return {
      ...created,
      cloudinaryUrl,
    };
  }

  async getMetadata(fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async getDownloadUrl(fileId: string) {
    const file = await this.getMetadata(fileId);
    const directCloudinaryUrl = this.extractDirectCloudinaryUrl(
      file.metadataJson,
    );
    return {
      fileId: file.id,
      downloadUrl:
        directCloudinaryUrl ?? (await this.getStorage().getDownloadUrl(file)),
    };
  }

  async getContentTarget(fileId: string): Promise<
    | {
        kind: 'local';
        absolutePath: string;
        mimeType: string;
      }
    | {
        kind: 'redirect';
        url: string;
      }
  > {
    const file = await this.getMetadata(fileId);
    const directCloudinaryUrl = this.extractDirectCloudinaryUrl(
      file.metadataJson,
    );
    if (directCloudinaryUrl) {
      return {
        kind: 'redirect',
        url: directCloudinaryUrl,
      };
    }
    const storage = this.getStorage();

    if (this.isLocalDriver()) {
      if (!('getAbsolutePath' in storage) || !storage.getAbsolutePath) {
        throw new BadRequestException(
          'Content endpoint only available for local storage',
        );
      }

      return {
        kind: 'local',
        absolutePath: storage.getAbsolutePath(file.storageKey),
        mimeType: file.mimeType,
      };
    }

    return {
      kind: 'redirect',
      url: await storage.getDownloadUrl(file),
    };
  }

  private buildCloudinaryMetadata(
    dto: RegisterCloudinaryFileDto,
    cloudinaryUrl: string,
    publicId: string | null,
    mimeType: string,
  ): Record<string, unknown> {
    const format =
      dto.format?.trim().toLowerCase() ||
      this.resolveFormatFromName(dto.originalFileName) ||
      this.resolveFormatFromUrl(cloudinaryUrl) ||
      this.resolveFormatFromMimeType(mimeType);

    const resourceType =
      dto.resourceType?.trim().toLowerCase() ||
      this.resolveResourceTypeFromMimeType(mimeType);

    return Object.fromEntries(
      Object.entries({
        publicId,
        secureUrl: cloudinaryUrl,
        format,
        resourceType,
        deliveryType: 'upload',
        source: 'client-direct-cloudinary',
      }).filter((entry) => entry[1] !== undefined && entry[1] !== null),
    );
  }

  private normalizeCloudinaryUrl(value: string): string {
    const normalized = value.trim();
    if (!normalized.startsWith('https://res.cloudinary.com/')) {
      throw new BadRequestException(
        'cloudinaryUrl must start with https://res.cloudinary.com',
      );
    }
    return normalized;
  }

  private resolvePublicId(
    dto: RegisterCloudinaryFileDto,
    cloudinaryUrl: string,
  ): string | null {
    const explicit = dto.publicId?.trim();
    if (explicit) {
      return explicit;
    }

    return this.extractPublicIdFromCloudinaryUrl(cloudinaryUrl);
  }

  private resolveOriginalFileName(
    dto: RegisterCloudinaryFileDto,
    cloudinaryUrl: string,
  ): string {
    const explicit = dto.originalFileName?.trim();
    if (explicit) {
      return explicit;
    }

    const uri = new URL(cloudinaryUrl);
    const lastSegment = uri.pathname.split('/').filter(Boolean).pop();
    if (lastSegment && lastSegment.trim().length > 0) {
      return decodeURIComponent(lastSegment.trim());
    }

    return `cloudinary-${randomUUID()}`;
  }

  private resolveMimeType(
    dto: RegisterCloudinaryFileDto,
    cloudinaryUrl: string,
    originalFileName: string,
  ): string {
    const explicit = dto.mimeType?.trim().toLowerCase();
    if (explicit) {
      return explicit;
    }

    const extension =
      this.resolveFormatFromName(originalFileName) ??
      this.resolveFormatFromUrl(cloudinaryUrl);

    switch (extension) {
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'heic':
      case 'heif':
        return 'image/heic';
      case 'jpeg':
      case 'jpg':
        return 'image/jpeg';
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      case 'wav':
        return 'audio/wav';
      case 'm4a':
        return 'audio/mp4';
      case 'mp3':
        return 'audio/mpeg';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  private resolveSizeBytes(sizeBytes?: number): bigint {
    if (typeof sizeBytes === 'number' && Number.isFinite(sizeBytes)) {
      return BigInt(Math.max(0, Math.floor(sizeBytes)));
    }
    return BigInt(0);
  }

  private resolveFormatFromName(value?: string): string | null {
    const extension = extname(value ?? '')
      .replace('.', '')
      .trim()
      .toLowerCase();
    return extension.length === 0 ? null : extension;
  }

  private resolveFormatFromUrl(value: string): string | null {
    const pathname = new URL(value).pathname;
    const extension = extname(pathname).replace('.', '').trim().toLowerCase();
    return extension.length === 0 ? null : extension;
  }

  private resolveFormatFromMimeType(mimeType: string): string {
    const subtype = mimeType.split('/').at(1)?.split('+').at(0)?.trim();
    if (subtype && subtype.length > 0) {
      return subtype.toLowerCase();
    }
    return 'bin';
  }

  private resolveResourceTypeFromMimeType(
    mimeType: string,
  ): 'image' | 'video' | 'raw' {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType.startsWith('video/')) {
      return 'video';
    }
    return 'raw';
  }

  private extractDirectCloudinaryUrl(value: unknown): string | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return null;
    }

    const secureUrl = (value as Record<string, unknown>)['secureUrl'];
    if (typeof secureUrl !== 'string') {
      return null;
    }

    const normalized = secureUrl.trim();
    return normalized.startsWith('https://res.cloudinary.com/')
      ? normalized
      : null;
  }

  private extractPublicIdFromCloudinaryUrl(url: string): string | null {
    const uri = new URL(url);
    const segments = uri.pathname.split('/').filter(Boolean);
    if (segments.length < 4) {
      return null;
    }

    const versionIndex = segments.findIndex(
      (segment, index) => index >= 3 && /^v\d+$/.test(segment),
    );

    const publicIdSegments =
      versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments.slice(3);
    if (publicIdSegments.length === 0) {
      return null;
    }

    const lastSegment = publicIdSegments.pop();
    if (!lastSegment) {
      return null;
    }

    const withoutExtension = lastSegment.replace(/\.[^.]+$/, '');
    const normalizedSegments = [...publicIdSegments, withoutExtension]
      .map((segment) => decodeURIComponent(segment.trim()))
      .filter((segment) => segment.length > 0);

    return normalizedSegments.length === 0
      ? null
      : normalizedSegments.join('/');
  }

  private getStorage() {
    const driver = this.configService.get<string>('storage.driver', {
      infer: true,
    });
    if (driver === 'cloudinary') {
      return this.cloudinaryStorageAdapter;
    }
    return driver === 's3' ? this.s3StorageAdapter : this.localStorageAdapter;
  }

  private isLocalDriver(): boolean {
    return (
      this.configService.get<string>('storage.driver', {
        infer: true,
      }) === 'local'
    );
  }

  private detectCategory(mimeType: string): FileCategory {
    if (mimeType.startsWith('image/')) {
      return FileCategory.IMAGE;
    }
    if (mimeType.startsWith('audio/')) {
      return FileCategory.AUDIO;
    }
    if (mimeType.startsWith('video/')) {
      return FileCategory.VIDEO;
    }
    if (mimeType.includes('signature')) {
      return FileCategory.SIGNATURE;
    }
    return FileCategory.DOCUMENT;
  }
}
