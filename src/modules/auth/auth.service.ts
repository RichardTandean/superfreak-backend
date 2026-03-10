import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { User, UserDocument } from './schemas/user.schema'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

export interface JwtPayload {
  sub: string
  email: string
}

export interface AuthResult {
  user: { id: string; email: string; name: string; role: string; image?: string }
  accessToken: string
  expiresIn: number
}

@Injectable()
export class AuthService {
  private readonly jwtExpiresIn = 60 * 60 * 24 * 7 // 7 days in seconds

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec()
    if (existing) {
      throw new ConflictException('An account with this email already exists')
    }

    const hashed = await bcrypt.hash(dto.password, 12)
    const user = await this.userModel.create({
      email: dto.email.toLowerCase().trim(),
      name: dto.name.trim(),
      password: hashed,
      role: 'user',
    })

    return this.buildAuthResult(user)
  }

  async login(dto: LoginDto): Promise<AuthResult> {
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

    return this.buildAuthResult(user)
  }

  /** Find or create user from Google profile; used by Google OAuth strategy. */
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

    let user = await this.userModel.findOne({ email }).exec()
    if (user) {
      if (!user.image && profile.photos?.[0]?.value) {
        user.image = profile.photos[0].value
        await user.save()
      }
      return user
    }

    user = await this.userModel.create({
      email,
      name: profile.displayName?.trim() || email.split('@')[0] || 'User',
      role: 'user',
      image: profile.photos?.[0]?.value,
    })
    return user
  }

  async validateUserById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec()
  }

  buildAuthResult(user: UserDocument): AuthResult {
    const payload: JwtPayload = { sub: user._id.toString(), email: user.email }
    const accessToken = this.jwtService.sign(payload, { expiresIn: this.jwtExpiresIn })
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
      accessToken,
      expiresIn: this.jwtExpiresIn,
    }
  }
}
