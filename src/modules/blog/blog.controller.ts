import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Headers,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { BlogService } from './blog.service'
import { CreateBlogPostDto } from './dto/create-blog-post.dto'
import { ConfigService } from '@nestjs/config'
import { R2Service } from '../../shared/r2.service'
import * as crypto from 'crypto'

@Controller('blog')
export class BlogController {
  constructor(
    private readonly blog: BlogService,
    private readonly config: ConfigService,
    private readonly r2: R2Service,
  ) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.blog.list({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      category,
      search,
    })
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.blog.getBySlug(slug)
  }

  @Post()
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async create(
    @Body() dto: CreateBlogPostDto,
    @UploadedFile() imageFile?: Express.Multer.File,
    @Headers('authorization') authorization?: string,
  ) {
    const apiKey = authorization?.replace(/Bearer\s+/i, '').trim() ?? ''
    const validKey = this.config.get<string>('BLOG_API_KEY') ?? ''
    const valid =
      validKey.length > 0 &&
      apiKey.length === validKey.length &&
      crypto.timingSafeEqual(Buffer.from(validKey, 'utf-8'), Buffer.from(apiKey, 'utf-8'))
    if (!valid) {
      throw new BadRequestException('Unauthorized - Invalid or missing BLOG_API_KEY')
    }

    let featuredImageUrl: string | undefined
    if (imageFile?.buffer) {
      const buffer = imageFile.buffer ?? (imageFile as any)?.buffer
      const ext = imageFile.originalname?.split('.').pop()?.toLowerCase() || 'jpg'
      const key = `blog/${Date.now()}.${ext}`
      featuredImageUrl = await this.r2.upload(
        key,
        Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer),
        imageFile.mimetype || 'image/jpeg',
      )
    }

    return this.blog.create(dto, featuredImageUrl)
  }
}
