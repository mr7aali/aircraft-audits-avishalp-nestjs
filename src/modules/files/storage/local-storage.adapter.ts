import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import type { File as StoredFileRecord } from '../../../generated/prisma-client/client.js';
import { StorageAdapter, StoredFileResult } from './storage.adapter.js';

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly configService: ConfigService) {}

  private getRootPath(): string {
    const configuredRoot = this.configService.get<string>('storage.localRoot', {
      infer: true,
    });
    return resolve(process.cwd(), configuredRoot ?? 'storage');
  }

  async store(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StoredFileResult> {
    void mimeType;
    const fullPath = join(this.getRootPath(), key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return { storageKey: key };
  }

  getDownloadUrl(file: StoredFileRecord): Promise<string> {
    const appBaseUrl =
      this.configService.get<string>('appBaseUrl', {
        infer: true,
      }) ?? 'http://localhost:3000';
    const apiPrefix =
      this.configService.get<string>('apiPrefix', {
        infer: true,
      }) ?? 'api';
    return Promise.resolve(
      `${appBaseUrl.replace(/\/$/, '')}/${apiPrefix}/files/${file.id}/content`,
    );
  }

  getAbsolutePath(key: string): string {
    return join(this.getRootPath(), key);
  }
}

