import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { YesNoNa } from '../../../generated/prisma/enums.js';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
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
