"use client"

import { useState, useEffect } from "react"
import { Package, Calendar, Mail, Flag, ChevronDown, ChevronRight, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store"
import type { ApprovalCategory } from "@/lib/types"

interface ActivityItem {
  id: string
  category: ApprovalCategory
  timestamp: string
  description: string
  detail: string
}

const categoryIconMap: Record<ApprovalCategory, React.ReactNode> = {
  ordering: <Package className="w-4 h-4" />,
  scheduling: <Calendar className="w-4 h-4" />,
  email_replies: <Mail className="w-4 h-4" />,
  flagging: <Flag className="w-4 h-4" />,
}

const categoryColorMap: Record<ApprovalCategory, string> = {
  ordering: "bg-blue-100 text-blue-700",
  scheduling: "bg-purple-100 text-purple-700",
  email_replies: "bg-orange-100 text-orange-700",
  flagging: "bg-red-100 text-red-700",
}

const categoryLabelMap: Record<ApprovalCategory, string> = {
  ordering: "Orders",
  scheduling: "Scheduling",
  email_replies: "Email",
  flagging: "Urgent",
}

type CategoryFilter = "All" | ApprovalCategory
const CATEGORY_OPTIONS: CategoryFilter[] = ["All", "ordering", "scheduling", "email_replies", "flagging"]

type DatePreset = "7d" | "30d" | "all"
const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
]

function passesDatePreset(timestamp: string, preset: DatePreset): boolean {
  if (preset === "all") return true
  const t = Date.parse(timestamp)
  if (!Number.isFinite(t)) return true
  const windowMs = preset === "7d" ? 7 * 86_400_000 : 30 * 86_400_000
  return Date.now() - t <= windowMs
}

export function ActivityScreen() {
  const { customer } = useAppStore()
  const apiBase =
    process.env.NEXT_PUBLIC_GATEWAY_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "https://api.kayzo.app"
  const slug = customer?.slug ?? ""

  const [items, setItems] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All")
  const [datePreset, setDatePreset] = useState<DatePreset>("30d")

  useEffect(() => {
    if (!slug) return
    fetch(`${apiBase}/api/${slug}/history`)
      .then((r) => r.json())
      .then((data: ActivityItem[]) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false))
  }, [slug, apiBase])

  const filtered = items.filter((item) => {
    const catOk = categoryFilter === "All" ? true : item.category === categoryFilter
    const dateOk = passesDatePreset(item.timestamp, datePreset)
    return catOk && dateOk
  })

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-3 border-b border-border bg-background">
        <h2 className="text-xl font-bold text-foreground mb-4">Activity</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full appearance-none bg-muted text-foreground text-sm font-medium rounded-lg px-3 py-2 pr-8 outline-none cursor-pointer border border-border"
              aria-label="Filter by date range"
            >
              {DATE_PRESET_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative flex-1 min-w-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="w-full appearance-none bg-muted text-foreground text-sm font-medium rounded-lg px-3 py-2 pr-8 outline-none cursor-pointer border border-border"
              aria-label="Filter by category"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "All" ? "All categories" : categoryLabelMap[opt as ApprovalCategory]}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No activity yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Actions Kayzo takes on your behalf will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((item) => {
              const isExpanded = expandedId === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
                  aria-expanded={isExpanded}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", categoryColorMap[item.category])}>
                    {categoryIconMap[item.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.timestamp}</p>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2">{item.detail}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
