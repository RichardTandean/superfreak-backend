import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  FilamentType,
  FilamentTypeDocument,
  PrintingOption,
  PrintingOptionDocument,
  PrintingPricing,
  PrintingPricingDocument,
} from './schemas'

export interface PrintingQuery {
  isActive?: boolean
}

@Injectable()
export class PrintingService {
  constructor(
    @InjectModel(FilamentType.name) private readonly filamentModel: Model<FilamentTypeDocument>,
    @InjectModel(PrintingOption.name) private readonly optionModel: Model<PrintingOptionDocument>,
    @InjectModel(PrintingPricing.name) private readonly pricingModel: Model<PrintingPricingDocument>,
  ) {}

  async getFilamentTypes(query: PrintingQuery = {}) {
    const filter = query.isActive !== undefined ? { isActive: query.isActive } : {}
    const docs = await this.filamentModel.find(filter).sort({ name: 1 }).lean().exec()
    return docs.map((d: any) => ({ ...d, id: d._id.toString() }))
  }

  async getOptions(query: PrintingQuery = {}) {
    const filter = query.isActive !== undefined ? { isActive: query.isActive } : {}
    const docs = await this.optionModel.find(filter).sort({ type: 1 }).lean().exec()
    return docs.map((d: any) => ({ ...d, id: d._id.toString() }))
  }

  async getPricing(query: PrintingQuery = {}) {
    const filter = query.isActive !== undefined ? { isActive: query.isActive } : {}
    const docs = await this.pricingModel
      .find(filter)
      .populate('filamentType', 'name')
      .sort({ createdAt: 1 })
      .lean()
      .exec()
    return docs.map((d: any) => ({
      ...d,
      id: d._id.toString(),
      filamentType:
        typeof d.filamentType === 'object' && d.filamentType
          ? { id: d.filamentType._id.toString(), name: d.filamentType.name }
          : d.filamentType?.toString?.(),
    }))
  }
}
