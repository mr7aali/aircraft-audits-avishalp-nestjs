import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { FileScanService } from './scanner/file-scan.service.js';
import { LocalStorageAdapter } from './storage/local-storage.adapter.js';
import { S3StorageAdapter } from './storage/s3-storage.adapter.js';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    FileScanService,
    LocalStorageAdapter,
    S3StorageAdapter,
  ],
  exports: [FilesService],
})
export class FilesModule {}
