import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { CourierSettings, CourierSettingsSchema } from './schemas/courier-settings.schema'
import { SettingsService } from './settings.service'
import { SettingsController } from './settings.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourierSettings.name, schema: CourierSettingsSchema },
    ]),
    AuthModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
