import { Injectable } from '@nestjs/common';
import { ScanStatus } from '../../../generated/prisma/enums.js';

@Injectable()
export class FileScanService {
  scan(buffer: Buffer): Promise<ScanStatus> {
    void buffer;
    return Promise.resolve(ScanStatus.CLEAN);
  }
}
