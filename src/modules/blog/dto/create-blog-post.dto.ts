import { IsString, IsArray, IsOptional, IsUrl, MinLength } from 'class-validator'

export class CreateBlogPostDto {
  @IsString()
  @MinLength(1)
  title: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @IsString()
  excerpt?: string

  @IsOptional()
  content?: Record<string, unknown>

  @IsArray()
  @IsString({ each: true })
  categories: string[]

  @IsOptional()
  @IsString()
  author?: string

  @IsOptional()
  @IsString()
  readTime?: string

  @IsOptional()
  @IsString()
  @IsUrl()
  source?: string

  @IsOptional()
  @IsString()
  status?: 'draft' | 'published'
}
