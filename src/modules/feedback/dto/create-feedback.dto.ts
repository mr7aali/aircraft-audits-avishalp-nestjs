import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RatingScale } from '../../../generated/prisma/enums.js';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({ enum: RatingScale })
  @IsEnum(RatingScale)
  overallSatisfaction!: RatingScale;

  @ApiProperty({ enum: RatingScale })
  @IsEnum(RatingScale)
  easeOfUse!: RatingScale;

  @ApiProperty({ enum: RatingScale })
  @IsEnum(RatingScale)
  appPerformance!: RatingScale;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  usabilityIssues?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  missingFeatures?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  performanceIssues?: string;
}
