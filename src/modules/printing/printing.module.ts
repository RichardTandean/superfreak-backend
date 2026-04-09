import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '../auth/auth.module'
import {
  CatalogPricing,
  CatalogPricingSchema,
  FilamentList,
  FilamentListSchema,
  FilamentType,
  FilamentTypeSchema,
  LayerHeight,
  LayerHeightSchema,
} from './schemas'
import { PrintingService } from './printing.service'
import { PrintingController } from './printing.controller'

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: FilamentType.name, schema: FilamentTypeSchema },
      { name: FilamentList.name, schema: FilamentListSchema },
      { name: LayerHeight.name, schema: LayerHeightSchema },
      { name: CatalogPricing.name, schema: CatalogPricingSchema },
    ]),
  ],
  controllers: [PrintingController],
  providers: [PrintingService],
  exports: [PrintingService],
})
export class PrintingModule {}
