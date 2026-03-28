import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { FileScanService } from './scanner/file-scan.service.js';
import { CloudinaryStorageAdapter } from './storage/cloudinary-storage.adapter.js';
import { LocalStorageAdapter } from './storage/local-storage.adapter.js';
import { S3StorageAdapter } from './storage/s3-storage.adapter.js';
import { UploadController } from './upload.controller.js';
import { UploadService } from './upload.service.js';

@Module({
  controllers: [FilesController, UploadController],
  providers: [
    FilesService,
    FileScanService,
    CloudinaryStorageAdapter,
    LocalStorageAdapter,
    S3StorageAdapter,
    UploadService,
  ],
  exports: [FilesService],
})
export class FilesModule {}
