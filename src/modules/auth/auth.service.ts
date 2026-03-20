import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { User, UserDocument } from './schemas/user.schema'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { SetPasswordDto } from './dto/set-password.dto'

export interface SafeUser {
  id: string
  email: string
  name: string
  role: string
  image?: string
  phoneNumber?: string
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async register(dto: RegisterDto): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec()
    if (existing) {
      throw new ConflictException('An account with this email already exists')
    }

    const hashed = await bcrypt.hash(dto.password, 12)
    return this.userModel.create({
      email: dto.email.toLowerCase().trim(),
      name: dto.name.trim(),
      password: hashed,
      role: 'user',
    })
  }

  async login(dto: LoginDto): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .select('+password')
      .exec()
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password')
    }

    const match = await bcrypt.compare(dto.password, user.password)
    if (!match) {
      throw new UnauthorizedException('Invalid email or password')
    }

    return user
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).select('+password').exec()
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid session')
    }

    const match = await bcrypt.compare(dto.currentPassword, user.password)
    if (!match) {
      throw new UnauthorizedException('Current password is incorrect')
    }

    const hashed = await bcrypt.hash(dto.newPassword, 12)
    user.password = hashed
    await user.save()

    return { message: 'Password changed successfully' }
  }

  async findOrCreateGoogleUser(profile: {
    id: string
    emails?: Array<{ value: string; verified?: boolean }>
    displayName?: string
    photos?: Array<{ value: string }>
  }): Promise<UserDocument> {
    const email = profile.emails?.[0]?.value?.toLowerCase().trim()
    if (!email) {
      throw new UnauthorizedException('Google account has no email')
    }

    // Match by googleId first (most reliable), then fall back to email
    let user = await this.userModel.findOne({ googleId: profile.id }).exec()
    if (user) {
      if (!user.image && profile.photos?.[0]?.value) {
        user.image = profile.photos[0].value
        await user.save()
      }
      return user
    }

    user = await this.userModel.findOne({ email }).exec()
    if (user) {
      // Link Google account to existing email user
      user.googleId = profile.id
      if (!user.image && profile.photos?.[0]?.value) {
        user.image = profile.photos[0].value
      }
      await user.save()
      return user
    }

    return this.userModel.create({
      email,
      name: profile.displayName?.trim() || email.split('@')[0] || 'User',
      role: 'user',
      googleId: profile.id,
      image: profile.photos?.[0]?.value,
    })
  }

  async validateUserById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec()
  }

  async userHasPassword(userId: string): Promise<boolean> {
    const doc = await this.userModel
      .findById(userId)
      .select('password')
      .lean()
      .exec()
    return !!(doc as { password?: string } | null)?.password
  }

  async setPassword(userId: string, dto: SetPasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match')
    }
    const user = await this.userModel.findById(userId).select('+password').exec()
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    if (user.password) {
      throw new BadRequestException('You already have a password. Use change-password.')
    }
    const hashed = await bcrypt.hash(dto.newPassword, 12)
    user.password = hashed
    await user.save()
    return { message: 'Password set successfully' }
  }

  toSafeUser(user: UserDocument): SafeUser {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: typeof user.role === 'string' ? user.role : 'user',
      image: user.image,
      phoneNumber: user.phoneNumber,
    }
  }
}
