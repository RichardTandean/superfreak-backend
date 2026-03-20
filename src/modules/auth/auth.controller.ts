import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { AuthService, SafeUser } from './auth.service'
import { SessionService } from './session.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { SetPasswordDto } from './dto/set-password.dto'
import { SessionGuard } from './guards/session.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { UserDocument } from './schemas/user.schema'

const COOKIE_NAME = 'sid'
const COOKIE_MAX_AGE = 60 * 60 // 1 hour in seconds

function getCookieDomain(): string | undefined {
  const frontendUrl = process.env.FRONTEND_URL
  if (!frontendUrl) return undefined
  try {
    const host = new URL(frontendUrl).hostname
    const parts = host.split('.')
    if (parts.length >= 2) {
      return '.' + parts.slice(-2).join('.')
    }
  } catch {}
  return undefined
}

function setSessionCookie(res: Response, sessionId: string) {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE * 1000,
    path: '/',
    domain: getCookieDomain(),
  })
}

function clearSessionCookie(res: Response) {
  const isProd = process.env.NODE_ENV === 'production'
  res.clearCookie(COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain: getCookieDomain(),
  })
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

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
    const role = typeof user.role === 'string' ? user.role : 'user'
    const sessionId = await this.sessions.createSession(user._id.toString(), role)
    setSessionCookie(res, sessionId)
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
    return res.redirect(frontendUrl)
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SafeUser }> {
    const user = await this.auth.register(dto)
    const sessionId = await this.sessions.createSession(user._id.toString(), user.role)
    setSessionCookie(res, sessionId)
    return { user: this.auth.toSafeUser(user) }
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SafeUser }> {
    const user = await this.auth.login(dto)
    const role = typeof user.role === 'string' ? user.role : 'user'
    const sessionId = await this.sessions.createSession(user._id.toString(), role)
    setSessionCookie(res, sessionId)
    return { user: this.auth.toSafeUser(user) }
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const sessionId = req.cookies?.[COOKIE_NAME]
    if (sessionId) {
      await this.sessions.destroySession(sessionId)
    }
    clearSessionCookie(res)
    return { message: 'Logged out' }
  }

  @Post('change-password')
  @UseGuards(SessionGuard)
  async changePassword(
    @CurrentUser() user: UserDocument,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const result = await this.auth.changePassword(user._id.toString(), dto)
    // Invalidate all sessions on password change for security
    await this.sessions.destroyAllForUser(user._id.toString())
    // Create a fresh session so the current user stays logged in
    const newSessionId = await this.sessions.createSession(
      user._id.toString(),
      typeof user.role === 'string' ? user.role : 'user',
    )
    const res = req.res!
    setSessionCookie(res, newSessionId)
    return result
  }

  @Post('set-password')
  @UseGuards(SessionGuard)
  async setPassword(@CurrentUser() user: UserDocument, @Body() dto: SetPasswordDto) {
    return this.auth.setPassword(user._id.toString(), dto)
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentUser() user: UserDocument) {
    const hasPassword = await this.auth.userHasPassword(user._id.toString())
    return {
      ...this.auth.toSafeUser(user),
      hasPassword,
    }
  }
}
