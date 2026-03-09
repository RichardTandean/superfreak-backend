import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MulterModule } from '@nestjs/platform-express'
import multer from 'multer'
import { TempFile, TempFileSchema } from './schemas/temp-file.schema'
import { UserFile, UserFileSchema } from './schemas/user-file.schema'
import { Order, OrderSchema } from '../orders/schemas/order.schema'
import { FilesService } from './files.service'
import { FilesController } from './files.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TempFile.name, schema: TempFileSchema },
      { name: UserFile.name, schema: UserFileSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    MulterModule.register({ storage: multer.memoryStorage() }),
    AuthModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
