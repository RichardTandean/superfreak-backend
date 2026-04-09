import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import {
  CatalogPricing,
  CatalogPricingDocument,
  FilamentList,
  FilamentListDocument,
  FilamentType,
  FilamentTypeDocument,
  LayerHeight,
  LayerHeightDocument,
} from './schemas'
import { CreateFilamentDto } from './dto/create-filament.dto'
import { UpdateFilamentDto } from './dto/update-filament.dto'
import { CreateFilamentListDto } from './dto/create-filament-list.dto'
import { UpdateFilamentListDto } from './dto/update-filament-list.dto'
import { CreateLayerHeightDto } from './dto/create-layer-height.dto'
import { UpdateLayerHeightDto } from './dto/update-layer-height.dto'
import { UpsertCatalogPricingDto } from './dto/upsert-catalog-pricing.dto'

export interface PrintingQuery {
  isActive?: boolean
}

function withId<T extends { _id: unknown }>(d: T): T & { id: string } {
  return { ...d, id: String(d._id) } as T & { id: string }
}

@Injectable()
export class PrintingService {
  constructor(
    @InjectModel(FilamentType.name) private readonly filamentModel: Model<FilamentTypeDocument>,
    @InjectModel(FilamentList.name) private readonly filamentListModel: Model<FilamentListDocument>,
    @InjectModel(LayerHeight.name) private readonly layerHeightModel: Model<LayerHeightDocument>,
    @InjectModel(CatalogPricing.name) private readonly catalogPricingModel: Model<CatalogPricingDocument>,
  ) {}

