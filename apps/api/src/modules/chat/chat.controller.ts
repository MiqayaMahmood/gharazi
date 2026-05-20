import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '@Gharazi/shared-types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.list(user.id);
  }

  @Get(':id/messages')
  messages(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.chatService.messages(user.id, id);
  }

  @Post(':id/messages')
  send(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateChatMessageDto) {
    return this.chatService.sendMessage(user.id, id, dto);
  }
}
