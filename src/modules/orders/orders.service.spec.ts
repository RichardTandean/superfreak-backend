import { BadRequestException } from '@nestjs/common'
import { OrdersService } from './orders.service'

describe('OrdersService pricing integrity', () => {
  it('recomputes totals on server and ignores client summary amounts', async () => {
    let createdPayload: Record<string, unknown> | null = null

    const orderModel = {
      create: jest.fn(async (payload: Record<string, unknown>) => {
        createdPayload = payload
        return {
          _id: { toString: () => 'order-1' },
          toObject: () => payload,
        }
      }),
    } as any

    const printingService = {
      resolvePricePerGramForVariant: jest.fn().mockResolvedValue(100),
    } as any

    const invoiceService = { buildPdf: jest.fn() } as any

    const service = new OrdersService(orderModel, printingService, invoiceService)
    await service.create('user-1', {
      items: [
        {
          file: 'temp-file-1',
          fileName: 'model.stl',
          quantity: 2,
          configuration: {
            material: 'PLA',
            filamentVariantId: '507f1f77bcf86cd799439011',
            layerHeight: '0.2mm',
          },
          statistics: { filamentWeight: 10, printTime: 5 },
        },
      ],
      summary: {
        subtotal: 1,
        shippingCost: 1,
        totalAmount: 1,
      },
      shipping: {
        recipientName: 'Test User',
        phoneNumber: '08123',
        addressLine1: 'Jl. Example',
        regencyName: 'City',
        provinceName: 'Province',
        postalCode: '12345',
        courier: 'jne',
        service: 'REG',
        shippingCost: 15000,
      },
      paymentInfo: { paymentStatus: 'pending' },
    } as any)

    expect(createdPayload).toBeTruthy()
    const summary = (createdPayload as any).summary
    expect(summary.subtotal).toBe(2000)
    expect(summary.shippingCost).toBe(15000)
    expect(summary.totalAmount).toBe(17000)
    expect(summary.payableAmount).toBe(17000)
    expect(printingService.resolvePricePerGramForVariant).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.any(Number),
    )
  })

  it('rejects order item when printing service cannot resolve pricing', async () => {
    const orderModel = { create: jest.fn() } as any
    const printingService = {
      resolvePricePerGramForVariant: jest.fn().mockRejectedValue(new BadRequestException('bad')),
    } as any
    const invoiceService = { buildPdf: jest.fn() } as any

    const service = new OrdersService(orderModel, printingService, invoiceService)

    await expect(
      service.create('user-1', {
        items: [
          {
            file: 'temp-file-1',
            fileName: 'model.stl',
            quantity: 1,
            configuration: {
              material: 'PLA',
              filamentVariantId: '507f1f77bcf86cd799439011',
              layerHeight: '0.2',
            },
            statistics: { filamentWeight: 5 },
          },
        ],
        shipping: {
          recipientName: 'Test User',
          phoneNumber: '08123',
          addressLine1: 'Jl. Example',
          regencyName: 'City',
          provinceName: 'Province',
          postalCode: '12345',
          courier: 'jne',
          service: 'REG',
          shippingCost: 5000,
        },
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
