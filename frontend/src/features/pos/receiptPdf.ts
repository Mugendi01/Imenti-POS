import jsPDF from 'jspdf'
import type { Sale } from '@/types'

export function downloadReceiptPdf(sale: Sale & { change?: number }) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 150] })
  const centerX = 40
  let y = 10

  doc.setFontSize(12)
  doc.text('Imenti POS', centerX, y, { align: 'center' })
  y += 6

  doc.setFontSize(9)
  doc.text(sale.invoice_no, centerX, y, { align: 'center' })
  y += 4
  doc.text(new Date(sale.created_at).toLocaleString(), centerX, y, { align: 'center' })
  y += 5

  doc.line(5, y, 75, y)
  y += 5

  const row = (label: string, value: string) => {
    doc.text(label, 5, y)
    doc.text(value, 75, y, { align: 'right' })
    y += 5
  }

  sale.items?.forEach((item) => {
    row(`${item.product_name} x${item.qty}`, item.subtotal.toFixed(2))
  })

  doc.line(5, y, 75, y)
  y += 5

  row('Subtotal', sale.subtotal.toFixed(2))
  row('Discount', `-${sale.discount.toFixed(2)}`)
  row('Tax', sale.tax.toFixed(2))

  doc.setFontSize(10)
  row('Total', sale.total.toFixed(2))
  doc.setFontSize(9)

  if (sale.payment_method === 'cash' && sale.change !== undefined) {
    row('Change', sale.change.toFixed(2))
  }
  if (sale.payment_method === 'mpesa') {
    row('M-Pesa', sale.phone ?? '')
  }

  doc.save(`${sale.invoice_no}.pdf`)
}
