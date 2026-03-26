import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import type { File as StoredFileRecord } from '../../../generated/prisma-client/client.js';
import { StorageAdapter, StoredFileResult } from './storage.adapter.js';

type CloudinaryMetadata = {
  publicId?: string;
  secureUrl?: string;
  format?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  version?: number;
  deliveryType?: string;
};

@Injectable()
export class CloudinaryStorageAdapter implements StorageAdapter {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name:
        this.configService.get<string>('storage.cloudinaryCloudName', {
          infer: true,
        }) ?? '',
      api_key:
        this.configService.get<string>('storage.cloudinaryApiKey', {
          infer: true,
        }) ?? '',
      api_secret:
        this.configService.get<string>('storage.cloudinaryApiSecret', {
          infer: true,
        }) ?? '',
      secure: true,
    });
  }

  async store(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StoredFileResult> {
    const publicId = this.buildPublicId(key);
    const uploaded = await this.uploadBuffer(buffer, mimeType, publicId);

    return {
      storageKey: uploaded.public_id,
      publicUrl: uploaded.secure_url,
      metadata: this.buildMetadata(uploaded),
    };
  }

  getDownloadUrl(file: StoredFileRecord): Promise<string> {
    const metadata = this.parseMetadata(file.metadataJson);
    const publicId = metadata.publicId?.trim() || file.storageKey;
    const format = this.resolveFormat(file, metadata);

    return Promise.resolve(
      cloudinary.utils.private_download_url(publicId, format, {
        resource_type: this.resolveResourceType(file, metadata),
        type: 'private',
        expires_at: Math.floor(Date.now() / 1000) + 600,
        attachment: false,
      }),
    );
  }

  private buildPublicId(key: string): string {
    const folder =
      this.configService.get<string>('storage.cloudinaryFolder', {
        infer: true,
      }) ?? '';
    const normalizedFolder = folder.trim().replace(/^\/+|\/+$/g, '');
    return normalizedFolder.length == 0 ? key : `${normalizedFolder}/${key}`;
  }

  private uploadBuffer(
    buffer: Buffer,
    mimeType: string,
    publicId: string,
  ): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'auto',
          type: 'private',
          overwrite: false,
          unique_filename: false,
          use_filename: false,
          invalidate: true,
          format: this.normalizeImageFormat(mimeType),
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException(
                error?.message ?? 'Cloudinary upload failed',
              ),
            );
            return;
          }
          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }

  private parseMetadata(value: unknown): CloudinaryMetadata {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return {};
    }

    return value as CloudinaryMetadata;
  }

  private buildMetadata(uploaded: UploadApiResponse): Record<string, unknown> {
    const metadataEntries = Object.entries({
      publicId: uploaded.public_id,
      secureUrl: uploaded.secure_url,
      format: uploaded.format,
      resourceType: uploaded.resource_type,
      version: uploaded.version,
      deliveryType: uploaded.type,
    }).filter((entry) => entry[1] !== undefined && entry[1] !== null);

    return Object.fromEntries(metadataEntries);
  }

  private resolveResourceType(
    file: StoredFileRecord,
    metadata: CloudinaryMetadata,
  ): 'image' | 'video' | 'raw' {
    if (
      metadata.resourceType === 'image' ||
      metadata.resourceType === 'video' ||
      metadata.resourceType === 'raw'
    ) {
      return metadata.resourceType;
    }

    if (file.mimeType.startsWith('image/')) {
      return 'image';
    }
    if (file.mimeType.startsWith('video/')) {
      return 'video';
    }
    return 'raw';
  }

  private resolveFormat(
    file: StoredFileRecord,
    metadata: CloudinaryMetadata,
  ): string {
    const extension = extname(file.originalFileName).replace('.', '').trim();
    if (extension.length > 0) {
      return extension.toLowerCase();
    }

    const format = metadata.format?.trim();
    if (format) {
      return format.toLowerCase();
    }

    return this.normalizeMimeSubtype(file.mimeType);
  }

  private normalizeImageFormat(mimeType: string): string | undefined {
    if (!mimeType.startsWith('image/')) {
      return undefined;
    }
    return this.normalizeMimeSubtype(mimeType);
  }

  private normalizeMimeSubtype(mimeType: string): string {
    const subtype = mimeType.split('/').at(1)?.split('+').at(0)?.trim();
    if (subtype && subtype.length > 0) {
      return subtype.toLowerCase();
    }
    return 'bin';
  }
}

