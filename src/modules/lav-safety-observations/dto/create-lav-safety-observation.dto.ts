import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PassFail } from '../../../generated/prisma-client/enums.js';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LavSafetyResponseInputDto {
  @ApiProperty()
  @IsUUID()
  checklistItemId!: string;

  @ApiProperty({ enum: PassFail })
  @IsEnum(PassFail)
  response!: PassFail;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  imageFileIds?: string[];
}

export class CreateLavSafetyObservationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  driverName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  shipNumber!: string;

  @ApiProperty()
  @IsUUID()
  gateId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shiftOccurrenceId?: string;

  @ApiProperty({ type: [LavSafetyResponseInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @Type(() => LavSafetyResponseInputDto)
  responses!: LavSafetyResponseInputDto[];

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