  private assertObjectId(id: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`)
    }
    return new Types.ObjectId(id)
  }

  // —— Public catalog (no brand on variants) ——

  async getCatalog(query: PrintingQuery = {}) {
    const active =
      query.isActive !== undefined ? { isActive: query.isActive } : { isActive: true }

    const [types, variantsRaw, layerHeights, pricesRaw] = await Promise.all([
      this.filamentModel.find(active).sort({ name: 1 }).lean().exec(),
      this.filamentListModel.find(active).populate('filamentType', 'name').sort({ colorName: 1 }).lean().exec(),
      this.layerHeightModel.find(active).sort({ sortOrder: 1, value: 1 }).lean().exec(),
      this.catalogPricingModel.find(active).populate('layerHeight').lean().exec(),
    ])

    const typesOut = types.map((d: any) => ({
      id: d._id.toString(),
      name: d.name,
      isActive: d.isActive,
      description: d.description,
    }))

    const variantsOut = variantsRaw
      .map((v: any) => {
        const ft = v.filamentType
        const typeId = ft?._id ? ft._id.toString() : String(v.filamentType)
        const typeName = typeof ft === 'object' && ft?.name ? ft.name : ''
        return {
          id: v._id.toString(),
          filamentTypeId: typeId,
          typeName,
          colorName: v.colorName,
          hexCode: v.hexCode,
          isActive: v.isActive,
        }
      })
      .sort((a, b) => a.typeName.localeCompare(b.typeName) || a.colorName.localeCompare(b.colorName))

    const layerHeightsOut = layerHeights.map((h: any) => ({
      id: h._id.toString(),
      value: h.value,
      isActive: h.isActive,
      sortOrder: h.sortOrder ?? 0,
    }))

    const pricesOut = pricesRaw.map((p: any) => {
      const lh = p.layerHeight
      const lhId = lh?._id ? lh._id.toString() : String(p.layerHeight)
      const lhVal = typeof lh === 'object' && lh != null && 'value' in lh ? lh.value : null
      return {
        id: p._id.toString(),
        filamentListId: p.filamentList.toString(),
        layerHeightId: lhId,
        layerHeightValue: lhVal,
        pricePerGram: p.pricePerGram,
        isActive: p.isActive,
      }
    })

    return { types: typesOut, variants: variantsOut, layerHeights: layerHeightsOut, prices: pricesOut }
  }

  // —— Filament types ——

  async getFilamentTypes(query: PrintingQuery = {}) {
    const filter = query.isActive !== undefined ? { isActive: query.isActive } : {}
    const docs = await this.filamentModel.find(filter).sort({ name: 1 }).lean().exec()
    return docs.map((d: any) => ({ ...d, id: d._id.toString() }))
  }

  async createFilamentType(dto: CreateFilamentDto): Promise<Record<string, unknown>> {
    const name = dto.name.trim()
    const doc = await this.filamentModel.create({
      name,
      isActive: dto.isActive ?? true,
      description: dto.description?.trim(),
    })
    const lean = await this.filamentModel.findById(doc._id).lean().exec()
    return withId(lean!) as Record<string, unknown>
  }

  async updateFilamentType(id: string, dto: UpdateFilamentDto): Promise<Record<string, unknown>> {
    const _id = this.assertObjectId(id, 'filament id')
    const update: Record<string, unknown> = {}
    if (dto.name !== undefined) update.name = dto.name.trim()
    if (dto.isActive !== undefined) update.isActive = dto.isActive
    if (dto.description !== undefined) update.description = dto.description?.trim()

    const doc = await this.filamentModel
      .findByIdAndUpdate(_id, { $set: update }, { new: true })
      .lean()
      .exec()
    if (!doc) throw new NotFoundException('Filament type not found')
    return withId(doc) as Record<string, unknown>
  }

  async deleteFilamentType(id: string): Promise<{ ok: true }> {
    const _id = this.assertObjectId(id, 'filament id')
    const child = await this.filamentListModel.findOne({ filamentType: _id }).lean().exec()
    if (child) {
      throw new BadRequestException('Cannot delete filament type that still has color variants')
    }
    const r = await this.filamentModel.findByIdAndDelete(_id).exec()
    if (!r) throw new NotFoundException('Filament type not found')
    return { ok: true }
  }

  // —— Filament lists (admin: includes brand) ——

  async listFilamentListsAdmin(query: PrintingQuery = {}) {
    const filter = query.isActive !== undefined ? { isActive: query.isActive } : {}
    const docs = await this.filamentListModel
      .find(filter)
      .populate('filamentType', 'name')
      .sort({ filamentType: 1, colorName: 1 })
      .lean()
      .exec()
    return docs.map((v: any) => {
      const ft = v.filamentType
      return {
        id: v._id.toString(),
        filamentTypeId: ft?._id ? ft._id.toString() : String(v.filamentType),
        typeName: typeof ft === 'object' && ft?.name ? ft.name : '',
        colorName: v.colorName,
        hexCode: v.hexCode,
        brand: v.brand,
        isActive: v.isActive,
      }
    })
  }

  async createFilamentList(dto: CreateFilamentListDto): Promise<Record<string, unknown>> {
    const ftId = this.assertObjectId(dto.filamentTypeId, 'filamentTypeId')
    const ft = await this.filamentModel.findById(ftId).lean().exec()
    if (!ft) throw new NotFoundException('Filament type not found')

    const doc = await this.filamentListModel.create({
      filamentType: ftId,
      colorName: dto.colorName.trim(),
      hexCode: dto.hexCode?.trim() || undefined,
      brand: dto.brand?.trim() || undefined,
      isActive: dto.isActive ?? true,
    })
    const lean = await this.filamentListModel.findById(doc._id).populate('filamentType', 'name').lean().exec()
    return this.mapFilamentListAdmin(lean!)
  }

  async updateFilamentList(id: string, dto: UpdateFilamentListDto): Promise<Record<string, unknown>> {
    const _id = this.assertObjectId(id, 'filament list id')
    const update: Record<string, unknown> = {}
    if (dto.colorName !== undefined) update.colorName = dto.colorName.trim()
    if (dto.hexCode !== undefined) update.hexCode = dto.hexCode.trim() || undefined
    if (dto.brand !== undefined) update.brand = dto.brand.trim() || undefined
    if (dto.isActive !== undefined) update.isActive = dto.isActive

    const doc = await this.filamentListModel
      .findByIdAndUpdate(_id, { $set: update }, { new: true })
      .populate('filamentType', 'name')
      .lean()
      .exec()
    if (!doc) throw new NotFoundException('Filament variant not found')
    return this.mapFilamentListAdmin(doc)
  }

  async deleteFilamentList(id: string): Promise<{ ok: true }> {
    const _id = this.assertObjectId(id, 'filament list id')
    await this.catalogPricingModel.deleteMany({ filamentList: _id }).exec()
    const r = await this.filamentListModel.findByIdAndDelete(_id).exec()
    if (!r) throw new NotFoundException('Filament variant not found')
    return { ok: true }
  }

  private mapFilamentListAdmin(v: any): Record<string, unknown> {
    const ft = v.filamentType
    return {
      id: v._id.toString(),
      filamentTypeId: ft?._id ? ft._id.toString() : String(v.filamentType),
      typeName: typeof ft === 'object' && ft?.name ? ft.name : '',
      colorName: v.colorName,
      hexCode: v.hexCode,
      brand: v.brand,
      isActive: v.isActive,
    }
  }

  // —— Layer heights ——

  async listLayerHeights(query: PrintingQuery = {}) {
    const filter = query.isActive !== undefined ? { isActive: query.isActive } : {}
    const docs = await this.layerHeightModel.find(filter).sort({ sortOrder: 1, value: 1 }).lean().exec()
    return docs.map((h: any) => withId(h))
  }

  async createLayerHeight(dto: CreateLayerHeightDto): Promise<Record<string, unknown>> {
    try {
      const doc = await this.layerHeightModel.create({
        value: dto.value,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      })
      const lean = await this.layerHeightModel.findById(doc._id).lean().exec()
      return withId(lean!) as Record<string, unknown>
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new BadRequestException('Layer height value already exists')
      }
      throw e
    }
  }

  async updateLayerHeight(id: string, dto: UpdateLayerHeightDto): Promise<Record<string, unknown>> {
    const _id = this.assertObjectId(id, 'layer height id')
    const update: Record<string, unknown> = {}
    if (dto.value !== undefined) update.value = dto.value
    if (dto.isActive !== undefined) update.isActive = dto.isActive
    if (dto.sortOrder !== undefined) update.sortOrder = dto.sortOrder

    try {
      const doc = await this.layerHeightModel
        .findByIdAndUpdate(_id, { $set: update }, { new: true })
        .lean()
        .exec()
      if (!doc) throw new NotFoundException('Layer height not found')
      return withId(doc) as Record<string, unknown>
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new BadRequestException('Layer height value already exists')
      }
      throw e
    }
  }

  async deleteLayerHeight(id: string): Promise<{ ok: true }> {
    const _id = this.assertObjectId(id, 'layer height id')
    const used = await this.catalogPricingModel.findOne({ layerHeight: _id }).lean().exec()
    if (used) {
      throw new BadRequestException('Cannot delete layer height that has pricing rows')
    }
    const r = await this.layerHeightModel.findByIdAndDelete(_id).exec()
    if (!r) throw new NotFoundException('Layer height not found')
    return { ok: true }
  }

  // —— Catalog pricing ——

  async listCatalogPricingAdmin(query: PrintingQuery = {}) {
    const filter = query.isActive !== undefined ? { isActive: query.isActive } : {}
    const docs = await this.catalogPricingModel
      .find(filter)
      .populate('filamentList')
      .populate('layerHeight')
      .lean()
      .exec()
    return docs.map((p: any) => this.mapCatalogPricingAdmin(p))
  }

  private mapCatalogPricingAdmin(p: any): Record<string, unknown> {
    const v = p.filamentList
    const lh = p.layerHeight
    return {
      id: p._id.toString(),
      filamentListId: p.filamentList.toString(),
      variantColorName: typeof v === 'object' && v?.colorName ? v.colorName : '',
      layerHeightId: lh?._id ? lh._id.toString() : String(p.layerHeight),
      layerHeightValue: typeof lh === 'object' && lh != null ? lh.value : null,
      pricePerGram: p.pricePerGram,
      isActive: p.isActive,
    }
  }

  async upsertCatalogPricing(dto: UpsertCatalogPricingDto): Promise<Record<string, unknown>> {
    const listId = this.assertObjectId(dto.filamentListId, 'filamentListId')
    const lhId = this.assertObjectId(dto.layerHeightId, 'layerHeightId')

    const list = await this.filamentListModel.findById(listId).lean().exec()
    if (!list) throw new NotFoundException('Filament variant not found')
    const lh = await this.layerHeightModel.findById(lhId).lean().exec()
    if (!lh) throw new NotFoundException('Layer height not found')
    if (dto.pricePerGram <= 0) {
      throw new BadRequestException('pricePerGram must be > 0')
    }

    const doc = await this.catalogPricingModel
      .findOneAndUpdate(
        { filamentList: listId, layerHeight: lhId },
        {
          $set: {
            filamentList: listId,
            layerHeight: lhId,
            pricePerGram: dto.pricePerGram,
            isActive: dto.isActive ?? true,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .populate('filamentList')
      .populate('layerHeight')
      .lean()
      .exec()

    if (!doc) throw new NotFoundException('Pricing could not be saved')
    return this.mapCatalogPricingAdmin(doc)
  }

  async deleteCatalogPricing(id: string): Promise<{ ok: true }> {
    const _id = this.assertObjectId(id, 'catalog pricing id')
    const r = await this.catalogPricingModel.findByIdAndDelete(_id).exec()
    if (!r) throw new NotFoundException('Pricing row not found')
    return { ok: true }
  }

  /** Used by orders service */
  async resolvePricePerGramForVariant(
    filamentListId: string,
    layerHeightMm: number,
  ): Promise<number> {
    const listOid = this.assertObjectId(filamentListId, 'filamentVariantId')
    const list = await this.filamentListModel.findOne({ _id: listOid, isActive: true }).lean().exec()
    if (!list) {
      throw new BadRequestException('Invalid or inactive filament variant')
    }

    const heights = await this.layerHeightModel.find({ isActive: true }).lean().exec()
    const lh = heights.find((h) => Math.abs(Number(h.value) - layerHeightMm) < 1e-4)
    if (!lh) {
      throw new BadRequestException(`No active layer height master for ${layerHeightMm} mm`)
    }

    const row = await this.catalogPricingModel
      .findOne({ filamentList: listOid, layerHeight: lh._id, isActive: true })
      .lean()
      .exec()
    if (!row || row.pricePerGram <= 0) {
      throw new BadRequestException('No active pricing for this variant and layer height')
    }
    return row.pricePerGram
  }
}
