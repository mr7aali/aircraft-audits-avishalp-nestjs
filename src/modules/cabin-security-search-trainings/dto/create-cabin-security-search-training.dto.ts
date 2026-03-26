import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PassFail } from '../../../generated/prisma-client/enums.js';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SecurityTrainingAreaResultInputDto {
  @ApiPropertyOptional()
  @ValidateIf((object: SecurityTrainingAreaResultInputDto) => !object.areaLabel)
  @IsUUID()
  areaId!: string;

  @ApiPropertyOptional()
  @ValidateIf((object: SecurityTrainingAreaResultInputDto) => !object.areaId)
  @IsString()
  @MaxLength(150)
  areaLabel?: string;

  @ApiProperty({ enum: PassFail })
  @IsEnum(PassFail)
  result!: PassFail;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  imageFileIds?: string[];
}

export class SecurityTrainingDetailedCheckItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  itemName!: string;

  @ApiProperty({ enum: ['pass', 'fail', 'na'] })
  @IsString()
  @MaxLength(10)
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

export class SecurityTrainingDetailedAreaDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  areaId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  sectionLabel!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  imageFileIds?: string[];

  @ApiProperty({ type: [SecurityTrainingDetailedCheckItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SecurityTrainingDetailedCheckItemDto)
  checkItems!: SecurityTrainingDetailedCheckItemDto[];
}

export class CreateCabinSecuritySearchTrainingDto {
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

  @ApiProperty({ type: [SecurityTrainingAreaResultInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SecurityTrainingAreaResultInputDto)
  areaResults!: SecurityTrainingAreaResultInputDto[];

  @ApiPropertyOptional({ type: [SecurityTrainingDetailedAreaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SecurityTrainingDetailedAreaDto)
  detailedAreaResults?: SecurityTrainingDetailedAreaDto[];

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

