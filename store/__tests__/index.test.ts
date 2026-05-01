import { beforeEach, describe, expect, it } from "vitest"
import { useAppStore } from "../index"
import type { ApprovalItem, ChatMessage } from "@/lib/types"

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "hello",
    timestamp: new Date(),
    type: "text",
    ...overrides,
  }
}

function makeApproval(overrides: Partial<ApprovalItem> = {}): ApprovalItem {
  return {
    id: crypto.randomUUID(),
    title: "Order materials",
    details: "20 bags of concrete",
    category: "ordering",
    status: "pending",
    createdAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => {
  useAppStore.getState().reset()
})

describe("messages", () => {
  it("addMessage appends to the list", () => {
    const msg = makeMessage()
    useAppStore.getState().addMessage(msg)
    expect(useAppStore.getState().messages).toHaveLength(1)
    expect(useAppStore.getState().messages[0]).toEqual(msg)
  })

  it("addMessage preserves existing messages", () => {
    const a = makeMessage({ content: "first" })
    const b = makeMessage({ content: "second" })
    useAppStore.getState().addMessage(a)
    useAppStore.getState().addMessage(b)
    expect(useAppStore.getState().messages).toHaveLength(2)
  })

  it("updateMessage merges partial fields", () => {
    const msg = makeMessage({ content: "original" })
    useAppStore.getState().addMessage(msg)
    useAppStore.getState().updateMessage(msg.id, { content: "updated" })
    expect(useAppStore.getState().messages[0].content).toBe("updated")
    expect(useAppStore.getState().messages[0].role).toBe("assistant")
  })

  it("updateMessage ignores unknown ids", () => {
    const msg = makeMessage()
    useAppStore.getState().addMessage(msg)
    useAppStore.getState().updateMessage("nonexistent", { content: "nope" })
    expect(useAppStore.getState().messages[0].content).toBe(msg.content)
  })

  it("removeThinkingMessages removes only thinking-type messages", () => {
    const text = makeMessage({ type: "text" })
    const thinking = makeMessage({ type: "thinking" })
    const approval = makeMessage({ type: "approval" })
    useAppStore.getState().addMessage(text)
    useAppStore.getState().addMessage(thinking)
    useAppStore.getState().addMessage(approval)

    useAppStore.getState().removeThinkingMessages()

    const remaining = useAppStore.getState().messages
    expect(remaining).toHaveLength(2)
    expect(remaining.some((m) => m.type === "thinking")).toBe(false)
    expect(remaining.some((m) => m.id === text.id)).toBe(true)
    expect(remaining.some((m) => m.id === approval.id)).toBe(true)
  })

  it("setMessages replaces all messages", () => {
    useAppStore.getState().addMessage(makeMessage())
    useAppStore.getState().addMessage(makeMessage())
    const replacement = [makeMessage({ content: "only one" })]
    useAppStore.getState().setMessages(replacement)
    expect(useAppStore.getState().messages).toHaveLength(1)
    expect(useAppStore.getState().messages[0].content).toBe("only one")
  })
})

describe("approvals", () => {
  it("addApproval appends to the list", () => {
    const approval = makeApproval()
    useAppStore.getState().addApproval(approval)
    expect(useAppStore.getState().approvals).toHaveLength(1)
    expect(useAppStore.getState().approvals[0]).toEqual(approval)
  })

  it("updateApproval merges partial fields", () => {
    const approval = makeApproval({ status: "pending" })
    useAppStore.getState().addApproval(approval)
    useAppStore.getState().updateApproval(approval.id, { status: "approved" })
    expect(useAppStore.getState().approvals[0].status).toBe("approved")
    expect(useAppStore.getState().approvals[0].title).toBe(approval.title)
  })

  it("updateApproval ignores unknown ids", () => {
    const approval = makeApproval()
    useAppStore.getState().addApproval(approval)
    useAppStore.getState().updateApproval("nonexistent", { status: "declined" })
    expect(useAppStore.getState().approvals[0].status).toBe("pending")
  })
})

describe("reset", () => {
  it("clears messages and approvals", () => {
    useAppStore.getState().addMessage(makeMessage())
    useAppStore.getState().addApproval(makeApproval())
    useAppStore.getState().reset()
    expect(useAppStore.getState().messages).toHaveLength(0)
    expect(useAppStore.getState().approvals).toHaveLength(0)
  })

  it("resets connectionStatus to connecting", () => {
    useAppStore.getState().setConnectionStatus("connected")
    useAppStore.getState().reset()
    expect(useAppStore.getState().connectionStatus).toBe("connecting")
  })

  it("clears customer", () => {
    useAppStore.getState().setCustomer({
      id: "1",
      email: "test@example.com",
      name: "Test",
      slug: "test",
      subscriptionStatus: "active",
      subscriptionTier: "pro",
      freeAccount: false,
      gatewayType: "cloud",
      gatewayUrl: null,
    })
    useAppStore.getState().reset()
    expect(useAppStore.getState().customer).toBeNull()
  })
})

describe("connectionStatus", () => {
  it("setConnectionStatus updates status", () => {
    useAppStore.getState().setConnectionStatus("connected")
    expect(useAppStore.getState().connectionStatus).toBe("connected")
  })
})
