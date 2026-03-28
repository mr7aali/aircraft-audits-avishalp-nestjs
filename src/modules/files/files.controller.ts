import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { RegisterCloudinaryFileDto } from './dto/register-cloudinary-file.dto.js';
import { FilesService } from './files.service.js';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('register')
  registerCloudinaryFile(
    @Body() dto: RegisterCloudinaryFileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.filesService.registerCloudinaryFile(dto, user);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.filesService.getMetadata(id);
  }

  @Get(':id/download-url')
  getDownloadUrl(@Param('id') id: string) {
    return this.filesService.getDownloadUrl(id);
  }

  @Get(':id/content')
  async getContent(@Param('id') id: string, @Res() res: Response) {
    const target = await this.filesService.getContentTarget(id);
    if (target.kind === 'local') {
      res.type(target.mimeType);
      return res.sendFile(target.absolutePath);
    }
    return res.redirect(target.url);
  }
}
