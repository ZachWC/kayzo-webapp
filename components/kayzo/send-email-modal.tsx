"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export type SendEmailModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerSlug: string
  defaultTo?: string
  defaultSubject: string
  defaultBody: string
  /** Called when user confirms send — return base64 PDF and filename */
  buildAttachment: () => Promise<{ filename: string; base64: string }>
  onSent?: (to: string) => void
}

export function SendEmailModal({
  open,
  onOpenChange,
  customerSlug,
  defaultTo = "",
  defaultSubject,
  defaultBody,
  buildAttachment,
  onSent,
}: SendEmailModalProps) {
  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState("")
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open) {
      setTo(defaultTo)
      setCc("")
      setSubject(defaultSubject)
      setBody(defaultBody)
      setError(null)
      setSending(false)
    }
  }, [open, defaultTo, defaultSubject, defaultBody])

  if (!open) return null

  const apiBase =
    process.env.NEXT_PUBLIC_GATEWAY_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "https://api.kayzo.app"

  const handleSend = async () => {
    setError(null)
    if (!to.trim()) {
      setError("Recipient email is required.")
      return
    }
    setSending(true)
    try {
      const { filename, base64 } = await buildAttachment()
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setError("Not signed in.")
        setSending(false)
        return
      }
      const res = await fetch(`${apiBase}/api/email/${encodeURIComponent(customerSlug)}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim() || undefined,
          subject: subject.trim() || "Document from Kayzo",
          textBody: body,
          attachmentBase64: base64,
          attachmentFilename: filename,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : `Send failed (${res.status})`)
        setSending(false)
        return
      }
      onSent?.(to.trim())
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div
        className={cn(
          "bg-card border border-border rounded-xl shadow-lg w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-email-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="send-email-title" className="text-sm font-semibold text-foreground">
            Send to customer
          </h2>
          <button
            type="button"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" placeholder="customer@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cc (optional)</label>
            <Input value={cc} onChange={(e) => setCc(e.target.value)} className="mt-1" placeholder="" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-muted/30">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => void handleSend()} disabled={sending}>
            {sending ? "Sending…" : "Send email"}
          </Button>
        </div>
      </div>
    </div>
  )
}
