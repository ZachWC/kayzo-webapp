"use client"

import { useState, useRef, useEffect } from "react"
import { Paperclip, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGateway } from "@/lib/gateway/useGateway"
import { useAppStore } from "@/store"
import { ApprovalCard } from "./approval-card"
import { BidCard } from "./bid-card"
import { OnboardingModal } from "./onboarding-modal"
import type { ChatMessage, BidLineItem } from "@/lib/types"

// BidCard still uses its own BidLineItem shape — adapt at render time
type LocalBidLineItem = {
  id: string
  description: string
  qty: number
  unit: string
  unitPrice: number
}

function adaptLineItems(items: BidLineItem[]): LocalBidLineItem[] {
  return items.map((i) => ({
    id: i.id,
    description: i.description,
    qty: i.quantity,
    unit: i.unit,
    unitPrice: i.unitPrice,
  }))
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
        />
      ))}
    </div>
  )
}

function KayzoAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-[--navy] flex items-center justify-center shrink-0 shadow-sm border border-[oklch(0.28_0.04_255)]">
      <span className="text-[11px] font-bold text-white">K</span>
    </div>
  )
}

function parseMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const { approvals } = useAppStore()

  if (msg.type === "thinking") {
    return (
      <div className="flex items-end gap-2">
        <KayzoAvatar />
        <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm">
          <ThinkingDots />
        </div>
      </div>
    )
  }

  if (msg.role === "system") {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    )
  }

  if (msg.type === "approval") {
    const approval = approvals.find((a) => a.id === msg.content)
    if (!approval) return null
    return (
      <div className="flex items-start gap-2">
        <KayzoAvatar />
        <div className="flex-1 max-w-sm">
          <ApprovalCard
            id={approval.id}
            category={approval.category}
            title={approval.title}
            detail={approval.details}
            amount={approval.amount}
            initialState={approval.status}
            compact
          />
          <p className="text-[10px] text-muted-foreground mt-1 ml-1">
            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    )
  }

  if (msg.type === "bid") {
    try {
      const bid = JSON.parse(msg.content) as {
        jobName: string
        date: string
        lineItems: BidLineItem[]
        markup?: number
      }
      return (
        <div className="flex items-start gap-2">
          <KayzoAvatar />
          <div className="flex-1 min-w-0">
            <BidCard
              jobName={bid.jobName}
              date={bid.date}
              lineItems={adaptLineItems(bid.lineItems)}
              markup={bid.markup}
            />
            <p className="text-[10px] text-muted-foreground mt-1 ml-1">
              {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      )
    } catch {
      return null
    }
  }

  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[80%] bg-[--approve] rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 mr-1">
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    )
  }

  // assistant text
  return (
    <div className="flex items-end gap-2">
      <KayzoAvatar />
      <div className="max-w-[80%]">
        <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          <p className="text-sm text-foreground leading-relaxed">
            {parseMarkdown(msg.content)}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 ml-1">
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  )
}

export function ChatScreen() {
  const { messages, addMessage, connectionStatus } = useAppStore()
  const { send } = useGateway()
  const [input, setInput] = useState("")
  const [showOnboarding, setShowOnboarding] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check if first login
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("kayzo_onboarding_complete")) {
      setShowOnboarding(true)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const adjustTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`
  }

  const sendMessage = () => {
    const text = input.trim()
    if (!text || connectionStatus !== "connected") return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
      type: "text",
    }
    addMessage(userMsg)

    const thinkingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      type: "thinking",
    }
    addMessage(thinkingMsg)

    send("agent", { message: text })

    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1]
      send("agent", { message: input.trim() || "Here is a photo.", image: base64, mimeType: file.type })
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: `[Photo: ${file.name}]`,
        timestamp: new Date(),
        type: "text",
      }
      addMessage(userMsg)
      setInput("")
    }
    reader.readAsDataURL(file)
  }

  const isSendDisabled = !input.trim() || connectionStatus !== "connected"

  return (
    <>
      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            localStorage.setItem("kayzo_onboarding_complete", "true")
            setShowOnboarding(false)
          }}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center opacity-50">
              <p className="text-sm text-muted-foreground">
                Kayzo is ready. Send a message to get started.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t border-border bg-card px-4 py-3">
          <div className="flex items-end gap-2 bg-background border border-border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
            <label className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors mb-0.5 cursor-pointer" aria-label="Attach file">
              <Paperclip className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleFileSelect}
              />
            </label>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); adjustTextarea() }}
              onKeyDown={handleKeyDown}
              placeholder="Message Kayzo..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed min-h-[24px] max-h-24"
              aria-label="Message input"
            />
            <button
              onClick={sendMessage}
              disabled={isSendDisabled}
              className={cn(
                "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all mb-0.5",
                !isSendDisabled
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Kayzo can make mistakes. Verify important details.
          </p>
        </div>
      </div>
    </>
  )
}
