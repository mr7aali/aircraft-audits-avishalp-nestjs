import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches } from 'class-validator';

export class ForgotPasswordVerifyDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 5, maxLength: 5, example: '12345' })
  @IsString()
  @Matches(/^\d{5}$/)
  code!: string;
}
