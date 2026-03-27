import type { File as StoredFileRecord } from '../../../generated/prisma-client/client.js';

export interface StoredFileResult {
  storageKey: string;
  publicUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface StorageAdapter {
  store(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StoredFileResult>;
  getDownloadUrl(file: StoredFileRecord): Promise<string>;
  getAbsolutePath?(key: string): string;
}

