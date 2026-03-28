import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { FileCategory } from '../../../generated/prisma-client/enums.js';

export class RegisterCloudinaryFileDto {
  @ApiProperty({
    description: 'Secure Cloudinary delivery URL for a directly uploaded file',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1711600000/aircraft-audits/example.jpg',
  })
  @Transform(({ value, obj }) => value ?? obj.cloudinary_url)
  @IsString()
  @MinLength(1)
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_host: true,
  })
  @Matches(/^https:\/\/res\.cloudinary\.com\//, {
    message: 'cloudinaryUrl must start with https://res.cloudinary.com',
  })
  cloudinaryUrl!: string;

  @ApiPropertyOptional({ enum: FileCategory })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originalFileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({
    enum: ['image', 'video', 'raw'],
  })
  @IsOptional()
  @IsString()
  @Matches(/^(image|video|raw)$/)
  resourceType?: string;
}
