import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class ChatRealtimeService {
  private server?: Server;
  private readonly onlineUsers = new Set<string>();

  setServer(server: Server): void {
    this.server = server;
  }

  markUserOnline(userId: string): void {
    this.onlineUsers.add(userId);
    this.broadcastPresence(userId, true);
  }

  markUserOffline(userId: string): void {
    this.onlineUsers.delete(userId);
    this.broadcastPresence(userId, false);
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  emitMessageCreated(conversationId: string, payload: unknown): void {
    this.server
      ?.to(`conversation:${conversationId}`)
      .emit('message.created', payload);
    this.server
      ?.to(`conversation:${conversationId}`)
      .emit('conversation.updated', payload);
  }

  emitMessageDelivered(conversationId: string, payload: unknown): void {
    this.server
      ?.to(`conversation:${conversationId}`)
      .emit('message.delivered', payload);
  }

  emitMessageRead(conversationId: string, payload: unknown): void {
    this.server
      ?.to(`conversation:${conversationId}`)
      .emit('message.read', payload);
  }

  emitTyping(conversationId: string, payload: unknown): void {
    this.server
      ?.to(`conversation:${conversationId}`)
      .emit('typing.started', payload);
  }

  emitTypingStopped(conversationId: string, payload: unknown): void {
    this.server
      ?.to(`conversation:${conversationId}`)
      .emit('typing.stopped', payload);
  }

  private broadcastPresence(userId: string, isOnline: boolean): void {
    this.server?.emit('presence.updated', {
      userId,
      isOnline,
      updatedAt: new Date().toISOString(),
    });
  }
}
