import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ChatRealtimeService } from './chat-realtime.service.js';
import { JwtPayload } from '../auth/types/jwt-payload.type.js';

interface SocketWithUser extends Socket {
  data: {
    userId?: string;
  };
}

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit<Server>, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly chatRealtimeService: ChatRealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.chatRealtimeService.setServer(server);
  }

  async handleConnection(client: SocketWithUser): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('auth.accessSecret', {
          infer: true,
        }),
      });
      const session = await this.prisma.authSession.findUnique({
        where: { id: payload.sid },
      });
      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        throw new WsException('Invalid session');
      }

      client.data.userId = payload.sub;
      void client.join(`user:${payload.sub}`);
      this.chatRealtimeService.markUserOnline(payload.sub);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: SocketWithUser): void {
    if (client.data.userId) {
      this.chatRealtimeService.markUserOffline(client.data.userId);
    }
  }

  @SubscribeMessage('conversation.join')
  async joinConversation(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (!client.data.userId) {
      throw new WsException('Unauthorized');
    }
    const participant =
      await this.prisma.chatConversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: payload.conversationId,
            userId: client.data.userId,
          },
        },
      });
    if (!participant || participant.leftAt) {
      throw new WsException('Not a conversation member');
    }
    void client.join(`conversation:${payload.conversationId}`);
    return { joined: true };
  }

  @SubscribeMessage('typing.start')
  typingStarted(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (!client.data.userId) {
      throw new WsException('Unauthorized');
    }
    this.chatRealtimeService.emitTyping(payload.conversationId, {
      conversationId: payload.conversationId,
      userId: client.data.userId,
      at: new Date().toISOString(),
    });
    return { ok: true };
  }

  @SubscribeMessage('typing.stop')
  typingStopped(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (!client.data.userId) {
      throw new WsException('Unauthorized');
    }
    this.chatRealtimeService.emitTypingStopped(payload.conversationId, {
      conversationId: payload.conversationId,
      userId: client.data.userId,
      at: new Date().toISOString(),
    });
    return { ok: true };
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 10) {
      return authToken.replace(/^Bearer /i, '');
    }
    const headerAuth = client.handshake.headers.authorization;
    if (typeof headerAuth === 'string' && headerAuth.length > 10) {
      return headerAuth.replace(/^Bearer /i, '');
    }
    return null;
  }
}
