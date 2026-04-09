import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import { Connection, Model } from 'mongoose'
import { Address, AddressDocument } from './schemas/address.schema'
import { CreateAddressDto } from './dto/create-address.dto'
import { UpdateAddressDto } from './dto/update-address.dto'

const MAX_ADDRESSES_PER_USER = 3

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(Address.name) private readonly addressModel: Model<AddressDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async findAllByUser(userId: string) {
    const docs = await this.addressModel
      .find({ user: userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean()
      .exec()
    return docs.map((d: any) => ({ ...d, id: d._id.toString() }))
  }

  async findOne(id: string, userId: string): Promise<Record<string, unknown>> {
    const doc = await this.addressModel.findById(id).lean().exec()
    if (!doc) throw new NotFoundException('Address not found')
    if (String(doc.user) !== userId) throw new ForbiddenException('Not your address')
    return { ...doc, id: (doc as any)._id.toString() } as Record<string, unknown>
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Record<string, unknown>> {
    const session = await this.connection.startSession()
    try {
      await session.withTransaction(async () => {
        const count = await this.addressModel.countDocuments({ user: userId }).session(session).exec()
        if (count >= MAX_ADDRESSES_PER_USER) {
          throw new BadRequestException('Maximum 3 addresses allowed per user')
        }

        const isFirst = count === 0
        const isDefault = dto.isDefault ?? isFirst

        if (isDefault) {
          await this.addressModel
            .updateMany({ user: userId }, { $set: { isDefault: false } })
            .session(session)
            .exec()
        }

        await this.addressModel.create(
          [
            {
              ...dto,
              user: userId,
              isDefault,
            },
          ],
          { session },
        )
      })

      const created = await this.addressModel
        .findOne({ user: userId })
        .sort({ createdAt: -1 })
        .lean()
        .exec()
      if (!created) throw new BadRequestException('Failed to create address')
      return { ...created, id: (created as any)._id.toString() }
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException('Only one default address is allowed')
      }
      throw error
    } finally {
      await session.endSession()
    }
  }

  async update(id: string, userId: string, dto: UpdateAddressDto) {
    const doc = await this.addressModel.findById(id).exec()
    if (!doc) throw new NotFoundException('Address not found')
    if (String(doc.user) !== userId) throw new ForbiddenException('Not your address')
    const session = await this.connection.startSession()
    try {
      await session.withTransaction(async () => {
        if (dto.isDefault === true) {
          await this.addressModel
            .updateMany(
              { user: userId, _id: { $ne: id } },
              { $set: { isDefault: false } },
            )
            .session(session)
            .exec()
        }

        Object.assign(doc, dto)
        await doc.save({ session })
      })
      return { ...doc.toObject(), id: doc._id.toString() }
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException('Only one default address is allowed')
      }
      throw error
    } finally {
      await session.endSession()
    }
  }

  async remove(id: string, userId: string) {
    const doc = await this.addressModel.findById(id).exec()
    if (!doc) throw new NotFoundException('Address not found')
    if (String(doc.user) !== userId) throw new ForbiddenException('Not your address')
    await this.addressModel.findByIdAndDelete(id).exec()
    return { message: 'Address deleted' }
  }
}
