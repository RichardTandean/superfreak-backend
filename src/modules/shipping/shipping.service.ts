import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '../../config/redis.module'
import { SettingsService } from '../settings/settings.service'

const BITESHIP_API_URL = 'https://api.biteship.com/v1/rates/couriers'
const RAJAONGKIR_COST_URL = 'https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost'
const RAJAONGKIR_SEARCH_URL = 'https://rajaongkir.komerce.id/api/v1/destination/domestic-destination'

const SHIPPING_CACHE_TTL = 86400 // 24 hours

interface BiteshipPricingItem {
  courier_name?: string
  courier_code?: string
  courier_service_name?: string
  courier_service_code?: string
  description?: string
  price?: number
  shipping_fee?: number
  duration?: string
  shipment_duration_range?: string
  shipment_duration_unit?: string
}

function shippingCacheKey(
  originId: string,
  destinationId: string,
  weight: number,
  courier: string,
): string {
  return `shipping:${originId}:${destinationId}:${weight}:${courier}`
}

@Injectable()
export class ShippingService {
  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getBiteshipRates(dto: {
    destinationPostalCode: number
    weight: number
    courier?: string
    couriers?: string[]
  }): Promise<{ meta: { message: string; code: number; status: string }; data: any[] }> {
    const apiKey = this.config.get<string>('BITESHIP_API_KEY')
    if (!apiKey) {
      throw new Error('Biteship API key not configured. Set BITESHIP_API_KEY in env.')
    }

    const couriersList: string[] = Array.isArray(dto.couriers)
      ? dto.couriers.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
      : dto.courier
        ? [String(dto.courier).trim().toLowerCase()]
        : []
    if (couriersList.length === 0) {
      throw new Error('courier or couriers (array) is required')
    }

    const couriersParam = [...new Set(couriersList)].sort().join(',')
    const settings = (await this.settings.getCourier()) as { warehousePostalCode?: string }
    const originPostalCode =
      String(
        settings?.warehousePostalCode ||
          this.config.get<string>('BITESHIP_ORIGIN_POSTAL_CODE') ||
          '12440',
      ).replace(/\D/g, '') || '12440'
    const destPostal = String(dto.destinationPostalCode).replace(/\D/g, '').slice(0, 5)
    const adjustedWeight = dto.weight < 300 ? dto.weight + 300 : dto.weight

    const cacheKey = shippingCacheKey(originPostalCode, destPostal, adjustedWeight, couriersParam)
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached) as { meta?: unknown; data?: unknown[] }
      if (parsed?.data && Array.isArray(parsed.data)) {
        return parsed as { meta: { message: string; code: number; status: string }; data: any[] }
      }
    }

    const response = await fetch(BITESHIP_API_URL, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin_postal_code: Number(originPostalCode) || 12440,
        destination_postal_code: Number(destPostal),
        couriers: couriersParam,
        items: [
          { name: 'Order', value: 0, quantity: 1, weight: adjustedWeight },
        ],
      }),
    })

    const data = (await response.json().catch(() => null)) as any
    if (!response.ok) {
      const message = data?.message || data?.error || response.statusText
      throw new Error(`Biteship API request failed: ${message}`)
    }
    if (!data.pricing || !Array.isArray(data.pricing)) {
      throw new Error('Invalid Biteship response: no pricing array')
    }

    const dataFormatted = (data.pricing as BiteshipPricingItem[]).map((p) => {
      const etd =
        p.duration ||
        (p.shipment_duration_range
          ? `${p.shipment_duration_range} ${p.shipment_duration_unit || 'days'}`
          : '')
      return {
        courierCode: (p.courier_code || '').toLowerCase(),
        name: p.courier_name || p.courier_code || '',
        code: p.courier_service_code || p.courier_code || '',
        service: p.courier_service_name || p.courier_service_code || p.courier_code || '',
        description: p.description || '',
        cost: p.price ?? p.shipping_fee ?? 0,
        etd: etd || '-',
      }
    })

    const payload = {
      meta: { message: 'Success', code: 200, status: 'success' },
      data: dataFormatted,
    }
    await this.redis.setex(cacheKey, SHIPPING_CACHE_TTL, JSON.stringify(payload))
    return payload
  }

  async getRajaOngkirCost(dto: {
    destinationId: string
    weight: number
    courier: string
  }): Promise<any> {
    const apiKey = this.config.get<string>('RAJAONGKIR_SHIPPING_COST_API')
    if (!apiKey) {
      throw new Error('RajaOngkir API key not configured')
    }

    const settings = (await this.settings.getCourier()) as { warehouseId?: number }
    const warehouseId = settings?.warehouseId ?? 73633
    const adjustedWeight = dto.weight < 300 ? dto.weight + 300 : dto.weight

    const cacheKey = shippingCacheKey(
      String(warehouseId),
      dto.destinationId,
      adjustedWeight,
      dto.courier,
    )
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const formData = new URLSearchParams({
      origin: String(warehouseId),
      destination: dto.destinationId,
      weight: String(adjustedWeight),
      courier: dto.courier,
    })

    const response = await fetch(RAJAONGKIR_COST_URL, {
      method: 'POST',
      headers: {
        key: apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const text = await response.text()
    if (!response.ok) {
      let details = text
      try {
        const errJson = JSON.parse(text)
        if (errJson.meta?.message) details = errJson.meta.message
      } catch {
        // keep text
      }
      throw new Error(`RajaOngkir API request failed: ${details}`)
    }

    const data = JSON.parse(text)
    await this.redis.setex(cacheKey, SHIPPING_CACHE_TTL, text)
    return data
  }

  async searchRajaOngkirDestination(query: string, limit = 20, offset = 0): Promise<any> {
    const apiKey = this.config.get<string>('RAJAONGKIR_SHIPPING_COST_API')
    if (!apiKey) {
      throw new Error('RajaOngkir API key not configured')
    }

    const url = `${RAJAONGKIR_SEARCH_URL}?search=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { key: apiKey },
    })

    const text = await response.text()
    if (!response.ok) {
      throw new Error(`RajaOngkir API request failed: ${text}`)
    }
    return JSON.parse(text)
  }
}
