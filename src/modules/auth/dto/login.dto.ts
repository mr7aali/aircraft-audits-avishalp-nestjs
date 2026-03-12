import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ minLength: 1, maxLength: 50 })
  @IsString()
  @Length(1, 50)
  userId!: string;

  @ApiProperty({ minLength: 8, maxLength: 20 })
  @IsString()
  @Length(8, 20)
  password!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceName?: string;
}
