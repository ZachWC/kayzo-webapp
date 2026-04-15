"use client"

import { useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAppStore } from "@/store"
import { GatewayConnection, type GatewayEvent } from "./connection"
import type { ChatMessage, ApprovalItem, ApprovalCategory } from "@/lib/types"

export function useGateway() {
  const { customer, setConnectionStatus, addMessage, updateMessage, addApproval } = useAppStore()
  const connectionRef = useRef<GatewayConnection | null>(null)
  const streamingIdRef = useRef<string | null>(null)

  const handleEvent = useCallback(
    (event: GatewayEvent) => {
      if (event.type !== "event" || event.event !== "agent") return

      const payload = event.payload as Record<string, unknown>
      const stream = payload?.stream as string

      if (stream === "assistant") {
        const delta = payload?.delta as string
        if (!delta) return

        if (streamingIdRef.current) {
          // Append delta to the in-progress streaming message
          updateMessage(streamingIdRef.current, {
            content: (useAppStore.getState().messages.find(m => m.id === streamingIdRef.current)?.content ?? "") + delta,
          })
        } else {
          // Start a new streaming message
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

      if (stream === "lifecycle") {
        const phase = payload?.phase as string
        if (phase === "end") {
          streamingIdRef.current = null
        }
      }

      if (stream === "tool") {
        const name = payload?.name as string
        const result = payload?.result as Record<string, unknown> | undefined

        // Detect approval queue items emitted by the gateway
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

          // Also add an approval message into the chat thread
          const msg: ChatMessage = {
            id: `approval-${approval.id}`,
            role: "assistant",
            content: approval.id,
            timestamp: new Date(),
            type: "approval",
          }
          addMessage(msg)
        }
      }
    },
    [addMessage, updateMessage, addApproval]
  )

  useEffect(() => {
    if (!customer?.slug) return

    const supabase = createClient()

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
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

      // Keep JWT fresh — refresh token on auth state change
      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (newSession?.access_token) {
          connectionRef.current?.updateJwt(newSession.access_token)
        }
      })
    }

    init()

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
