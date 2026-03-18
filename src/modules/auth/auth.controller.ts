import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { AuthService, AuthResult } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { SetPasswordDto } from './dto/set-password.dto'
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
  const isProd = process.env.NODE_ENV === 'production'
  res.clearCookie(COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
  })
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects to Google; no body
  }

  @Get('callback/google')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request & { user: UserDocument }, @Res() res: Response) {
    const user = req.user
    if (!user) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      return res.redirect(`${frontendUrl}?error=auth_failed`)
    }
    const result = this.auth.buildAuthResult(user)
    setAuthCookie(res, result.accessToken)
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
    return res.redirect(frontendUrl)
  }

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

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentUser() user: UserDocument, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user._id.toString(), dto)
  }

  @Post('set-password')
  @UseGuards(JwtAuthGuard)
  async setPassword(@CurrentUser() user: UserDocument, @Body() dto: SetPasswordDto) {
    return this.auth.setPassword(user._id.toString(), dto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: UserDocument) {
    const hasPassword = await this.auth.userHasPassword(user._id.toString())
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
      phoneNumber: user.phoneNumber,
      hasPassword,
    }
  }
}
