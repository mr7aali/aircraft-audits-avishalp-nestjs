import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDirectConversationDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;
}

export class CreateGroupConversationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantUserIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  avatarFileId?: string;
}

export class SetFavoriteDto {
  @ApiProperty()
  @IsBoolean()
  isFavorite!: boolean;
}

export class SetMuteDto {
  @ApiProperty()
  @IsBoolean()
  isMuted!: boolean;
}
