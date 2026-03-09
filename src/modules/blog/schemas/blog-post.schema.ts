import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Schema as MongooseSchema } from 'mongoose'

export type BlogPostDocument = BlogPost & Document

const CATEGORIES = [
  'news',
  'military',
  'technology',
  'materials',
  'design',
  'industry-news',
  'tutorials',
  'tips-tricks',
  'business',
] as const

@Schema({ collection: 'blog-posts', timestamps: true })
export class BlogPost {
  @Prop({ required: true })
  title: string

  @Prop({ required: true, unique: true })
  slug: string

  @Prop()
  featuredImage?: string

  @Prop()
  excerpt?: string

  @Prop({ type: MongooseSchema.Types.Mixed })
  content?: Record<string, unknown>

  @Prop({ type: [String], enum: CATEGORIES, required: true })
  categories: string[]

  @Prop({ default: 'Superfreak Team' })
  author?: string

  @Prop()
  readTime?: string

  @Prop()
  source?: string

  @Prop({ default: Date.now })
  publishedAt?: Date

  @Prop({ default: 'published', enum: ['draft', 'published'] })
  status: string
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost)

BlogPostSchema.index({ slug: 1 }, { unique: true })
BlogPostSchema.index({ status: 1, publishedAt: -1 })
BlogPostSchema.index({ categories: 1 })
