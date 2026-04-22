import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import {
  CreateDynamicFormSubmissionDto,
  DynamicFormSubmissionListQueryDto,
  DynamicFormsTemplateListQueryDto,
  UpsertDynamicFormTemplateDto,
} from './dto/manage-dynamic-forms.dto.js';
import { DynamicFormsService } from './dynamic-forms.service.js';

@ApiTags('Dynamic Forms')
@ApiBearerAuth()
@RequireActiveStation()
@Controller('dynamic-forms')
export class DynamicFormsController {
  constructor(private readonly dynamicFormsService: DynamicFormsService) {}

  @Get('templates')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_FORMS_LIBRARY, 'read')
  listTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DynamicFormsTemplateListQueryDto,
  ) {
    return this.dynamicFormsService.listTemplates(user, query);
  }

  @Get('templates/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_FORMS_LIBRARY, 'read')
  getTemplateById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.dynamicFormsService.getTemplateById(user, id);
  }

  @Post('templates')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_FORMS_LIBRARY, 'write')
  createTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertDynamicFormTemplateDto,
  ) {
    return this.dynamicFormsService.createTemplate(user, dto);
  }

  @Patch('templates/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_FORMS_LIBRARY, 'edit')
  updateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertDynamicFormTemplateDto,
  ) {
    return this.dynamicFormsService.updateTemplate(user, id, dto);
  }

  @Delete('templates/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_FORMS_LIBRARY, 'delete')
  archiveTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.dynamicFormsService.archiveTemplate(user, id);
  }

  @Get('templates/:id/submissions')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_FORMS_LIBRARY, 'read')
  listTemplateSubmissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: DynamicFormSubmissionListQueryDto,
  ) {
    return this.dynamicFormsService.listTemplateSubmissions(user, id, query);
  }

  @Get('published')
  listPublishedTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.dynamicFormsService.listPublishedTemplates(user);
  }

  @Get('published/:id')
  getPublishedTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.dynamicFormsService.getPublishedTemplate(user, id);
  }

  @Post('published/:id/submissions')
  submitPublishedTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateDynamicFormSubmissionDto,
  ) {
    return this.dynamicFormsService.createSubmission(user, id, dto);
  }
}
