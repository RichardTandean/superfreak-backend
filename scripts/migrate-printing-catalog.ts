/**
 * One-off migration: legacy filament-types (embedded colors) + printing-pricings (pricingTable)
 * → filament-lists, layer-heights, print-catalog-pricings.
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/migrate-printing-catalog.ts
 * Requires MONGODB_URI (or MONGO_URI) in env.
 *
 * Idempotent-ish: skips creating a filament-list if same filamentType + colorName already exists.
 * Skips catalog pricing row if duplicate (filamentList + layerHeight).
 */

import * as mongoose from 'mongoose'

const FILAMENT_TYPES = 'filament-types'
const FILAMENT_LISTS = 'filament-lists'
const LAYER_HEIGHTS = 'layer-heights'
const CATALOG_PRICINGS = 'print-catalog-pricings'
const LEGACY_PRICING = 'printing-pricings'

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!uri) {
    console.error('Set MONGODB_URI or MONGO_URI')
    process.exit(1)
  }

  await mongoose.connect(uri)
  const db = mongoose.connection.db
  if (!db) {
    console.error('No db')
    process.exit(1)
  }

  const typesCol = db.collection(FILAMENT_TYPES)
  const listsCol = db.collection(FILAMENT_LISTS)
  const lhCol = db.collection(LAYER_HEIGHTS)
  const catCol = db.collection(CATALOG_PRICINGS)
  const legacyCol = db.collection(LEGACY_PRICING)

  const types = await typesCol.find({}).toArray()
  const variantByType = new Map<string, mongoose.Types.ObjectId[]>()

  for (const doc of types) {
    const typeId = doc._id as mongoose.Types.ObjectId
    const colors = Array.isArray(doc.colors) ? doc.colors : []
    const ids: mongoose.Types.ObjectId[] = []

    if (colors.length === 0) {
      console.warn(`Type "${doc.name}" has no colors; add variants manually in admin.`)
      variantByType.set(typeId.toString(), [])
      continue
    }

    for (const c of colors) {
      const colorName = String(c.name ?? '').trim()
      if (!colorName) continue
      const existing = await listsCol.findOne({
        filamentType: typeId,
        colorName,
      })
      if (existing) {
        ids.push(existing._id as mongoose.Types.ObjectId)
        continue
      }
      const ins = await listsCol.insertOne({
        filamentType: typeId,
        colorName,
        hexCode: c.hexCode ? String(c.hexCode).trim() : undefined,
        brand: undefined,
        isActive: doc.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      ids.push(ins.insertedId as mongoose.Types.ObjectId)
    }
    variantByType.set(typeId.toString(), ids)
  }

  await typesCol.updateMany({ colors: { $exists: true } }, { $unset: { colors: '' } })

  const legacy = await legacyCol.find({}).toArray()
  const allHeights = new Set<number>()
  for (const p of legacy) {
    const table = Array.isArray(p.pricingTable) ? p.pricingTable : []
    for (const row of table) {
      if (typeof row.layerHeight === 'number' && Number.isFinite(row.layerHeight)) {
        allHeights.add(row.layerHeight)
      }
    }
  }

  let sortOrder = 0
  for (const h of Array.from(allHeights).sort((a, b) => a - b)) {
    const dup = await lhCol.findOne({ value: h })
    if (!dup) {
      await lhCol.insertOne({
        value: h,
        isActive: true,
        sortOrder: sortOrder++,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }

  for (const p of legacy) {
    const typeId = p.filamentType as mongoose.Types.ObjectId
    const typeKey = typeId.toString()
    const variantIds = variantByType.get(typeKey) ?? []
    if (variantIds.length === 0) {
      console.warn(`Legacy pricing for type ${typeKey} skipped — no variants.`)
      continue
    }
    const table = Array.isArray(p.pricingTable) ? p.pricingTable : []
    for (const row of table) {
      const lhVal = row.layerHeight
      const ppg = row.pricePerGram
      if (typeof lhVal !== 'number' || typeof ppg !== 'number') continue
      const lhDoc = await lhCol.findOne({ value: lhVal })
      if (!lhDoc) continue
      const lhId = lhDoc._id as mongoose.Types.ObjectId

      for (const listId of variantIds) {
        const exists = await catCol.findOne({ filamentList: listId, layerHeight: lhId })
        if (exists) continue
        await catCol.insertOne({
          filamentList: listId,
          layerHeight: lhId,
          pricePerGram: ppg,
          isActive: p.isActive !== false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }
  }

  console.log('Migration finished. Verify catalog via GET /api/printing/catalog')
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
