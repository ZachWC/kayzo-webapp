import type { ConnectionStatus } from "@/lib/types"

// Event shapes from the OpenClaw gateway WebSocket protocol
export interface GatewayEvent {
  type: "event" | "res"
  id?: string
  ok?: boolean
  payload?: unknown
  error?: string
  event?: string
}

export interface AgentDeltaEvent extends GatewayEvent {
  type: "event"
  event: "agent"
  payload: {
    stream: "assistant"
    delta: string
  }
}

export interface AgentLifecycleEvent extends GatewayEvent {
  type: "event"
  event: "agent"
  payload: {
    stream: "lifecycle"
    phase: "start" | "end"
    usage?: { inputTokens: number; outputTokens: number }
  }
}

export interface AgentToolEvent extends GatewayEvent {
  type: "event"
  event: "agent"
  payload: {
    stream: "tool"
    name: string
    input?: unknown
    result?: unknown
  }
}

export interface ResponseEvent extends GatewayEvent {
  type: "res"
  id: string
  ok: boolean
  payload?: unknown
  error?: string
}

const BASE_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 30000

export class GatewayConnection {
  private ws: WebSocket | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private destroyed = false
  private connectReqId: string | null = null

  constructor(
    private slug: string,
    private jwt: string,
    private gatewayType: "cloud" | "local",
    private gatewayUrl: string | null,
    private onMessage: (event: GatewayEvent) => void,
    private onStatusChange: (status: ConnectionStatus) => void
  ) {}

  connect() {
    if (this.destroyed) return

    if (this.gatewayType === "local" && !this.gatewayUrl) {
      this.onStatusChange("setup_pending")
      return
    }

    const wsUrl = this.buildWsUrl()
    this.onStatusChange("connecting")

    try {
      this.ws = new WebSocket(`${wsUrl}?token=${this.jwt}`)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      // Send the OpenClaw gateway connect handshake frame
      this.connectReqId = crypto.randomUUID()
      this.ws?.send(
        JSON.stringify({
          type: "req",
          id: this.connectReqId,
          method: "connect",
          params: {
            minProtocol: 1,
            maxProtocol: 3,
            client: {
              id: "webchat-ui",
              version: "1.0.0",
              platform: "web",
              mode: "webchat",
            },
          },
        }),
      )
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as GatewayEvent
        // The first response is the connect handshake reply
        if (this.connectReqId && data.type === "res" && data.id === this.connectReqId) {
          this.connectReqId = null
          if (data.ok) {
            this.onStatusChange("connected")
          } else {
            this.ws?.close()
          }
          return
        }
        this.onMessage(data)
      } catch {
        // Ignore malformed frames
      }
    }

    this.ws.onclose = () => {
      if (!this.destroyed) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      // onclose fires after onerror — reconnect happens there
    }
  }

  disconnect() {
    this.destroyed = true
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
    this.ws?.close()
    this.ws = null
  }

  send(method: string, params: Record<string, unknown>): string {
    const id = crypto.randomUUID()
    this.ws?.send(JSON.stringify({ type: "req", id, method, params }))
    return id
  }

  updateJwt(jwt: string) {
    this.jwt = jwt
  }

  private buildWsUrl(): string {
    if (this.gatewayType === "local" && this.gatewayUrl) {
      // Convert http(s) gateway URL to ws(s)
      return this.gatewayUrl.replace(/^https?/, (p) => (p === "https" ? "wss" : "ws")) + "/ws"
    }
    const base = process.env.NEXT_PUBLIC_GATEWAY_WS_URL ?? "wss://api.kayzo.ai"
    return `${base}/ws/${this.slug}`
  }

  private scheduleReconnect() {
    if (this.destroyed) return
    this.onStatusChange("reconnecting")
    const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, this.reconnectAttempts), MAX_BACKOFF_MS)
    this.reconnectAttempts++
    this.reconnectTimeout = setTimeout(() => {
      if (!this.destroyed) this.connect()
    }, delay)
  }
}
