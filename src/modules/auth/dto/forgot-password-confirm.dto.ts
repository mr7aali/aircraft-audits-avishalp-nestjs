import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

export class ForgotPasswordConfirmDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  token!: string;

  @ApiProperty({ minLength: 8, maxLength: 20 })
  @IsString()
  @Length(8, 20)
  newPassword!: string;
}
