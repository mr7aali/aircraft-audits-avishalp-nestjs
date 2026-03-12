import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
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

  getDownloadUrl(key: string): Promise<string> {
    return Promise.resolve(`/api/files/content/${encodeURIComponent(key)}`);
  }

  getAbsolutePath(key: string): string {
    return join(this.getRootPath(), key);
  }
}
