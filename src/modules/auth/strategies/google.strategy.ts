import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-google-oauth20'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'

export interface GoogleProfile {
  id: string
  emails?: Array<{ value: string; verified?: boolean }>
  displayName?: string
  photos?: Array<{ value: string }>
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    // Passport's Google OAuth strategy throws during app bootstrap if clientID is empty.
    // In some deployments, Google OAuth may be intentionally unset; we keep the backend
    // running by providing non-empty placeholders (routes will still fail to authenticate
    // properly until real values are configured).
    const clientID = config.get<string>('GOOGLE_CLIENT_ID') || 'MISSING_GOOGLE_CLIENT_ID'
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET') || 'MISSING_GOOGLE_CLIENT_SECRET'
    const callbackBase = config.get<string>('PUBLIC_API_URL', 'http://localhost:4000')
    super({
      clientID,
      clientSecret,
      callbackURL: `${callbackBase.replace(/\/$/, '')}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    })
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const user = await this.authService.findOrCreateGoogleUser({
        id: profile.id,
        emails: profile.emails,
        displayName: profile.displayName,
        photos: profile.photos,
      })
      done(null, user)
    } catch (err) {
      done(err as Error, undefined)
    }
  }
}
