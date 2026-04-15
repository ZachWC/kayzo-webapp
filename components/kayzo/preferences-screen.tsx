"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Lock, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store"
import type { Preferences } from "@/lib/types"

type ThreeOpt = "always-ask" | "auto-under" | "always-act"
type TwoOpt = "always-ask" | "always-act"

// Map UI values to/from API values
function toApiMode(v: ThreeOpt | TwoOpt): "always_ask" | "threshold" | "always_act" {
  if (v === "auto-under") return "threshold"
  if (v === "always-ask") return "always_ask"
  return "always_act"
}
function fromApiMode(v: string): ThreeOpt | TwoOpt {
  if (v === "threshold") return "auto-under"
  if (v === "always_act") return "always-act"
  return "always-ask"
}

function SegmentedThree({
  value,
  onChange,
}: {
  value: ThreeOpt
  onChange: (v: ThreeOpt) => void
}) {
  const options: { value: ThreeOpt; label: string }[] = [
    { value: "always-ask", label: "Always ask" },
    { value: "auto-under", label: "Auto under $" },
    { value: "always-act", label: "Always act" },
  ]
  return (
    <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 py-2 px-2 text-xs font-medium rounded-md transition-all",
            value === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SegmentedTwo({
  value,
  onChange,
}: {
  value: TwoOpt
  onChange: (v: TwoOpt) => void
}) {
  const options: { value: TwoOpt; label: string }[] = [
    { value: "always-ask", label: "Always ask" },
    { value: "always-act", label: "Always act" },
  ]
  return (
    <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all",
            value === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SavedToast({ visible }: { visible: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-primary font-medium transition-all duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <Check className="w-3 h-3" />
      Saved
    </span>
  )
}

function PrefCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {children}
    </div>
  )
}

function PrefHeader({
  title,
  description,
  saved,
}: {
  title: string
  description: string
  saved: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <SavedToast visible={saved} />
    </div>
  )
}

export function PreferencesScreen() {
  const { customer, preferences, setPreferences } = useAppStore()
  const slug = customer?.slug ?? ""
  const apiBase = process.env.NEXT_PUBLIC_GATEWAY_API_URL ?? "https://api.kayzo.ai"

  const [materialOrders, setMaterialOrders] = useState<ThreeOpt>("always-ask")
  const [materialThreshold, setMaterialThreshold] = useState("500")
  const [scheduling, setScheduling] = useState<TwoOpt>("always-ask")
  const [emailReplies, setEmailReplies] = useState<TwoOpt>("always-ask")
  const [defaultMarkup, setDefaultMarkup] = useState("20")
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const patchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load preferences on mount
  useEffect(() => {
    if (!slug) return
    fetch(`${apiBase}/api/preferences/${slug}`)
      .then((r) => r.json())
      .then((data: Preferences) => {
        setPreferences(data)
        setMaterialOrders(fromApiMode(data.ordering.mode) as ThreeOpt)
        setMaterialThreshold(String(data.ordering.threshold ?? 500))
        setScheduling(fromApiMode(data.scheduling.mode) as TwoOpt)
        setEmailReplies(fromApiMode(data.emailReplies.mode) as TwoOpt)
        setDefaultMarkup(String(data.bidMarkup))
      })
      .catch(() => {
        // Use store values if API unavailable
        if (preferences) {
          setMaterialOrders(fromApiMode(preferences.ordering.mode) as ThreeOpt)
          setMaterialThreshold(String(preferences.ordering.threshold ?? 500))
          setScheduling(fromApiMode(preferences.scheduling.mode) as TwoOpt)
          setEmailReplies(fromApiMode(preferences.emailReplies.mode) as TwoOpt)
          setDefaultMarkup(String(preferences.bidMarkup))
        }
      })
      .finally(() => setIsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const patch = useCallback((update: Partial<Preferences>) => {
    if (!slug) return
    if (patchTimeout.current) clearTimeout(patchTimeout.current)
    patchTimeout.current = setTimeout(() => {
      fetch(`${apiBase}/api/preferences/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      }).catch(() => {})
    }, 400)
  }, [slug, apiBase])

  const triggerSave = useCallback((key: string) => {
    setSaved((prev) => ({ ...prev, [key]: true }))
    setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading preferences…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-foreground pt-1">Preferences</h2>

        {/* Material orders */}
        <PrefCard>
          <PrefHeader
            title="Material orders"
            description="How should Kayzo handle ordering materials on your behalf?"
            saved={!!saved["material"]}
          />
          <SegmentedThree
            value={materialOrders}
            onChange={(v) => {
              setMaterialOrders(v)
              triggerSave("material")
              patch({ ordering: { mode: toApiMode(v), threshold: v === "auto-under" ? Number(materialThreshold) : null } })
            }}
          />
          {materialOrders === "auto-under" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Auto-approve orders under</span>
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={materialThreshold}
                  onChange={(e) => {
                    setMaterialThreshold(e.target.value)
                    triggerSave("material")
                    patch({ ordering: { mode: "threshold", threshold: Number(e.target.value) } })
                  }}
                  className="pl-7 h-9 text-sm"
                />
              </div>
            </div>
          )}
        </PrefCard>

        {/* Scheduling */}
        <PrefCard>
          <PrefHeader
            title="Scheduling"
            description="Let Kayzo update your crew schedule automatically or ask first?"
            saved={!!saved["scheduling"]}
          />
          <SegmentedTwo
            value={scheduling}
            onChange={(v) => {
              setScheduling(v)
              triggerSave("scheduling")
              patch({ scheduling: { mode: toApiMode(v) as "always_ask" | "always_act" } })
            }}
          />
        </PrefCard>

        {/* Email replies */}
        <PrefCard>
          <PrefHeader
            title="Email replies"
            description="Should Kayzo draft and send replies, or show you drafts first?"
            saved={!!saved["email"]}
          />
          <SegmentedTwo
            value={emailReplies}
            onChange={(v) => {
              setEmailReplies(v)
              triggerSave("email")
              patch({ emailReplies: { mode: toApiMode(v) as "always_ask" | "always_act" } })
            }}
          />
        </PrefCard>

        {/* Urgent alerts — locked */}
        <PrefCard>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Urgent alerts</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Critical flags like unusual charges or safety issues will always surface immediately.
              </p>
            </div>
            <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Always on — cannot be changed
            </span>
          </div>
        </PrefCard>

        {/* Default markup */}
        <PrefCard>
          <PrefHeader
            title="Default markup"
            description="Default markup percentage applied to new bids and estimates."
            saved={!!saved["markup"]}
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={defaultMarkup}
              onChange={(e) => {
                setDefaultMarkup(e.target.value)
                triggerSave("markup")
                patch({ bidMarkup: Number(e.target.value) })
              }}
              className="w-24 h-10 text-sm text-right"
              min={0}
              max={100}
            />
            <span className="text-sm text-muted-foreground font-medium">%</span>
          </div>
        </PrefCard>
      </div>
    </div>
  )
}
