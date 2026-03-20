import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from './schemas/user.schema'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { GoogleStrategy } from './strategies/google.strategy'
import { SessionService } from './session.service'
import { SessionGuard } from './guards/session.guard'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule.register({ defaultStrategy: 'google' }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, SessionGuard, GoogleStrategy],
  exports: [AuthService, SessionService, SessionGuard],
})
export class AuthModule {}
