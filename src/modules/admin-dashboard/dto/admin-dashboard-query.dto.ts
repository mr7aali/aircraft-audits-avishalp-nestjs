import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export enum AdminAuditType {
  CABIN_QUALITY = 'CABIN_QUALITY',
  CABIN_SECURITY = 'CABIN_SECURITY',
  LAV_SAFETY = 'LAV_SAFETY',
}

export class AdminDashboardOverviewQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class AdminDashboardAuditRecordsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AdminAuditType })
  @IsOptional()
  @IsEnum(AdminAuditType)
  auditType?: AdminAuditType;

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
  @IsUUID()
  gateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
