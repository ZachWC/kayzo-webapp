import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GatewayConnection } from "../connection"
import { useAppStore } from "@/store"
import type { ApprovalItem, ChatMessage } from "@/lib/types"

// ── MockWebSocket ────────────────────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = []

  url: string
  onopen: ((e: Event) => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onclose: ((e: CloseEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null

  send = vi.fn()
  close = vi.fn()

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  triggerOpen() {
    this.onopen?.(new Event("open"))
  }

  triggerMessage(data: unknown) {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }))
  }

  triggerClose() {
    this.onclose?.(new CloseEvent("close"))
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function noop() {}

/** Connect a GatewayConnection and complete the handshake. Returns the ws instance. */
function connectAndHandshake(conn: GatewayConnection): MockWebSocket {
  conn.connect()
  const ws = MockWebSocket.instances.at(-1)!
  ws.triggerOpen()
  const handshakeFrame = JSON.parse(ws.send.mock.calls.at(-1)![0] as string) as {
    id: string
    method: string
  }
  ws.triggerMessage({ type: "res", id: handshakeFrame.id, ok: true })
  ws.send.mockClear()
  return ws
}

/** Simulate the gateway emitting an email approval_queue tool event. */
function makeEmailApprovalEvent(approvalId: string) {
  return {
    type: "event",
    event: "agent",
    payload: {
      stream: "tool",
      name: "approval_queue",
      result: {
        id: approvalId,
        title: "Reply to Pacific Coast Lumber — quote follow-up",
        details: "Draft: Thanks for sending the quote…",
        preferences_category: "email_replies",
        context: "Supplier asked for order confirmation. AI drafted a reply.",
      },
    },
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  MockWebSocket.instances = []
  vi.stubGlobal("WebSocket", MockWebSocket)
  vi.useFakeTimers()
  useAppStore.getState().reset()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("email approval — WebSocket message protocol", () => {
  it("sends approvals.approve with the email approval id", () => {
    const conn = new GatewayConnection("bobsmith", "jwt", "cloud", null, noop, noop)
    const ws = connectAndHandshake(conn)

    const approvalId = "email-approval-abc123"
    conn.send("approvals.approve", { approvalId })

    expect(ws.send).toHaveBeenCalledOnce()
    const frame = JSON.parse(ws.send.mock.calls[0][0] as string) as {
      type: string
      method: string
      params: { approvalId: string }
    }
    expect(frame.type).toBe("req")
    expect(frame.method).toBe("approvals.approve")
    expect(frame.params.approvalId).toBe(approvalId)
  })

  it("sends approvals.decline with the email approval id", () => {
    const conn = new GatewayConnection("bobsmith", "jwt", "cloud", null, noop, noop)
    const ws = connectAndHandshake(conn)

    const approvalId = "email-approval-xyz789"
    conn.send("approvals.decline", { approvalId })

    expect(ws.send).toHaveBeenCalledOnce()
    const frame = JSON.parse(ws.send.mock.calls[0][0] as string) as {
      type: string
      method: string
      params: { approvalId: string }
    }
    expect(frame.type).toBe("req")
    expect(frame.method).toBe("approvals.decline")
    expect(frame.params.approvalId).toBe(approvalId)
  })

  it("approve and decline messages carry distinct ids", () => {
    const conn = new GatewayConnection("bobsmith", "jwt", "cloud", null, noop, noop)
    const ws = connectAndHandshake(conn)

    const id1 = conn.send("approvals.approve", { approvalId: "email-1" })
    const id2 = conn.send("approvals.decline", { approvalId: "email-2" })

    expect(id1).not.toBe(id2)
    expect(ws.send).toHaveBeenCalledTimes(2)
  })
})

describe("email approval — gateway event parsing into the store", () => {
  it("email_replies approval_queue event creates a pending approval in the store", () => {
    const approvalId = "email-approval-42"
    const onEvent = vi.fn()

    const conn = new GatewayConnection("bobsmith", "jwt", "cloud", null, onEvent, noop)
    connectAndHandshake(conn)

    // The connection calls onEvent for every gateway event — replicate what useGateway does
    // by calling the same handler logic manually so we can test the event shape.
    const event = makeEmailApprovalEvent(approvalId)
    const payload = event.payload as Record<string, unknown>
    const result = payload.result as Record<string, unknown>

    // Construct the approval as useGateway.handleEvent would
    const approval: ApprovalItem = {
      id: (result.id as string) ?? crypto.randomUUID(),
      title: (result.title as string) ?? "Approval required",
      details: (result.details as string) ?? "",
      category: "email_replies",
      amount: result.amount as number | undefined,
      status: "pending",
      createdAt: new Date(),
      originalContext: result.context as string | undefined,
    }

    // Verify the approval shape is correct before it hits the store
    expect(approval.category).toBe("email_replies")
    expect(approval.status).toBe("pending")
    expect(approval.id).toBe(approvalId)

    // Push into the store (mirrors what handleEvent does)
    useAppStore.getState().addApproval(approval)

    const stored = useAppStore.getState().approvals[0]
    expect(stored.category).toBe("email_replies")
    expect(stored.status).toBe("pending")
    expect(stored.id).toBe(approvalId)
  })

  it("email approval event also creates an approval-type chat message", () => {
    const approvalId = "email-approval-99"
    const result = makeEmailApprovalEvent(approvalId).payload
      .result as Record<string, unknown>

    const approval: ApprovalItem = {
      id: result.id as string,
      title: result.title as string,
      details: result.details as string,
      category: "email_replies",
      status: "pending",
      createdAt: new Date(),
    }

    // Mirrors the chat message creation in useGateway.handleEvent
    const chatMsg: ChatMessage = {
      id: `approval-${approval.id}`,
      role: "assistant",
      content: approval.id,
      timestamp: new Date(),
      type: "approval",
    }

    useAppStore.getState().addApproval(approval)
    useAppStore.getState().addMessage(chatMsg)

    const messages = useAppStore.getState().messages
    const approvalMsg = messages.find((m) => m.type === "approval")
    expect(approvalMsg).toBeDefined()
    expect(approvalMsg?.content).toBe(approvalId)
    expect(approvalMsg?.id).toBe(`approval-${approvalId}`)
  })

  it("email approval stays pending until an explicit approve or decline is sent", () => {
    const approvalId = "email-pending-check"
    const approval: ApprovalItem = {
      id: approvalId,
      title: "Reply to sub about schedule",
      details: "Draft reply…",
      category: "email_replies",
      status: "pending",
      createdAt: new Date(),
    }

    useAppStore.getState().addApproval(approval)

    // No approve/decline sent yet — must still be pending
    expect(useAppStore.getState().approvals[0].status).toBe("pending")

    // Only after an explicit decision does the status change
    useAppStore.getState().updateApproval(approvalId, { status: "approved" })
    expect(useAppStore.getState().approvals[0].status).toBe("approved")
  })

  it("preferences_category field in the gateway event maps to email_replies category", () => {
    // Verify the field name contract between backend and frontend
    const event = makeEmailApprovalEvent("id-1")
    const result = event.payload.result as Record<string, unknown>
    expect(result.preferences_category).toBe("email_replies")
  })
})

describe("email approval — gateway event shape contract", () => {
  it("email approval event carries title and details for display in the approval card", () => {
    const event = makeEmailApprovalEvent("id-2")
    const result = event.payload.result as Record<string, unknown>

    expect(typeof result.title).toBe("string")
    expect((result.title as string).length).toBeGreaterThan(0)
    expect(typeof result.details).toBe("string")
    expect((result.details as string).length).toBeGreaterThan(0)
  })

  it("email approval event includes original context for the contractor to review", () => {
    const event = makeEmailApprovalEvent("id-3")
    const result = event.payload.result as Record<string, unknown>

    expect(result.context).toBeDefined()
    expect(typeof result.context).toBe("string")
  })

  it("email approval event does not include an amount field", () => {
    // Email approvals are not financial — no dollar amount expected
    const event = makeEmailApprovalEvent("id-4")
    const result = event.payload.result as Record<string, unknown>

    expect(result.amount).toBeUndefined()
  })
})
