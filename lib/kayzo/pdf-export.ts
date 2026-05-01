/**
 * Shared jsPDF builders for bid / invoice attachments and downloads.
 */

export type PdfLineItem = {
  id: string
  description: string
  qty: number
  unit: string
  unitPrice: number
}

function calcSubtotal(items: PdfLineItem[]) {
  return items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
}

export async function buildBidPdfBlob(params: {
  jobName: string
  date: string
  lineItems: PdfLineItem[]
  markupPct: number
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF()
  const { jobName, date, lineItems, markupPct } = params
  const subtotal = calcSubtotal(lineItems)
  const markupAmount = subtotal * (markupPct / 100)
  const grandTotal = subtotal + markupAmount

  let y = 20
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(`Bid — ${jobName}`, 14, y)
  y += 8
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(date, 14, y)
  y += 12

  doc.setFont("helvetica", "bold")
  doc.text("Description", 14, y)
  doc.text("Qty", 110, y, { align: "right" })
  doc.text("Unit", 125, y)
  doc.text("Unit Price", 165, y, { align: "right" })
  doc.text("Total", 196, y, { align: "right" })
  y += 2
  doc.line(14, y, 196, y)
  y += 6
  doc.setFont("helvetica", "normal")
  for (const item of lineItems) {
    doc.text(item.description.slice(0, 42), 14, y)
    doc.text(String(item.qty), 110, y, { align: "right" })
    doc.text(item.unit, 125, y)
    doc.text(`$${item.unitPrice.toFixed(2)}`, 165, y, { align: "right" })
    doc.text(`$${(item.qty * item.unitPrice).toFixed(2)}`, 196, y, { align: "right" })
    y += 7
  }
  y += 3
  doc.line(14, y, 196, y)
  y += 7
  doc.text("Subtotal", 140, y)
  doc.text(`$${subtotal.toFixed(2)}`, 196, y, { align: "right" })
  y += 7
  doc.text(`Markup (${markupPct}%)`, 140, y)
  doc.text(`$${markupAmount.toFixed(2)}`, 196, y, { align: "right" })
  y += 2
  doc.line(140, y, 196, y)
  y += 7
  doc.setFont("helvetica", "bold")
  doc.text("Grand Total", 140, y)
  doc.text(`$${grandTotal.toFixed(2)}`, 196, y, { align: "right" })

  return doc.output("blob")
}

export async function buildInvoicePdfBlob(params: {
  jobName: string
  date: string
  lineItems: PdfLineItem[]
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF()
  const { jobName, date, lineItems } = params
  const subtotal = calcSubtotal(lineItems)

  let y = 20
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(`Invoice — ${jobName}`, 14, y)
  y += 8
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(date, 14, y)
  y += 12

  doc.setFont("helvetica", "bold")
  doc.text("Description", 14, y)
  doc.text("Qty", 110, y, { align: "right" })
  doc.text("Unit", 125, y)
  doc.text("Unit Price", 165, y, { align: "right" })
  doc.text("Total", 196, y, { align: "right" })
  y += 2
  doc.line(14, y, 196, y)
  y += 6
  doc.setFont("helvetica", "normal")
  for (const item of lineItems) {
    doc.text(item.description.slice(0, 42), 14, y)
    doc.text(String(item.qty), 110, y, { align: "right" })
    doc.text(item.unit, 125, y)
    doc.text(`$${item.unitPrice.toFixed(2)}`, 165, y, { align: "right" })
    doc.text(`$${(item.qty * item.unitPrice).toFixed(2)}`, 196, y, { align: "right" })
    y += 7
  }
  y += 3
  doc.line(14, y, 196, y)
  y += 7
  doc.text("Total due", 140, y)
  doc.setFont("helvetica", "bold")
  doc.text(`$${subtotal.toFixed(2)}`, 196, y, { align: "right" })

  return doc.output("blob")
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  let binary = ""
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
