import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  FilamentType,
  FilamentTypeSchema,
  PrintingOption,
  PrintingOptionSchema,
  PrintingPricing,
  PrintingPricingSchema,
} from './schemas'
import { PrintingService } from './printing.service'
import { PrintingController } from './printing.controller'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FilamentType.name, schema: FilamentTypeSchema },
      { name: PrintingOption.name, schema: PrintingOptionSchema },
      { name: PrintingPricing.name, schema: PrintingPricingSchema },
    ]),
  ],
  controllers: [PrintingController],
  providers: [PrintingService],
  exports: [PrintingService],
})
export class PrintingModule {}
