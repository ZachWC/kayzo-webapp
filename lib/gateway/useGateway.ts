"use client"

import { useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAppStore } from "@/store"
import { GatewayConnection, type GatewayEvent } from "./connection"
import type { ChatMessage, ApprovalItem, ApprovalCategory, PricingChatPayload } from "@/lib/types"
import { stripKayzoStructuredFences } from "@/lib/kayzo/structured-chat"

const PRICING_TOOLS = new Set(["lookup_lowes_price", "lookup_homedepot_price"])

function storeFromToolName(name: string): "lowes" | "homedepot" | null {
  if (name === "lookup_lowes_price") return "lowes"
  if (name === "lookup_homedepot_price") return "homedepot"
  return null
}

export function useGateway() {
  const { customer, setConnectionStatus, addMessage, updateMessage, addApproval, removeThinkingMessages } =
    useAppStore()
  const connectionRef = useRef<GatewayConnection | null>(null)
  const streamingIdRef = useRef<string | null>(null)
  /** Dedupe pricing cards per tool call */
  const seenPricingKeysRef = useRef<Set<string>>(new Set())

  const handleEvent = useCallback(
    (event: GatewayEvent) => {
      if (event.type !== "event" || event.event !== "agent") return

      const payload = event.payload as Record<string, unknown>
      const stream = payload?.stream as string
      const data = (payload?.data as Record<string, unknown> | undefined) ?? {}

      if (stream === "lifecycle") {
        const phase = data?.phase as string
        if (phase === "start") {
          seenPricingKeysRef.current.clear()
          removeThinkingMessages()
        } else if (phase === "end") {
          const streamId = streamingIdRef.current
          if (streamId) {
            const msg = useAppStore.getState().messages.find((m) => m.id === streamId)
            if (msg?.role === "assistant" && msg.type === "text") {
              const { cleaned, bidJsonStrings, invoiceJsonStrings } = stripKayzoStructuredFences(msg.content)
              if (bidJsonStrings.length > 0 || invoiceJsonStrings.length > 0) {
                const nextContent = cleaned.length > 0 ? cleaned : "—"
                updateMessage(streamId, { content: nextContent })
                for (const json of bidJsonStrings) {
                  try {
                    JSON.parse(json)
                    addMessage({
                      id: crypto.randomUUID(),
                      role: "assistant",
                      content: json,
                      timestamp: new Date(),
                      type: "bid",
                    })
                  } catch {
                    /* ignore malformed */
                  }
                }
                for (const json of invoiceJsonStrings) {
                  try {
                    JSON.parse(json)
                    addMessage({
                      id: crypto.randomUUID(),
                      role: "assistant",
                      content: json,
                      timestamp: new Date(),
                      type: "invoice",
                    })
                  } catch {
                    /* ignore malformed */
                  }
                }
              }
            }
          }
          streamingIdRef.current = null
        }
      }

      if (stream === "assistant") {
        const delta =
          (typeof data.delta === "string" ? data.delta : null) ??
          (typeof data.text === "string" ? data.text : null) ??
          ""
        if (!delta) return

        if (streamingIdRef.current) {
          updateMessage(streamingIdRef.current, {
            content:
              (useAppStore.getState().messages.find((m) => m.id === streamingIdRef.current)?.content ?? "") +
              delta,
          })
        } else {
          const id = crypto.randomUUID()
          streamingIdRef.current = id
          const msg: ChatMessage = {
            id,
            role: "assistant",
            content: delta,
            timestamp: new Date(),
            type: "text",
          }
          addMessage(msg)
        }
      }

      if (stream === "tool") {
        const name = (typeof data.name === "string" ? data.name : (payload.name as string | undefined)) ?? ""
        const phase = typeof data.phase === "string" ? data.phase : ""
        const toolCallId = typeof data.toolCallId === "string" ? data.toolCallId : ""
        const runId = typeof payload.runId === "string" ? payload.runId : ""
        const result = (data.result ?? payload.result) as Record<string, unknown> | undefined

        if (name === "approval_queue" && result) {
          const approval: ApprovalItem = {
            id: (result.id as string) ?? crypto.randomUUID(),
            title: (result.title as string) ?? "Approval required",
            details: (result.details as string) ?? "",
            category: (result.preferences_category as ApprovalCategory) ?? "ordering",
            amount: result.amount as number | undefined,
            status: "pending",
            createdAt: new Date(),
            originalContext: result.context as string | undefined,
          }
          addApproval(approval)
          addMessage({
            id: `approval-${approval.id}`,
            role: "assistant",
            content: approval.id,
            timestamp: new Date(),
            type: "approval",
          })
          return
        }

        if (PRICING_TOOLS.has(name) && phase === "result" && result && data.isError !== true) {
          const dedupeKey = `${runId}:${toolCallId}:${name}`
          if (seenPricingKeysRef.current.has(dedupeKey)) return
          seenPricingKeysRef.current.add(dedupeKey)

          const store = storeFromToolName(name)
          if (!store) return

          const details = result.details as { results?: unknown; error?: string } | undefined
          const rawItems = Array.isArray(details?.results) ? details!.results : []
          const items = rawItems
            .map((row) => {
              const r = row as Record<string, unknown>
              const itemName = typeof r.name === "string" ? r.name : "Unknown"
              const price = typeof r.price === "number" ? r.price : Number(r.price)
              const unit = typeof r.unit === "string" ? r.unit : "each"
              const sku = typeof r.sku === "string" ? r.sku : ""
              const inStock = typeof r.inStock === "boolean" ? r.inStock : true
              if (!Number.isFinite(price)) return null
              return { name: itemName, price, unit, sku, inStock }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)

          const contentArr = (result as { content?: unknown }).content
          let summaryText = ""
          if (Array.isArray(contentArr)) {
            for (const block of contentArr) {
              const b = block as { type?: string; text?: string }
              if (b?.type === "text" && typeof b.text === "string") {
                summaryText = b.text
                break
              }
            }
          }
          const quoted = summaryText.match(/pricing for "([^"]+)"/)
          const queryFromText = quoted?.[1]?.trim() ?? ""
          const input = (result as { input?: Record<string, unknown> }).input
          const params = (data.args ?? data.arguments ?? input) as Record<string, unknown> | undefined
          const query =
            (typeof params?.query === "string" ? params.query : "") ||
            queryFromText ||
            ""

          const card: PricingChatPayload = { store, query: query || "pricing lookup", items }
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: JSON.stringify(card),
            timestamp: new Date(),
            type: "pricing",
          })
        }
      }
    },
    [addMessage, updateMessage, addApproval, removeThinkingMessages]
  )

  useEffect(() => {
    if (!customer?.slug) return

    const supabase = createClient()

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const conn = new GatewayConnection(
        customer.slug,
        session.access_token,
        customer.gatewayType,
        customer.gatewayUrl,
        handleEvent,
        setConnectionStatus
      )
      connectionRef.current = conn
      conn.connect()

      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (newSession?.access_token) {
          connectionRef.current?.updateJwt(newSession.access_token)
        }
      })
    }

    void init()

    return () => {
      connectionRef.current?.disconnect()
      connectionRef.current = null
    }
  }, [customer?.slug, customer?.gatewayType, customer?.gatewayUrl, handleEvent, setConnectionStatus])

  const send = useCallback((method: string, params: Record<string, unknown> = {}) => {
    return connectionRef.current?.send(method, params) ?? ""
  }, [])

  return { send }
}
