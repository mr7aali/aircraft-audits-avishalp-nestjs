import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PassFail } from '../../../generated/prisma/enums.js';
import {
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

export class SecurityTrainingAreaResultInputDto {
  @ApiProperty()
  @IsUUID()
  areaId!: string;

  @ApiProperty({ enum: PassFail })
  @IsEnum(PassFail)
  result!: PassFail;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  imageFileIds?: string[];
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
