import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from '../auth/schemas/user.schema'
import { R2Service } from '../../shared/r2.service'
import { UpdateMeDto } from './dto/update-me.dto'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly r2: R2Service,
  ) {}

  async getMe(userId: string) {
    const user = await this.userModel.findById(userId).exec()
    if (!user) return null
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
      phoneNumber: user.phoneNumber,
    }
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          name: dto.name,
          ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
        },
        { new: true },
      )
      .exec()
    if (!user) return null
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
      phoneNumber: user.phoneNumber,
    }
  }

  async setProfileImage(userId: string, file: Express.Multer.File): Promise<{ url: string }> {
    const buffer = file?.buffer ?? (file as any)?.buffer
    if (!file || !buffer) {
      throw new Error('No file provided')
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.')
    }
    if (file.size > MAX_SIZE) {
      throw new Error('File size exceeds 2MB limit')
    }

    const ext = file.originalname?.split('.').pop() || 'jpg'
    const key = `profile/${userId}/${Date.now()}.${ext}`

    const url = await this.r2.upload(key, Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer), file.mimetype)

    await this.userModel.findByIdAndUpdate(userId, { $set: { image: url } }).exec()

    return { url }
  }

  /**
   * Get the profile image buffer for streaming (proxy). Returns null if user has no image
   * or image URL is not from our R2 bucket.
   */
  async getProfileImageBuffer(userId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const user = await this.userModel.findById(userId).exec()
    if (!user?.image) return null
    const key = this.r2.getKeyFromPublicUrl(user.image)
    if (!key) return null
    try {
      const buffer = await this.r2.getBuffer(key)
      const ext = key.split('.').pop()?.toLowerCase()
      const contentType =
        ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : ext === 'gif'
              ? 'image/gif'
              : 'image/jpeg'
      return { buffer, contentType }
    } catch {
      return null
    }
  }
}
