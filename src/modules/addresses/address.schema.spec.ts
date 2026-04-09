import { AddressSchema } from './schemas/address.schema'

describe('AddressSchema', () => {
  it('enforces one default address per user with partial unique index', () => {
    const indexes = AddressSchema.indexes()
    const hasDefaultUniqueIndex = indexes.some(([fields, options]) => {
      const typedFields = fields as Record<string, unknown>
      const typedOptions = options as Record<string, unknown>
      return (
        typedFields.user === 1 &&
        typedFields.isDefault === 1 &&
        typedOptions.unique === true &&
        typeof typedOptions.partialFilterExpression === 'object'
      )
    })

    expect(hasDefaultUniqueIndex).toBe(true)
  })
})
