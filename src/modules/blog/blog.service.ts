import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { R2Service } from '../../shared/r2.service'
import { BlogPost, BlogPostDocument } from './schemas/blog-post.schema'
import { CreateBlogPostDto } from './dto/create-blog-post.dto'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(BlogPost.name) private readonly blogPostModel: Model<BlogPostDocument>,
    private readonly r2: R2Service,
  ) {}

  async list(params: {
    page?: number
    limit?: number
    category?: string
    search?: string
  }) {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(50, Math.max(1, params.limit ?? 10))
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = { status: 'published' }
    if (params.category) {
      filter.categories = params.category
    }
    if (params.search?.trim()) {
      filter.$or = [
        { title: new RegExp(params.search.trim(), 'i') },
        { excerpt: new RegExp(params.search.trim(), 'i') },
      ]
    }

    const [docs, totalDocs] = await Promise.all([
      this.blogPostModel
        .find(filter)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.blogPostModel.countDocuments(filter).exec(),
    ])

    const posts = docs.map((d: any) => ({
      id: d._id.toString(),
      title: d.title,
      slug: d.slug,
      excerpt: d.excerpt,
      author: d.author,
      date: d.publishedAt ?? d.createdAt,
      readTime: d.readTime,
      categories: d.categories,
      image: d.featuredImage ?? null,
    }))

    const totalPages = Math.ceil(totalDocs / limit)
    return {
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          totalPages,
          totalDocs,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    }
  }

  async getBySlug(slug: string) {
    const doc = await this.blogPostModel
      .findOne({ slug, status: 'published' })
      .lean()
      .exec()
    if (!doc) throw new NotFoundException('Blog post not found')

    const d = doc as any
    return {
      success: true,
      data: {
        id: d._id.toString(),
        title: d.title,
        slug: d.slug,
        content: d.content,
        excerpt: d.excerpt,
        author: d.author,
        date: d.publishedAt ?? d.createdAt,
        readTime: d.readTime,
        categories: d.categories,
        image: d.featuredImage ?? null,
        source: d.source,
      },
    }
  }

  async create(dto: CreateBlogPostDto, featuredImageUrl?: string) {
    const slug = dto.slug ?? slugify(dto.title)
    const existing = await this.blogPostModel.findOne({ slug }).exec()
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug

    const doc = await this.blogPostModel.create({
      title: dto.title,
      slug: finalSlug,
      featuredImage: featuredImageUrl,
      excerpt: dto.excerpt,
      content: dto.content,
      categories: dto.categories,
      author: dto.author ?? 'Superfreak Team',
      readTime: dto.readTime,
      source: dto.source,
      status: dto.status ?? 'published',
      publishedAt: new Date(),
    })

    return {
      success: true,
      data: {
        id: doc._id.toString(),
        title: doc.title,
        slug: doc.slug,
      },
    }
  }
}
