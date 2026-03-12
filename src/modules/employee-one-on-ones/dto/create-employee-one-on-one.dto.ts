import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateEmployeeOneOnOneDto {
  @ApiProperty()
  @IsUUID()
  employeeUserId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  discussionText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  discussionAudioFileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  additionalNote?: string;

  @ApiProperty()
  @IsBoolean()
  employeeRefusedToSign!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeSignatureFileId?: string;

  @ApiProperty()
  @IsUUID()
  leaderSignatureFileId!: string;
}
