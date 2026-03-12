import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotUidRequestDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}
