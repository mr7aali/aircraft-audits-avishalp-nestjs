import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DelayType } from '../../../generated/prisma/enums.js';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EndOfShiftDelayInputDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  sequenceNo!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(1)
  delayCodeAlpha!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(99)
  delayCodeNumber!: number;

  @ApiProperty({ enum: DelayType })
  @IsEnum(DelayType)
  delayType!: DelayType;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class CreateEndOfShiftReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shiftOccurrenceId?: string;

  @ApiProperty()
  @IsBoolean()
  lavObservationCompleted!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  lavObservationReason?: string;

  @ApiProperty()
  @IsBoolean()
  cabinQualityCompleted!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cabinQualityReason?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(99)
  callOffs!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(99)
  tardyEarlyOut!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(99)
  overtimeHours!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(59)
  overtimeMinutes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  overtimeReason?: string;

  @ApiProperty()
  @IsBoolean()
  delaysTaken!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  delayCount?: number;

  @ApiPropertyOptional({ type: [EndOfShiftDelayInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EndOfShiftDelayInputDto)
  delays?: EndOfShiftDelayInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  additionalNotes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  additionalPictureFileIds?: string[];
}
