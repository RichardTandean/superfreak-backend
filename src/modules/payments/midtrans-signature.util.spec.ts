import { createMidtransSignature, isValidMidtransSignature } from './midtrans-signature.util'

describe('midtrans-signature.util', () => {
  const payload = {
    orderId: 'ORD-123',
    statusCode: '200',
    grossAmount: '25000.00',
    serverKey: 'server-key-secret',
  }

  it('creates deterministic signature', () => {
    const a = createMidtransSignature(payload)
    const b = createMidtransSignature(payload)
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThan(10)
  })

  it('validates correct signature and rejects forged signature', () => {
    const signatureKey = createMidtransSignature(payload)
    expect(
      isValidMidtransSignature({
        ...payload,
        signatureKey,
      }),
    ).toBe(true)

    expect(
      isValidMidtransSignature({
        ...payload,
        signatureKey: `${signatureKey.slice(0, -1)}x`,
      }),
    ).toBe(false)
  })
})
