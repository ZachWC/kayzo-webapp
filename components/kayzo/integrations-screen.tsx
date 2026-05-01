"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Check, Mail, Package, ShoppingCart, AlertCircle, ExternalLink, Loader2, Unlink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store"

// ── Types ─────────────────────────────────────────────────────────────────────

interface GmailStatus {
  connected: boolean
  email: string | null
  oauthAvailable: boolean
}

interface LoweStatus {
  configured: boolean
  accountNumber: string | null
  hasApiKey: boolean
}

interface IntegrationsData {
  gmail: GmailStatus
  lowes: LoweStatus
  homedepot: LoweStatus
  updatedAt: string | null
}

// ── Small shared components ───────────────────────────────────────────────────

function StatusBadge({ connected, label }: { connected: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
        connected
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-muted text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          connected ? "bg-emerald-400" : "bg-muted-foreground/50"
        )}
      />
      {label}
    </span>
  )
}

function IntegCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {children}
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

// ── Gmail card ────────────────────────────────────────────────────────────────

function GmailCard({
  status,
  slug,
  apiBase,
  token,
  onRefresh,
}: {
  status: GmailStatus
  slug: string
  apiBase: string
  token: string | null
  onRefresh: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/integrations/${slug}/gmail/connect`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to start OAuth")
      // Open Google OAuth in a new tab
      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [apiBase, slug, token])

  const handleDisconnect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/integrations/${slug}/gmail`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to disconnect")
      }
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [apiBase, slug, token, onRefresh])

  return (
    <IntegCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[oklch(0.22_0.04_255)] flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-[oklch(0.75_0.03_255)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Gmail</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send emails and reply to clients on your behalf
            </p>
          </div>
        </div>
        <StatusBadge
          connected={status.connected}
          label={status.connected ? "Connected" : "Not connected"}
        />
      </div>

      {status.connected && status.email && (
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-foreground font-medium">{status.email}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {status.connected ? (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            Connect Gmail
          </button>
        )}
      </div>

      {status.connected && (
        <p className="text-xs text-muted-foreground">
          Kayzo can now draft emails and request approval before sending.
        </p>
      )}
    </IntegCard>
  )
}

// ── Credential card (Lowe's / Home Depot) ────────────────────────────────────

