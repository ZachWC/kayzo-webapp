"use client"

import { useState } from "react"
import { Pencil, Clipboard, Download, Plus, Save, Check, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { buildBidPdfBlob, blobToBase64 } from "@/lib/kayzo/pdf-export"
import { SendEmailModal } from "./send-email-modal"
import { useAppStore } from "@/store"

export interface BidLineItem {
  id: string
  description: string
  qty: number
  unit: string
  unitPrice: number
}

interface BidCardProps {
  jobName: string
  date: string
  lineItems: BidLineItem[]
  markup?: number
  customerSlug: string
}

function calcTotal(items: BidLineItem[]) {
  return items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0)
}

export function BidCard({
  jobName,
  date,
  lineItems: initialItems,
  markup = 15,
  customerSlug,
}: BidCardProps) {
  const { addMessage } = useAppStore()
  const [items, setItems] = useState<BidLineItem[]>(initialItems)
  const [markupPct, setMarkupPct] = useState(markup)
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)

  const subtotal = calcTotal(items)
  const markupAmount = subtotal * (markupPct / 100)
  const grandTotal = subtotal + markupAmount

  const updateItem = (id: string, field: keyof BidLineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, [field]: field === "description" || field === "unit" ? value : Number(value) }
          : item
      )
    )
  }

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        description: "New item",
        qty: 1,
        unit: "ea",
        unitPrice: 0,
      },
    ])
  }

  const handleCopy = () => {
    const lines = [
      `BID: ${jobName}`,
      `Date: ${date}`,
      ``,
      `Description                    Qty   Unit      Unit Price    Total`,
      ...items.map(
        (i) =>
          `${i.description.padEnd(30)} ${String(i.qty).padStart(5)} ${i.unit.padEnd(8)} $${i.unitPrice.toFixed(2).padStart(10)}  $${(i.qty * i.unitPrice).toFixed(2)}`
      ),
      ``,
      `Subtotal:   $${subtotal.toFixed(2)}`,
      `Markup (${markupPct}%): $${markupAmount.toFixed(2)}`,
      `Grand Total: $${grandTotal.toFixed(2)}`,
    ].join("\n")
    navigator.clipboard.writeText(lines).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toPdfLineItems = () =>
    items.map((i) => ({
      id: i.id,
      description: i.description,
      qty: i.qty,
      unit: i.unit,
      unitPrice: i.unitPrice,
    }))

  const handleDownloadPdf = async () => {
    const blob = await buildBidPdfBlob({
      jobName,
      date,
      lineItems: toPdfLineItems(),
      markupPct,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${jobName.replace(/\s+/g, "-")}-bid.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
        <div>
          <h3 className="font-bold text-foreground text-base leading-tight">{jobName}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{date}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 gap-1.5 text-xs"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {isEditing ? "Save" : "Edit"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 gap-1.5 text-xs"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Clipboard className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" variant="outline" className="h-8 px-2.5 gap-1.5 text-xs" onClick={() => void handleDownloadPdf()}>
            <Download className="w-3.5 h-3.5" />
            PDF
          </Button>
          <Button size="sm" className="h-8 px-2.5 gap-1.5 text-xs" onClick={() => setEmailOpen(true)}>
            <Mail className="w-3.5 h-3.5" />
            Send
          </Button>
        </div>
      </div>

      {/* Line items — horizontally scrollable on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="bg-muted/60">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Description
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">
                Qty
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20">
                Unit
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">
                Unit Price
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5">
                  {isEditing ? (
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      className="h-7 text-sm border-muted"
                    />
                  ) : (
                    <span className="text-foreground">{item.description}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                      className="h-7 text-sm text-right border-muted w-16"
                    />
                  ) : (
                    <span className="text-foreground tabular-nums">{item.qty}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {isEditing ? (
                    <Input
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                      className="h-7 text-sm border-muted"
                    />
                  ) : (
                    <span className="text-muted-foreground">{item.unit}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                      className="h-7 text-sm text-right border-muted"
                    />
                  ) : (
                    <span className="text-foreground tabular-nums">
                      ${item.unitPrice.toFixed(2)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-foreground font-medium tabular-nums">
                    ${(item.qty * item.unitPrice).toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isEditing && (
          <div className="px-4 py-2 border-t border-dashed border-border">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add row
            </button>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="p-4 border-t border-border bg-muted/30 space-y-2">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums font-medium text-foreground">
            ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Markup</span>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={markupPct}
                  onChange={(e) => setMarkupPct(Number(e.target.value))}
                  className="h-6 w-14 text-xs text-center border-muted"
                />
                <span className="text-xs">%</span>
              </div>
            ) : (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium text-foreground">
                {markupPct}%
              </span>
            )}
          </div>
          <span className="tabular-nums font-medium text-foreground">
            +${markupAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="font-bold text-foreground text-base">Grand Total</span>
          <span className="font-bold text-foreground text-2xl tabular-nums">
            ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
    <SendEmailModal
      open={emailOpen}
      onOpenChange={setEmailOpen}
      customerSlug={customerSlug}
      defaultSubject={`Bid: ${jobName}`}
      defaultBody={`Please find the bid attached for ${jobName}.\n\nThank you.`}
      buildAttachment={async () => {
        const blob = await buildBidPdfBlob({
          jobName,
          date,
          lineItems: toPdfLineItems(),
          markupPct,
        })
        const base64 = await blobToBase64(blob)
        return { filename: `${jobName.replace(/\s+/g, "-")}-bid.pdf`, base64 }
      }}
      onSent={(to) => {
        addMessage({
          id: crypto.randomUUID(),
          role: "system",
          content: `Email sent to ${to}.`,
          timestamp: new Date(),
          type: "text",
        })
      }}
    />
    </>
  )
}
