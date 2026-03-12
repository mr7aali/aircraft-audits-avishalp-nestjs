import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageAdapter, StoredFileResult } from './storage.adapter.js';

@Injectable()
export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new S3Client({
      region:
        this.configService.get<string>('storage.s3Region', {
          infer: true,
        }) ?? 'us-east-1',
      endpoint: this.configService.get<string>('storage.s3Endpoint', {
        infer: true,
      }),
      credentials: {
        accessKeyId:
          this.configService.get<string>('storage.s3AccessKeyId', {
            infer: true,
          }) ?? '',
        secretAccessKey:
          this.configService.get<string>('storage.s3SecretAccessKey', {
            infer: true,
          }) ?? '',
      },
    });
    this.bucket =
      this.configService.get<string>('storage.s3Bucket', {
        infer: true,
      }) ?? '';
  }

  async store(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StoredFileResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return { storageKey: key };
  }

  async getDownloadUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn: 600 },
    );
  }
}
