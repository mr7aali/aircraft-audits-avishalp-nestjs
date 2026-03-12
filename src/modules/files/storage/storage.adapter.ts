export interface StoredFileResult {
  storageKey: string;
  publicUrl?: string;
}

export interface StorageAdapter {
  store(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<StoredFileResult>;
  getDownloadUrl(key: string): Promise<string>;
  getAbsolutePath?(key: string): string;
}
