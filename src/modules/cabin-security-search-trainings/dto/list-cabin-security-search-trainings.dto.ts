import { ApiPropertyOptional } from '@nestjs/swagger';
import { PassFail } from '../../../generated/prisma/enums.js';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  gateId?: string;
}
