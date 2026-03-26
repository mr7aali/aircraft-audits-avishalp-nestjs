import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { HiddenObjectAuditStatus } from '../../../generated/prisma-client/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class ListHiddenObjectAuditsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: HiddenObjectAuditStatus })
  @IsOptional()
  @IsEnum(HiddenObjectAuditStatus)
  status?: HiddenObjectAuditStatus;

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
  shipNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  auditorName?: string;
}

