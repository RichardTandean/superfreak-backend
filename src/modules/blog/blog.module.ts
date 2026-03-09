import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MulterModule } from '@nestjs/platform-express'
import * as multer from 'multer'
import { BlogPost, BlogPostSchema } from './schemas/blog-post.schema'
import { BlogService } from './blog.service'
import { BlogController } from './blog.controller'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BlogPost.name, schema: BlogPostSchema }]),
    MulterModule.register({ storage: multer.memoryStorage() }),
  ],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
