/**
 * Extract fenced JSON blocks the model emits for bid/invoice cards.
 * See skills/kayzo/SKILL.md for the contract.
 */

const BID_FENCE = /```kayzo-bid\s*\n([\s\S]*?)```/gi
const INVOICE_FENCE = /```kayzo-invoice\s*\n([\s\S]*?)```/gi

export function stripKayzoStructuredFences(content: string): {
  cleaned: string
  bidJsonStrings: string[]
  invoiceJsonStrings: string[]
} {
  const bidJsonStrings: string[] = []
  const invoiceJsonStrings: string[] = []

  let cleaned = content.replace(BID_FENCE, (_, inner: string) => {
    const t = inner.trim()
    if (t) bidJsonStrings.push(t)
    return ""
  })
  cleaned = cleaned.replace(INVOICE_FENCE, (_, inner: string) => {
    const t = inner.trim()
    if (t) invoiceJsonStrings.push(t)
    return ""
  })

  return { cleaned: cleaned.replace(/\n{3,}/g, "\n\n").trim(), bidJsonStrings, invoiceJsonStrings }
}
