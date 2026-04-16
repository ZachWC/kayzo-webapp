import { create } from "zustand"
import type {
  ChatMessage,
  ApprovalItem,
  Preferences,
  ConnectionStatus,
  Customer,
} from "@/lib/types"

interface AppState {
  // Data
  messages: ChatMessage[]
  approvals: ApprovalItem[]
  preferences: Preferences | null
  customer: Customer | null

  // Connection
  connectionStatus: ConnectionStatus

  // Actions
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  removeThinkingMessages: () => void
  addApproval: (approval: ApprovalItem) => void
  updateApproval: (id: string, updates: Partial<ApprovalItem>) => void
  setPreferences: (preferences: Preferences) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setCustomer: (customer: Customer | null) => void
  reset: () => void
}

const initialState = {
  messages: [],
  approvals: [],
  preferences: null,
  customer: null,
  connectionStatus: "connecting" as ConnectionStatus,
}

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  removeThinkingMessages: () =>
    set((state) => ({
      messages: state.messages.filter((m) => m.type !== "thinking"),
    })),

  addApproval: (approval) =>
    set((state) => ({ approvals: [...state.approvals, approval] })),

  updateApproval: (id, updates) =>
    set((state) => ({
      approvals: state.approvals.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  setPreferences: (preferences) => set({ preferences }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setCustomer: (customer) => set({ customer }),

  reset: () => set(initialState),
}))
