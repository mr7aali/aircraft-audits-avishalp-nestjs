import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { YesNoNa } from '../../../generated/prisma/enums.js';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CabinQualityAuditResponseInputDto {
  @ApiProperty()
  @IsUUID()
  checklistItemId!: string;

  @ApiProperty({ enum: YesNoNa })
  @IsEnum(YesNoNa)
  response!: YesNoNa;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  imageFileIds?: string[];
}

export class CabinQualityAuditDetailedCheckItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  itemName!: string;

  @ApiProperty({ enum: ['pass', 'fail', 'na'] })
  @IsIn(['pass', 'fail', 'na'])
  status!: 'pass' | 'fail' | 'na';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  imageFileIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  hashtags?: string[];
}

export class CabinQualityAuditDetailedAreaDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  areaId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  sectionLabel!: string;

  @ApiProperty({ type: [CabinQualityAuditDetailedCheckItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CabinQualityAuditDetailedCheckItemDto)
  checkItems!: CabinQualityAuditDetailedCheckItemDto[];
}

export class CreateCabinQualityAuditDto {
  @ApiProperty()
  @IsUUID()
  gateId!: string;

  @ApiProperty()
  @IsUUID()
  cleanTypeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shiftOccurrenceId?: string;

  @ApiProperty({ type: [CabinQualityAuditResponseInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CabinQualityAuditResponseInputDto)
  responses!: CabinQualityAuditResponseInputDto[];

  @ApiPropertyOptional({ type: [CabinQualityAuditDetailedAreaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CabinQualityAuditDetailedAreaDto)
  areaResults?: CabinQualityAuditDetailedAreaDto[];

  @ApiProperty()
  @IsUUID()
  signatureFileId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  otherFindings?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  additionalNotes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  generalPictureFileIds?: string[];
}
