import { Injectable } from '@nestjs/common'
import { jsPDF } from 'jspdf'

const BRAND_BLUE = { r: 29, g: 13, b: 243 }
const BRAND_RED = { r: 227, g: 57, b: 70 }

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

export interface OrderForInvoice {
  id: string
  orderNumber?: string | null
  createdAt: string
  items: Array<{ fileName?: string; quantity?: number; totalPrice?: number }>
  summary: { totalAmount?: number }
  shipping?: {
    recipientName?: string | null
    phoneNumber?: string | null
  } | null
}

@Injectable()
export class InvoiceService {
  buildPdf(order: OrderForInvoice): Buffer {
    const doc = new jsPDF()
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 20
    let y = 20

    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b)
    doc.text('Superfreak Studio', margin, y + 8)
    doc.setTextColor(0, 0, 0)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b)
    doc.text('INVOICE', pageW - margin, y + 8, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    y += 18

    doc.setDrawColor(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageW - margin, y)
    doc.setLineWidth(0.2)
    y += 14

    const ship = order.shipping
    const customerName = ship?.recipientName ?? '—'
    const customerPhone = ship?.phoneNumber ?? '—'
    const orderDate = formatDate(order.createdAt)
    const validTill = formatDate(
      new Date(new Date(order.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    )

    const rightColX = pageW - margin - 55
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Customer', margin, y)
    doc.text('Date', rightColX, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.text(customerName, margin, y)
    doc.text(orderDate, rightColX, y)
    y += 6

    doc.text(customerPhone, margin, y)
    doc.setFont('helvetica', 'bold')
    doc.text('Valid Till', rightColX, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(validTill, rightColX, y)
    y += 14

    const colNo = margin
    const colName = margin + 14
    const colQty = 95
    const colRate = 128
    const colAmount = 158
    const tableEnd = pageW - margin

    const headerY = y
    doc.setFillColor(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b)
    doc.rect(colNo, headerY, tableEnd - colNo, 9, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('No', colNo + 2, headerY + 6)
    doc.text('Item Name', colName + 2, headerY + 6)
    doc.text('Quantity', colQty + 2, headerY + 6)
    doc.text('Rate', colRate + 2, headerY + 6)
    doc.text('Amount', colAmount + 2, headerY + 6)
    doc.setTextColor(0, 0, 0)
    y = headerY + 9

    doc.setDrawColor(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    let totalQty = 0
    ;(order.items || []).forEach((item: any, i: number) => {
      const itemTotal = item.totalPrice ?? 0
      const qty = item.quantity ?? 1
      totalQty += qty
      const unitPrice = qty > 0 ? itemTotal / qty : 0
      const name = (item.fileName || 'Item').slice(0, 32)
      doc.line(colNo, y, tableEnd, y)
      doc.text(String(i + 1), colNo + 2, y + 5)
      doc.text(name, colName + 2, y + 5)
      doc.text(`${qty} pcs`, colQty + 2, y + 5)
      doc.text(formatCurrency(unitPrice), colRate + 2, y + 5)
      doc.text(formatCurrency(itemTotal), colAmount + 2, y + 5)
      y += 7
    })

    doc.line(colNo, y, tableEnd, y)
    doc.line(colNo, headerY, colNo, y)
    doc.line(colName, headerY, colName, y)
    doc.line(colQty, headerY, colQty, y)
    doc.line(colRate, headerY, colRate, y)
    doc.line(colAmount, headerY, colAmount, y)
    doc.line(tableEnd, headerY, tableEnd, y)
    y += 10

    const summary = order.summary || {}
    doc.setFont('helvetica', 'normal')
    doc.text('Grand Total:', colRate, y)
    doc.text(formatCurrency((summary as any).totalAmount ?? 0), tableEnd - 2, y, { align: 'right' })
    y += 6
    doc.text('Total Quantity:', colRate, y)
    doc.text(`${totalQty} pcs`, tableEnd - 2, y, { align: 'right' })
    y += 20

    const footerH = 14
    const footerY = pageH - footerH
    doc.setFillColor(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b)
    doc.rect(0, footerY, pageW, footerH, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(
      '@superfreakstudio    +62 851-2113-2367    @superfreakstudio',
      pageW / 2,
      footerY + footerH / 2 + 1,
      { align: 'center' },
    )

    const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer
    return Buffer.from(arrayBuffer)
  }
}
