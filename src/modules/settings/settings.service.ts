import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { CourierSettings, CourierSettingsDocument } from './schemas/courier-settings.schema'
import { UpdateCourierSettingsDto } from './dto/update-courier.dto'

const DEFAULT_COURIER: Partial<CourierSettings> = {
  enabledCouriers: ['jne', 'jnt', 'sicepat'],
  pricingSettings: {
    filamentCostPerGram: 100,
    printTimeCostPerHour: 10000,
    markupPercentage: 30,
  },
  estimatedProcessingDays: 1,
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(CourierSettings.name) private readonly courierModel: Model<CourierSettingsDocument>,
  ) {}

  async getCourier(): Promise<Record<string, unknown>> {
    const doc = await this.courierModel.findOne().lean().exec()
    if (!doc) {
      return { ...DEFAULT_COURIER, id: null } as Record<string, unknown>
    }
    return { ...doc, id: (doc as any)._id.toString() } as Record<string, unknown>
  }

  async updateCourier(dto: UpdateCourierSettingsDto): Promise<Record<string, unknown>> {
    const update: Record<string, unknown> = { ...dto }
    const doc = await this.courierModel.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean().exec()
    if (!doc) throw new NotFoundException('Courier settings not found')
    return { ...doc, id: (doc as any)._id.toString() } as Record<string, unknown>
  }
}
