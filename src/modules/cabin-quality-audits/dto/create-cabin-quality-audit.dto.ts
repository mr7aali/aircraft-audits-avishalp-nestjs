import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { YesNoNa } from '../../../generated/prisma-client/enums.js';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const cabinQualityAreaGroups = [
  'lav',
  'galley',
  'main_cabin',
  'first_class',
  'comfort',
  'other',
] as const;

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
  @IsUUID('all', { each: true })
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
  @IsUUID('all', { each: true })
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

  @ApiPropertyOptional({ enum: cabinQualityAreaGroups })
  @IsOptional()
  @IsIn(cabinQualityAreaGroups)
  areaGroup?: (typeof cabinQualityAreaGroups)[number];

  @ApiProperty({ type: [CabinQualityAuditDetailedCheckItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CabinQualityAuditDetailedCheckItemDto)
  checkItems!: CabinQualityAuditDetailedCheckItemDto[];
}

export class CabinQualityAreaWeightsSnapshotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  lav?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  galley?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  main_cabin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  first_class?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  comfort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  other?: number;
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

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  shipNumber!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  flightNumber!: string;

  @ApiProperty({ type: [CabinQualityAuditResponseInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CabinQualityAuditResponseInputDto)
  responses!: CabinQualityAuditResponseInputDto[];

  @ApiPropertyOptional({ type: [CabinQualityAuditDetailedAreaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CabinQualityAuditDetailedAreaDto)
  areaResults?: CabinQualityAuditDetailedAreaDto[];

  @ApiPropertyOptional({ type: CabinQualityAreaWeightsSnapshotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CabinQualityAreaWeightsSnapshotDto)
  areaWeightsSnapshot?: CabinQualityAreaWeightsSnapshotDto;

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
  @IsUUID('all', { each: true })
  generalPictureFileIds?: string[];
}
