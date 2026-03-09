declare module 'midtrans-client' {
  export class Snap {
    constructor(config: { isProduction: boolean; serverKey: string; clientKey: string })
    createTransaction(parameter: Record<string, unknown>): Promise<{ token: string; redirect_url: string }>
  }
  export class CoreApi {
    constructor(config: { isProduction: boolean; serverKey: string; clientKey: string })
    transaction: {
      status(orderId: string): Promise<{
        transaction_status: string
        fraud_status?: string
        payment_type?: string
        transaction_id?: string
        order_id: string
      }>
      notification(notification: Record<string, unknown>): Promise<{
        transaction_status: string
        fraud_status?: string
        payment_type?: string
        transaction_id?: string
        order_id: string
      }>
    }
  }
  const client: { Snap: typeof Snap; CoreApi: typeof CoreApi }
  export default client
  export { Snap, CoreApi }
}
