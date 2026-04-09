import { createHash, timingSafeEqual } from 'crypto'

export function createMidtransSignature(input: {
  orderId: string
  statusCode: string
  grossAmount: string
  serverKey: string
}) {
  return createHash('sha512')
    .update(`${input.orderId}${input.statusCode}${input.grossAmount}${input.serverKey}`)
    .digest('hex')
}

export function isValidMidtransSignature(input: {
  orderId: string
  statusCode: string
  grossAmount: string
  serverKey: string
  signatureKey: string
}) {
  const expected = createMidtransSignature(input)
  const providedBuffer = Buffer.from(input.signatureKey, 'utf-8')
  const expectedBuffer = Buffer.from(expected, 'utf-8')
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  )
}
