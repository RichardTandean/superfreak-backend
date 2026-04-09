import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { HealthModule } from './modules/health/health.module'
import { AuthModule } from './modules/auth/auth.module'
import { PrintingModule } from './modules/printing/printing.module'
import { SettingsModule } from './modules/settings/settings.module'
import { UsersModule } from './modules/users/users.module'
import { AddressesModule } from './modules/addresses/addresses.module'
import { CartModule } from './modules/cart/cart.module'
import { OrdersModule } from './modules/orders/orders.module'
import { OrderMessagesModule } from './modules/order-messages/order-messages.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { FilesModule } from './modules/files/files.module'
import { BlogModule } from './modules/blog/blog.module'
import { MediaModule } from './modules/media/media.module'
import { ShippingModule } from './modules/shipping/shipping.module'
import { SliceModule } from './modules/slice/slice.module'
import { WilayahModule } from './modules/wilayah/wilayah.module'
import { RedisModule } from './config/redis.module'
import { R2Module } from './shared/r2.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    R2Module,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('DATABASE_URL', 'mongodb://127.0.0.1/superfreak'),
        retryWrites: true,
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    HealthModule,
    AuthModule,
    PrintingModule,
    SettingsModule,
    UsersModule,
    AddressesModule,
    CartModule,
    OrdersModule,
    OrderMessagesModule,
    PaymentsModule,
    FilesModule,
    BlogModule,
    MediaModule,
    ShippingModule,
    SliceModule,
    WilayahModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
