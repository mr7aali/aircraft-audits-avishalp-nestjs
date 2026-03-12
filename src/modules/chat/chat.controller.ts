import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { ChatService } from './chat.service.js';
import {
  ChatConversationQueryDto,
  ConversationMessagesQueryDto,
} from './dto/chat-query.dto.js';
import {
  CreateDirectConversationDto,
  CreateGroupConversationDto,
  SetFavoriteDto,
  SetMuteDto,
} from './dto/create-conversation.dto.js';
import {
  MessageReceiptDto,
  PollVoteDto,
  SendMessageDto,
} from './dto/send-message.dto.js';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ChatConversationQueryDto,
  ) {
    return this.chatService.listConversations(user, query);
  }

  @Post('conversations/direct')
  createDirect(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDirectConversationDto,
  ) {
    return this.chatService.createDirectConversation(user, dto);
  }

  @Post('conversations/group')
  createGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGroupConversationDto,
  ) {
    return this.chatService.createGroupConversation(user, dto);
  }

  @Get('conversations/:id')
  getConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.chatService.getConversation(user, id);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ConversationMessagesQueryDto,
  ) {
    return this.chatService.getMessages(user, id, query);
  }

  @Patch('conversations/:id/favorite')
  setFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetFavoriteDto,
  ) {
    return this.chatService.setFavorite(user, id, dto);
  }

  @Patch('conversations/:id/mute')
  setMute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetMuteDto,
  ) {
    return this.chatService.setMute(user, id, dto);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user, id, dto);
  }

  @Post('messages/:id/read')
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MessageReceiptDto,
  ) {
    return this.chatService.markRead(user, id, dto);
  }

  @Post('messages/:id/delivered')
  markDelivered(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MessageReceiptDto,
  ) {
    return this.chatService.markDelivered(user, id, dto);
  }

  @Post('polls/:messageId/votes')
  votePoll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Body() dto: PollVoteDto,
  ) {
    return this.chatService.votePoll(user, messageId, dto);
  }
}
