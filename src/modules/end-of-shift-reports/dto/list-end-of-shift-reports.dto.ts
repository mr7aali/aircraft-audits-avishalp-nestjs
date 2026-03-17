import { ApiPropertyOptional } from '@nestjs/swagger';
import { DelayType } from '../../../generated/prisma/enums.js';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Transform } from 'class-transformer';

export class ListEndOfShiftReportsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supervisorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  delayCodeAlpha?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  delayCodeNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  overtimeHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  overtimeMinutes?: number;

  @ApiPropertyOptional({ enum: DelayType })
  @IsOptional()
  @IsEnum(DelayType)
  delayType?: DelayType;

  @ApiPropertyOptional({ enum: DelayType, isArray: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value
        .flatMap((entry) => String(entry).split(','))
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  })
  @IsArray()
  @IsEnum(DelayType, { each: true })
  delayTypes?: DelayType[];
}
