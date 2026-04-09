import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { SliceService } from './slice.service'
import { SliceController } from './slice.controller'

@Module({
  imports: [AuthModule],
  controllers: [SliceController],
  providers: [SliceService],
  exports: [SliceService],
})
export class SliceModule {}
