import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { AuthService, AuthResult } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { UserDocument } from './schemas/user.schema'

const COOKIE_NAME = 'access_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

function setAuthCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: COOKIE_MAX_AGE * 1000,
    path: '/',
  })
}

function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/', httpOnly: true })
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<AuthResult> {
    const result = await this.auth.register(dto)
    setAuthCookie(res, result.accessToken)
    return result
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AuthResult> {
    const result = await this.auth.login(dto)
    setAuthCookie(res, result.accessToken)
    return result
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    clearAuthCookie(res)
    return { message: 'Logged out' }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: UserDocument) {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
    }
  }
}
