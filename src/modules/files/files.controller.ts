import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { FilesService } from './files.service.js';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 104857600,
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.filesService.upload(file, dto, user);
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
