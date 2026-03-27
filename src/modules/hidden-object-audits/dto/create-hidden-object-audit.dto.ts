import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHiddenObjectAuditDto {
  @ApiProperty()
  @IsString()
  @MaxLength(40)
  shipNumber!: string;

  @ApiProperty()
  @IsUUID()
  aircraftTypeId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfObjectsToHide!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  selectedLocationCodes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shiftOccurrenceId?: string;
}

export class ConfirmHiddenObjectLocationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  subLocation!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  photoFileIds!: string[];
}

export class HiddenObjectAuditActionNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value?.toString().trim())
  @IsString()
  @MaxLength(500)
  note?: string;
}