function CredentialCard({
  icon: Icon,
  name,
  description,
  accountNumber,
  hasApiKey,
  configured,
  apiKeyPlaceholder,
  accountPlaceholder,
  onSave,
}: {
  icon: React.ComponentType<{ className?: string }>
  name: string
  description: string
  accountNumber: string | null
  hasApiKey: boolean
  configured: boolean
  apiKeyPlaceholder: string
  accountPlaceholder: string
  onSave: (apiKey: string, accountNumber: string) => Promise<void>
}) {
  const [apiKey, setApiKey] = useState("")
  const [account, setAccount] = useState(accountNumber ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(apiKey, account)
      setApiKey("") // clear key field after save (don't show it again)
      setSaved(true)
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }, [apiKey, account, onSave])

  const isDirty = apiKey.length > 0 || account !== (accountNumber ?? "")

  return (
    <IntegCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[oklch(0.22_0.04_255)] flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-[oklch(0.75_0.03_255)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <StatusBadge
          connected={configured}
          label={configured ? "Configured" : "Not configured"}
        />
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1 block">
            Account Number
          </label>
          <Input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder={accountPlaceholder}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1 block">
            API Key {hasApiKey && <span className="text-emerald-400">(saved)</span>}
          </label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasApiKey ? "Enter new key to replace…" : apiKeyPlaceholder}
            className="h-9 text-sm font-mono"
            autoComplete="off"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save
        </button>
        <SavedToast visible={saved} />
      </div>
    </IntegCard>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function IntegrationsScreen() {
  const { customer } = useAppStore()
  const slug = customer?.slug ?? ""
  const apiBase =
    process.env.NEXT_PUBLIC_GATEWAY_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "https://api.kayzo.app"

  const [data, setData] = useState<IntegrationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [authToken, setAuthToken] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()

  // Grab the Supabase session token for API calls
  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getSession().then(({ data: s }) => {
        setAuthToken(s.session?.access_token ?? null)
      })
    })
  }, [])

  const fetchIntegrations = useCallback(async () => {
    if (!slug || !authToken) return
    try {
      const res = await fetch(`${apiBase}/api/integrations/${slug}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // Use defaults on failure
      setData({
        gmail: { connected: false, email: null, oauthAvailable: false },
        lowes: { configured: false, accountNumber: null, hasApiKey: false },
        homedepot: { configured: false, accountNumber: null, hasApiKey: false },
        updatedAt: null,
      })
    } finally {
      setLoading(false)
    }
  }, [slug, authToken, apiBase])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchIntegrations()
    })
  }, [fetchIntegrations])

  // Handle OAuth callback redirects (e.g. ?gmail=connected)
  useEffect(() => {
    const gmailParam = searchParams.get("gmail")
    if (gmailParam === "connected") {
      queueMicrotask(() => {
        void fetchIntegrations()
      })
      // Clean the URL
      router.replace("/integrations")
    }
  }, [searchParams, fetchIntegrations, router])

  const saveLowes = useCallback(
    async (apiKey: string, accountNumber: string) => {
      const body: Record<string, string> = {}
      if (apiKey) body.lowes_api_key = apiKey
      body.lowes_account_number = accountNumber
      const res = await fetch(`${apiBase}/api/integrations/${slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to save")
      }
      await fetchIntegrations()
    },
    [apiBase, slug, authToken, fetchIntegrations],
  )

  const saveHomeDepot = useCallback(
    async (apiKey: string, accountNumber: string) => {
      const body: Record<string, string> = {}
      if (apiKey) body.homedepot_api_key = apiKey
      body.homedepot_account_number = accountNumber
      const res = await fetch(`${apiBase}/api/integrations/${slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to save")
      }
      await fetchIntegrations()
    },
    [apiBase, slug, authToken, fetchIntegrations],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading integrations…</p>
      </div>
    )
  }

  const defaults: IntegrationsData = {
    gmail: { connected: false, email: null, oauthAvailable: false },
    lowes: { configured: false, accountNumber: null, hasApiKey: false },
    homedepot: { configured: false, accountNumber: null, hasApiKey: false },
    updatedAt: null,
  }
  const d = data ?? defaults

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="pt-1">
          <h2 className="text-xl font-bold text-foreground">Integrations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your accounts so Kayzo can send emails and look up supply prices.
          </p>
        </div>

        <GmailCard
          status={d.gmail}
          slug={slug}
          apiBase={apiBase}
          token={authToken}
          onRefresh={fetchIntegrations}
        />

        <CredentialCard
          key={`lowes-${d.lowes.accountNumber ?? ""}-${d.lowes.configured}-${d.updatedAt ?? ""}`}
          icon={Package}
          name="Lowe's Pro"
          description="Check lumber, hardware, and supply prices from your Lowe's Pro account"
          accountNumber={d.lowes.accountNumber}
          hasApiKey={d.lowes.hasApiKey}
          configured={d.lowes.configured}
          apiKeyPlaceholder="Lowe's Pro API key"
          accountPlaceholder="Lowe's Pro account number"
          onSave={saveLowes}
        />

        <CredentialCard
          key={`homedepot-${d.homedepot.accountNumber ?? ""}-${d.homedepot.configured}-${d.updatedAt ?? ""}`}
          icon={ShoppingCart}
          name="Home Depot Pro"
          description="Check lumber, hardware, and supply prices from your Home Depot Pro Xtra account"
          accountNumber={d.homedepot.accountNumber}
          hasApiKey={d.homedepot.hasApiKey}
          configured={d.homedepot.configured}
          apiKeyPlaceholder="Home Depot Pro API key"
          accountPlaceholder="Pro Xtra account number"
          onSave={saveHomeDepot}
        />
      </div>
    </div>
  )
}
