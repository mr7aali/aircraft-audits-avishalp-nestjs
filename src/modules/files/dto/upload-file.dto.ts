import { ApiPropertyOptional } from '@nestjs/swagger';
import { FileCategory } from '../../../generated/prisma/enums.js';
import { IsEnum, IsOptional } from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional({ enum: FileCategory })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;
}
