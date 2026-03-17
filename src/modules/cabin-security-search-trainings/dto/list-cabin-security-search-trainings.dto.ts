import { ApiPropertyOptional } from '@nestjs/swagger';
import { PassFail } from '../../../generated/prisma/enums.js';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Transform } from 'class-transformer';

export class ListCabinSecuritySearchTrainingsDto extends PaginationQueryDto {
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
  auditorName?: string;

  @ApiPropertyOptional({ enum: PassFail })
  @IsOptional()
  @IsEnum(PassFail)
  result?: PassFail;

  @ApiPropertyOptional({ enum: PassFail, isArray: true })
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
  @IsEnum(PassFail, { each: true })
  results?: PassFail[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  gateId?: string;
}
