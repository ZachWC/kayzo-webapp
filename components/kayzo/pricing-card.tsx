"use client"

import type { PricingChatPayload } from "@/lib/types"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

function productUrl(store: PricingChatPayload["store"], name: string, sku: string): string {
  const term = sku.trim() ? sku : name
  if (store === "lowes") {
    return `https://www.lowes.com/search?searchTerm=${encodeURIComponent(term)}`
  }
  return `https://www.homedepot.com/s/${encodeURIComponent(term)}`
}

export function PricingCard({ data }: { data: PricingChatPayload }) {
  const label = data.store === "lowes" ? "Lowe's" : "Home Depot"
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-bold text-foreground text-sm">{label} pricing</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Search: {data.query}</p>
      </div>
      <ul className="divide-y divide-border max-h-64 overflow-y-auto">
        {data.items.length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">No products returned.</li>
        ) : (
          data.items.map((p, i) => (
            <li key={`${p.sku}-${i}`} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground leading-snug">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${p.price.toFixed(2)} / {p.unit} · SKU {p.sku || "—"} · {p.inStock ? "In stock" : "Out of stock"}
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" asChild>
                <a href={productUrl(data.store, p.name, p.sku)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View
                </a>
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
