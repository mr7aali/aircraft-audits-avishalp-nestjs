import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ConversationTab {
  ALL = 'all',
  UNREAD = 'unread',
  GROUPS = 'groups',
  FAVORITE = 'favorite',
}

export class ChatConversationQueryDto {
  @ApiPropertyOptional({ enum: ConversationTab, default: ConversationTab.ALL })
  @IsOptional()
  @IsEnum(ConversationTab)
  tab: ConversationTab = ConversationTab.ALL;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}

export class ConversationMessagesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
