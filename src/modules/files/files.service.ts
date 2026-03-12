import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { FileScanService } from './scanner/file-scan.service.js';
import { LocalStorageAdapter } from './storage/local-storage.adapter.js';
import { S3StorageAdapter } from './storage/s3-storage.adapter.js';
import { FileCategory } from '../../generated/prisma/enums.js';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly fileScanService: FileScanService,
    private readonly localStorageAdapter: LocalStorageAdapter,
    private readonly s3StorageAdapter: S3StorageAdapter,
  ) {}

  async upload(
    file: Express.Multer.File,
    dto: UploadFileDto,
    user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const maxUploadBytes = this.configService.get<number>(
      'storage.maxUploadBytes',
      {
        infer: true,
      },
    );
    if (file.size > maxUploadBytes) {
      throw new BadRequestException('File exceeds max allowed size (100MB)');
    }

    const category = dto.category ?? this.detectCategory(file.mimetype);
    const extension = extname(file.originalname) || '';
    const storageKey = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;

    const storage = this.getStorage();
    await storage.store(storageKey, file.buffer, file.mimetype);
    const scanStatus = await this.fileScanService.scan(file.buffer);

    const created = await this.prisma.file.create({
      data: {
        storageKey,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        fileCategory: category,
        scanStatus,
        uploadedByUserId: user.id,
      },
    });

    return created;
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
    const storage = this.getStorage();
    return {
      fileId: file.id,
      downloadUrl: await storage.getDownloadUrl(file.storageKey),
    };
  }

  async resolveLocalPathByFileId(fileId: string): Promise<string> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    const storage = this.getStorage();
    if (!('getAbsolutePath' in storage) || !storage.getAbsolutePath) {
      throw new BadRequestException(
        'Content endpoint only available for local storage',
      );
    }
    return storage.getAbsolutePath(file.storageKey);
  }

  private getStorage() {
    const driver = this.configService.get<string>('storage.driver', {
      infer: true,
    });
    return driver === 's3' ? this.s3StorageAdapter : this.localStorageAdapter;
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
