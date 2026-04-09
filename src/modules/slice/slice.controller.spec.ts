import 'reflect-metadata'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { SliceController } from './slice.controller'
import { SessionGuard } from '../auth/guards/session.guard'

describe('SliceController', () => {
  it('protects slice endpoint with SessionGuard', () => {
    const metadata = Reflect.getMetadata(GUARDS_METADATA, SliceController.prototype.proxy) as Array<any>
    expect(metadata).toBeTruthy()
    expect(metadata.some((guard) => guard === SessionGuard)).toBe(true)
  })
})
