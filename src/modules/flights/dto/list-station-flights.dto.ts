import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListStationFlightsDto {
  @ApiPropertyOptional({
    description: 'Bypass cache and fetch a fresh provider response immediately.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1';
    }
    return false;
  })
  @IsBoolean()
  forceRefresh?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum provider rows to request before backend filtering.',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  })
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
