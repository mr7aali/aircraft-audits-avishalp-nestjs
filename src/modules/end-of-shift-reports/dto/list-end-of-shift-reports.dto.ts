import { ApiPropertyOptional } from '@nestjs/swagger';
import { DelayType } from '../../../generated/prisma/enums.js';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

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
}
