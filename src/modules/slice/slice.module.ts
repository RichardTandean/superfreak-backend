import { Module } from '@nestjs/common'
import { SliceService } from './slice.service'
import { SliceController } from './slice.controller'

@Module({
  controllers: [SliceController],
  providers: [SliceService],
  exports: [SliceService],
})
export class SliceModule {}
