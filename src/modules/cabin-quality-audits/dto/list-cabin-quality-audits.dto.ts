import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class ListCabinQualityAuditsDto extends PaginationQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  gateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cleanTypeId?: string;
}
