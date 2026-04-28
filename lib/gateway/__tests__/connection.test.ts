import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GatewayConnection } from "../connection"

// Minimal WebSocket mock that captures the URL and exposes simulation helpers
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

beforeEach(() => {
  MockWebSocket.instances = []
  vi.stubGlobal("WebSocket", MockWebSocket)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function noop() {}

describe("URL construction", () => {
  it("cloud customer connects to wss://api.kayzo.app/ws/{slug}", () => {
    // Ensure env var default is used
    delete process.env.NEXT_PUBLIC_GATEWAY_WS_URL
    delete process.env.NEXT_PUBLIC_GATEWAY_URL

    const conn = new GatewayConnection("bobsmith", "jwt", "cloud", null, noop, noop)
    conn.connect()

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe("wss://api.kayzo.app/ws/bobsmith?token=jwt")
  })

  it("cloud customer uses NEXT_PUBLIC_GATEWAY_URL when set", () => {
    process.env.NEXT_PUBLIC_GATEWAY_URL = "wss://staging.kayzo.app"

    const conn = new GatewayConnection("alice", "jwt", "cloud", null, noop, noop)
    conn.connect()

    expect(MockWebSocket.instances[0].url).toBe("wss://staging.kayzo.app/ws/alice?token=jwt")
    delete process.env.NEXT_PUBLIC_GATEWAY_URL
  })

  it("local customer converts https gateway URL to wss", () => {
    const conn = new GatewayConnection(
      "bob",
      "jwt",
      "local",
      "https://my-gateway.local:3001",
      noop,
      noop,
    )
    conn.connect()

    expect(MockWebSocket.instances[0].url).toBe("wss://my-gateway.local:3001/ws?token=jwt")
  })

  it("local customer converts http gateway URL to ws", () => {
    const conn = new GatewayConnection(
      "bob",
      "jwt",
      "local",
      "http://192.168.1.10:3001",
      noop,
      noop,
    )
    conn.connect()

    expect(MockWebSocket.instances[0].url).toBe("ws://192.168.1.10:3001/ws?token=jwt")
  })
})

describe("setup_pending", () => {
  it("emits setup_pending and skips WebSocket when local type has no gateway URL", () => {
    const onStatusChange = vi.fn()
    const conn = new GatewayConnection("bob", "jwt", "local", null, noop, onStatusChange)
    conn.connect()

    expect(onStatusChange).toHaveBeenCalledWith("setup_pending")
    expect(MockWebSocket.instances).toHaveLength(0)
  })
})

describe("handshake + connected status", () => {
  it("emits connected after successful handshake response", () => {
    const onStatusChange = vi.fn()
    const conn = new GatewayConnection("bob", "jwt", "cloud", null, noop, onStatusChange)
    conn.connect()

    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()

    // The connect frame was sent — extract the id from it
    expect(ws.send).toHaveBeenCalledOnce()
    const frame = JSON.parse(ws.send.mock.calls[0][0] as string) as {
      type: string
      id: string
      method: string
    }
    expect(frame.type).toBe("req")
    expect(frame.method).toBe("connect")

    // Server acknowledges the handshake
    ws.triggerMessage({ type: "res", id: frame.id, ok: true })

    expect(onStatusChange).toHaveBeenCalledWith("connecting")
    expect(onStatusChange).toHaveBeenCalledWith("connected")
  })

  it("closes the socket when handshake is rejected", () => {
    const onStatusChange = vi.fn()
    const conn = new GatewayConnection("bob", "jwt", "cloud", null, noop, onStatusChange)
    conn.connect()

    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()
    const frame = JSON.parse(ws.send.mock.calls[0][0] as string) as { id: string }

    ws.triggerMessage({ type: "res", id: frame.id, ok: false })

    expect(ws.close).toHaveBeenCalled()
    expect(onStatusChange).not.toHaveBeenCalledWith("connected")
  })
})

describe("reconnect", () => {
  it("schedules a reconnect with exponential backoff when the socket closes", () => {
    const onStatusChange = vi.fn()
    const conn = new GatewayConnection("bob", "jwt", "cloud", null, noop, onStatusChange)
    conn.connect()

    const ws = MockWebSocket.instances[0]
    ws.triggerClose()

    expect(onStatusChange).toHaveBeenCalledWith("reconnecting")

    // First retry fires after 1 000 ms (BASE_BACKOFF_MS * 2^0)
    vi.advanceTimersByTime(1000)
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it("does not reconnect after disconnect() is called", () => {
    const conn = new GatewayConnection("bob", "jwt", "cloud", null, noop, noop)
    conn.connect()
    conn.disconnect()

    MockWebSocket.instances[0].triggerClose()
    vi.advanceTimersByTime(5000)

    // Still only the original socket — no new one created
    expect(MockWebSocket.instances).toHaveLength(1)
  })
})

describe("send", () => {
  it("sends a JSON frame with the given method and params", () => {
    const conn = new GatewayConnection("bob", "jwt", "cloud", null, noop, noop)
    conn.connect()
    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()
    // Consume the connect handshake send
    ws.send.mockClear()

    const id = conn.send("agent.message", { text: "hello" })

    expect(ws.send).toHaveBeenCalledOnce()
    const frame = JSON.parse(ws.send.mock.calls[0][0] as string) as {
      type: string
      id: string
      method: string
      params: { text: string }
    }
    expect(frame.type).toBe("req")
    expect(frame.id).toBe(id)
    expect(frame.method).toBe("agent.message")
    expect(frame.params.text).toBe("hello")
  })
})
