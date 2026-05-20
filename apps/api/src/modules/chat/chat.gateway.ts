import { Logger } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: 'chat' })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  @SubscribeMessage('join_chat')
  handleJoin(client: Socket, chatId: string): void {
    void client.join(`chat:${chatId}`);
    this.logger.debug(`Socket joined chat:${chatId}`);
  }

  emitMessage(chatId: string, message: unknown): void {
    this.server?.to(`chat:${chatId}`).emit('chat_message', message);
  }
}
