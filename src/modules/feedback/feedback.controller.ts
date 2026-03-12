import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';
import { ListFeedbackDto } from './dto/list-feedback.dto.js';
import { FeedbackService } from './feedback.service.js';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @RequireActiveStation()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.create(user, dto);
  }

  @Get()
  @RequireActiveStation()
  @RequirePermission(MODULE_CODES.FEEDBACK, 'list')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFeedbackDto,
  ) {
    return this.feedbackService.list(user, query);
  }

  @Get('my')
  my(@CurrentUser() user: AuthenticatedUser, @Query() query: ListFeedbackDto) {
    return this.feedbackService.myFeedback(user, query);
  }
}
