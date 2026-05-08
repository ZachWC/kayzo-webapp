export interface Customer {
  id: string
  email: string
  name: string | null
  slug: string
  subscriptionStatus: string
  subscriptionTier: string
  freeAccount: boolean
  gatewayType: "cloud" | "local"
  gatewayUrl: string | null
}

export type MessageRole = "user" | "assistant" | "system"
export type MessageType = "text" | "approval" | "bid" | "invoice" | "pricing" | "thinking"

/** Serialized into ChatMessage.content for type "pricing" */
export type PricingChatPayload = {
  store: "lowes" | "homedepot"
  query: string
  items: Array<{
    name: string
    price: number
    unit: string
    sku: string
    inStock: boolean
  }>
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  type: MessageType
}

export type ApprovalCategory = "ordering" | "scheduling" | "email_replies" | "flagging"
export type ApprovalStatus = "pending" | "approved" | "declined"

export interface ApprovalItem {
  id: string
  title: string
  details: string
  category: ApprovalCategory
  amount?: number
  status: ApprovalStatus
  createdAt: Date
  originalContext?: string
}

export interface BidLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  sourceUrl?: string
}

export interface Bid {
  jobName: string
  date: string
  lineItems: BidLineItem[]
  subtotal: number
  markupPercent: number
  markupAmount: number
  grandTotal: number
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed"
  | "setup_pending"
