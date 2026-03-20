import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'
import { SessionService } from '../session.service'
import { AuthService } from '../auth.service'

const COOKIE_NAME = 'sid'

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const sessionId = request.cookies?.[COOKIE_NAME]

    if (!sessionId) {
      throw new UnauthorizedException()
    }

    const session = await this.sessionService.getSession(sessionId)
    if (!session) {
      throw new UnauthorizedException()
    }

    const user = await this.authService.validateUserById(session.userId)
    if (!user) {
      throw new UnauthorizedException()
    }

    ;(request as any).user = user
    return true
  }
}
