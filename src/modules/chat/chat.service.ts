import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import {
  ChatConversationQueryDto,
  ConversationMessagesQueryDto,
  ConversationTab,
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
import { ChatRealtimeService } from './chat-realtime.service.js';
import { ConversationType, MessageType } from '../../generated/prisma/enums.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: ChatRealtimeService,
  ) {}

  async listConversations(
    user: AuthenticatedUser,
    query: ChatConversationQueryDto,
  ) {
    const whereBase = {
      participants: {
        some: {
          userId: user.id,
          leftAt: null,
        },
      },
      ...(query.tab === ConversationTab.GROUPS
        ? { conversationType: ConversationType.GROUP }
        : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' as const } },
              {
                participants: {
                  some: {
                    user: {
                      OR: [
                        {
                          firstName: {
                            contains: query.q,
                            mode: 'insensitive' as const,
                          },
                        },
                        {
                          lastName: {
                            contains: query.q,
                            mode: 'insensitive' as const,
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const conversations = await this.prisma.chatConversation.findMany({
      where: whereBase,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                uid: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        lastMessage: {
          include: {
            receipts: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });

    const normalized = await Promise.all(
      conversations.map(async (conversation) => {
        const participant = conversation.participants.find(
          (item) => item.userId === user.id,
        );
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            conversationId: conversation.id,
            senderUserId: { not: user.id },
            ...(participant?.lastReadAt
              ? { createdAt: { gt: participant.lastReadAt } }
              : {}),
          },
        });

        const otherParticipant = conversation.participants.find(
          (item) => item.userId !== user.id,
        );
        const name =
          conversation.conversationType === ConversationType.DIRECT
            ? otherParticipant
              ? `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}`
              : 'Direct Chat'
            : (conversation.title ?? 'Group');

        const lastMessageStatus =
          conversation.lastMessage?.senderUserId === user.id
            ? this.resolveMessageReceiptStatus(
                conversation.lastMessage.receipts,
              )
            : null;

        return {
          id: conversation.id,
          type: conversation.conversationType,
          name,
          avatarFileId: conversation.avatarFileId,
          timestamp: conversation.lastMessageAt ?? conversation.createdAt,
          unreadCount,
          isFavorite: participant?.isFavorite ?? false,
          isMuted: participant?.isMuted ?? false,
          isOnline: otherParticipant
            ? this.realtime.isUserOnline(otherParticipant.userId)
            : false,
          otherParticipant: otherParticipant
            ? {
                id: otherParticipant.user.id,
                uid: otherParticipant.user.uid,
                email: otherParticipant.user.email,
                name: `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}`,
              }
            : null,
          lastMessagePreview: this.resolvePreview(
            conversation.lastMessage?.messageType,
            conversation.lastMessage?.previewText,
          ),
          lastMessageStatus,
        };
      }),
    );

    return normalized.filter((conversation) => {
      if (query.tab === ConversationTab.UNREAD) {
        return conversation.unreadCount > 0;
      }
      if (query.tab === ConversationTab.FAVORITE) {
        return conversation.isFavorite;
      }
      return true;
    });
  }

  async createDirectConversation(
    user: AuthenticatedUser,
    dto: CreateDirectConversationDto,
  ) {
    if (dto.userId === user.id) {
      throw new BadRequestException(
        'Cannot create direct conversation with self',
      );
    }
    const pair = [user.id, dto.userId].sort();
    const directPairKey = `${pair[0]}:${pair[1]}`;

    const existing = await this.prisma.chatConversation.findUnique({
      where: { directPairKey },
      include: {
        participants: true,
      },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.chatConversation.create({
      data: {
        conversationType: ConversationType.DIRECT,
        directPairKey,
        createdByUserId: user.id,
        participants: {
          create: [{ userId: user.id }, { userId: dto.userId }],
        },
      },
      include: { participants: true },
    });
  }

  async createGroupConversation(
    user: AuthenticatedUser,
    dto: CreateGroupConversationDto,
  ) {
    const participantIds = Array.from(
      new Set([user.id, ...dto.participantUserIds]),
    );
    return this.prisma.chatConversation.create({
      data: {
        conversationType: ConversationType.GROUP,
        createdByUserId: user.id,
        title: dto.title,
        avatarFileId: dto.avatarFileId,
        participants: {
          create: participantIds.map((participantId, index) => ({
            userId: participantId,
            memberRole: index === 0 ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      include: { participants: true },
    });
  }

  async getConversation(user: AuthenticatedUser, conversationId: string) {
    await this.ensureParticipant(conversationId, user.id);
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                uid: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async getMessages(
    user: AuthenticatedUser,
    conversationId: string,
    query: ConversationMessagesQueryDto,
  ) {
    await this.ensureParticipant(conversationId, user.id);
    const limit = Math.min(Number(query.limit ?? 30), 100);
    let cursorDate: Date | undefined;
    if (query.cursor) {
      const cursorMessage = await this.prisma.chatMessage.findUnique({
        where: { id: query.cursor },
      });
      cursorDate = cursorMessage?.createdAt;
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      include: {
        files: true,
        receipts: true,
        senderUser: {
          select: {
            id: true,
            uid: true,
            firstName: true,
            lastName: true,
          },
        },
        poll: {
          include: {
            options: {
              include: {
                votes: true,
              },
            },
          },
        },
        event: true,
        location: true,
        contact: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      items: messages.map((message) => ({
        ...message,
        sender: {
          id: message.senderUser.id,
          uid: message.senderUser.uid,
          name: `${message.senderUser.firstName} ${message.senderUser.lastName}`,
        },
      })),
      nextCursor: messages.length ? messages[messages.length - 1].id : null,
    };
  }

  async setFavorite(
    user: AuthenticatedUser,
    conversationId: string,
    dto: SetFavoriteDto,
  ) {
    await this.ensureParticipant(conversationId, user.id);
    await this.prisma.chatConversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
      data: { isFavorite: dto.isFavorite },
    });
    return { success: true };
  }

  async setMute(
    user: AuthenticatedUser,
    conversationId: string,
    dto: SetMuteDto,
  ) {
    await this.ensureParticipant(conversationId, user.id);
    await this.prisma.chatConversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
      data: { isMuted: dto.isMuted },
    });
    return { success: true };
  }

  async sendMessage(
    user: AuthenticatedUser,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const participant = await this.ensureParticipant(conversationId, user.id);
    if (participant.leftAt) {
      throw new ForbiddenException('Participant left the conversation');
    }
    this.validateMessageDto(dto);

    const conversationParticipants =
      await this.prisma.chatConversationParticipant.findMany({
        where: {
          conversationId,
          leftAt: null,
        },
      });

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          conversationId,
          senderUserId: user.id,
          messageType: dto.messageType,
          encryptedPayload: dto.encryptedPayload,
          previewText: dto.previewText,
        },
      });

      if (dto.attachments?.length) {
        await tx.chatMessageFile.createMany({
          data: dto.attachments.map((attachment, index) => ({
            messageId: created.id,
            fileId: attachment.fileId,
            attachmentKind: attachment.kind,
            sortOrder: index,
          })),
        });
      }

      if (dto.poll) {
        await tx.chatPoll.create({
          data: {
            messageId: created.id,
            question: dto.poll.question,
            allowMultipleAnswers: dto.poll.allowMultipleAnswers,
            options: {
              create: dto.poll.options.map((option, index) => ({
                optionText: option.text,
                sortOrder: index,
              })),
            },
          },
        });
      }

      if (dto.event) {
        await tx.chatEvent.create({
          data: {
            messageId: created.id,
            eventName: dto.event.eventName,
            description: dto.event.description,
            startAt: new Date(dto.event.startAt),
            endAt: dto.event.endAt ? new Date(dto.event.endAt) : null,
            locationText: dto.event.locationText,
            callType: dto.event.callType,
            callLinkUrl: dto.event.callLinkUrl,
            reminderOffsetMinutes: dto.event.reminderOffsetMinutes,
            allowGuests: dto.event.allowGuests ?? false,
          },
        });
      }

      if (dto.location) {
        await tx.chatLocation.create({
          data: {
            messageId: created.id,
            locationType: dto.location.locationType,
            latitude: dto.location.latitude,
            longitude: dto.location.longitude,
            addressText: dto.location.addressText,
            liveExpiresAt: dto.location.liveExpiresAt
              ? new Date(dto.location.liveExpiresAt)
              : null,
          },
        });
      }

      if (dto.contact) {
        await tx.chatContact.create({
          data: {
            messageId: created.id,
            contactName: dto.contact.contactName,
            contactPhone: dto.contact.contactPhone,
            contactEmail: dto.contact.contactEmail,
          },
        });
      }

      await tx.chatMessageReceipt.createMany({
        data: conversationParticipants
          .filter((entry) => entry.userId !== user.id)
          .map((entry) => ({
            messageId: created.id,
            recipientUserId: entry.userId,
            deliveredAt: null,
            readAt: null,
          })),
      });

      await tx.chatConversation.update({
        where: { id: conversationId },
        data: {
          lastMessageId: created.id,
          lastMessageAt: created.createdAt,
        },
      });

      return created;
    });

    this.realtime.emitMessageCreated(conversationId, {
      conversationId,
      messageId: message.id,
      senderUserId: message.senderUserId,
      messageType: message.messageType,
      createdAt: message.createdAt,
    });

    return message;
  }

  async markDelivered(
    user: AuthenticatedUser,
    messageId: string,
    dto: MessageReceiptDto,
  ) {
    void dto;
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    await this.ensureParticipant(message.conversationId, user.id);
    const receipt = await this.prisma.chatMessageReceipt.update({
      where: {
        messageId_recipientUserId: {
          messageId,
          recipientUserId: user.id,
        },
      },
      data: {
        deliveredAt: new Date(),
      },
    });

    this.realtime.emitMessageDelivered(message.conversationId, {
      conversationId: message.conversationId,
      messageId: message.id,
      userId: user.id,
      deliveredAt: receipt.deliveredAt,
    });

    return { success: true };
  }

  async markRead(
    user: AuthenticatedUser,
    messageId: string,
    dto: MessageReceiptDto,
  ) {
    void dto;
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    await this.ensureParticipant(message.conversationId, user.id);

    const [receipt] = await this.prisma.$transaction([
      this.prisma.chatMessageReceipt.update({
        where: {
          messageId_recipientUserId: {
            messageId,
            recipientUserId: user.id,
          },
        },
        data: {
          deliveredAt: new Date(),
          readAt: new Date(),
        },
      }),
      this.prisma.chatConversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: message.conversationId,
            userId: user.id,
          },
        },
        data: {
          lastReadMessageId: message.id,
          lastReadAt: new Date(),
        },
      }),
    ]);

    this.realtime.emitMessageRead(message.conversationId, {
      conversationId: message.conversationId,
      messageId: message.id,
      userId: user.id,
      readAt: receipt.readAt,
    });
    return { success: true };
  }

  async votePoll(user: AuthenticatedUser, messageId: string, dto: PollVoteDto) {
    const poll = await this.prisma.chatPoll.findUnique({
      where: { messageId },
      include: {
        options: true,
        message: true,
      },
    });
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    await this.ensureParticipant(poll.message.conversationId, user.id);

    if (!poll.allowMultipleAnswers && dto.optionIds.length > 1) {
      throw new BadRequestException(
        'This poll allows only one answer per participant',
      );
    }

    const optionIds = new Set(poll.options.map((option) => option.id));
    for (const optionId of dto.optionIds) {
      if (!optionIds.has(optionId)) {
        throw new BadRequestException('Invalid poll option');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (!poll.allowMultipleAnswers) {
        const pollOptionIds = poll.options.map((option) => option.id);
        await tx.chatPollVote.deleteMany({
          where: {
            optionId: { in: pollOptionIds },
            voterUserId: user.id,
          },
        });
      }

      for (const optionId of dto.optionIds) {
        await tx.chatPollVote.upsert({
          where: {
            optionId_voterUserId: {
              optionId,
              voterUserId: user.id,
            },
          },
          create: {
            optionId,
            voterUserId: user.id,
          },
          update: {
            votedAt: new Date(),
          },
        });
      }
    });

    return this.getPollSummary(messageId);
  }

  async getPollSummary(messageId: string) {
    const poll = await this.prisma.chatPoll.findUnique({
      where: { messageId },
      include: {
        options: {
          include: {
            votes: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    return {
      messageId,
      question: poll.question,
      allowMultipleAnswers: poll.allowMultipleAnswers,
      options: poll.options.map((option) => ({
        optionId: option.id,
        text: option.optionText,
        votes: option.votes.length,
      })),
    };
  }

  private async ensureParticipant(conversationId: string, userId: string) {
    const participant =
      await this.prisma.chatConversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });
    if (!participant) {
      throw new ForbiddenException('User is not a conversation participant');
    }
    return participant;
  }

  private validateMessageDto(dto: SendMessageDto) {
    if (dto.messageType === MessageType.TEXT && !dto.encryptedPayload?.trim()) {
      throw new BadRequestException(
        'encryptedPayload is required for text messages',
      );
    }
    if (dto.messageType === MessageType.POLL && !dto.poll) {
      throw new BadRequestException(
        'poll payload is required for POLL messages',
      );
    }
    if (dto.messageType === MessageType.EVENT) {
      if (!dto.event) {
        throw new BadRequestException(
          'event payload is required for EVENT messages',
        );
      }
      const start = new Date(dto.event.startAt);
      if (start < new Date()) {
        throw new BadRequestException('Event startAt cannot be in the past');
      }
      if (dto.event.endAt && new Date(dto.event.endAt) <= start) {
        throw new BadRequestException('Event endAt must be after startAt');
      }
    }
    if (dto.messageType === MessageType.LOCATION && !dto.location) {
      throw new BadRequestException(
        'location payload is required for LOCATION messages',
      );
    }
    if (dto.messageType === MessageType.CONTACT && !dto.contact) {
      throw new BadRequestException(
        'contact payload is required for CONTACT messages',
      );
    }
    const mediaTypes = new Set<MessageType>([
      MessageType.IMAGE,
      MessageType.AUDIO,
      MessageType.DOCUMENT,
      MessageType.VIDEO,
    ]);
    if (mediaTypes.has(dto.messageType) && !dto.attachments?.length) {
      throw new BadRequestException(
        'attachments are required for media message types',
      );
    }
  }

  private resolvePreview(
    messageType?: MessageType,
    previewText?: string | null,
  ): string {
    switch (messageType) {
      case MessageType.IMAGE:
        return 'Photo';
      case MessageType.AUDIO:
        return 'Voice message';
      case MessageType.DOCUMENT:
        return 'Document';
      case MessageType.VIDEO:
        return 'Video';
      case MessageType.LOCATION:
        return 'Location';
      case MessageType.CONTACT:
        return 'Contact';
      case MessageType.POLL:
        return 'Poll';
      case MessageType.EVENT:
        return 'Event';
      case MessageType.SYSTEM:
        return 'System';
      case MessageType.TEXT:
        return previewText?.trim() || 'Message';
      default:
        return previewText?.trim() || 'Message';
    }
  }

  private resolveMessageReceiptStatus(
    receipts: Array<{ deliveredAt: Date | null; readAt: Date | null }>,
  ): 'sent' | 'delivered' | 'read' {
    if (!receipts.length) {
      return 'sent';
    }
    if (receipts.every((receipt) => receipt.readAt)) {
      return 'read';
    }
    if (receipts.every((receipt) => receipt.deliveredAt)) {
      return 'delivered';
    }
    return 'sent';
  }
}
