import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common'
import { Response } from 'express'
import { FilesService } from './files.service'
import { FinalizeFilesDto } from './dto/finalize-files.dto'
import { SessionGuard } from '../auth/guards/session.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserDocument } from '../auth/schemas/user.schema'
import { FileInterceptor } from '@nestjs/platform-express'
import { UseInterceptors, UploadedFile } from '@nestjs/common'

const MIME_BY_EXT: Record<string, string> = {
  stl: 'model/stl',
  obj: 'model/obj',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
}

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('temp')
  @UseGuards(SessionGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  async uploadTemp(
    @CurrentUser() user: UserDocument,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided')
    const result = await this.files.uploadTemp(user._id.toString(), file)
    return { sessionId: result.tempFileId, files: [result], expiresAt: result.expiresAt }
  }

  @Get('temp/:id')
  @UseGuards(SessionGuard)
  async getTemp(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.files.getTemp(id, user._id.toString())
    const ext = fileName.split('.').pop()?.toLowerCase() || 'bin'
    const contentType = MIME_BY_EXT[ext] || 'application/octet-stream'
    res.set({
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="${fileName.replace(/"/g, '\\"')}"`,
    })
    res.send(buffer)
  }

  @Delete('temp/:id')
  @UseGuards(SessionGuard)
  async deleteTemp(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    await this.files.deleteTemp(id, user._id.toString())
    return { success: true }
  }

  @Post('finalize')
  @UseGuards(SessionGuard)
  finalize(@CurrentUser() user: UserDocument, @Body() dto: FinalizeFilesDto) {
    return this.files.finalize(user._id.toString(), {
      orderId: dto.orderId,
      tempFileIds: dto.tempFileIds,
    })
  }

  @Post('cleanup')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  cleanup() {
    return this.files.cleanup()
  }
}
