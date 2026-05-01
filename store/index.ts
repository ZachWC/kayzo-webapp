import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { ChatMessage, ApprovalItem, ConnectionStatus, Customer } from "@/lib/types"

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000

interface AppState {
  // Data
  messages: ChatMessage[]
  approvals: ApprovalItem[]
  customer: Customer | null

  // Connection
  connectionStatus: ConnectionStatus

  // Actions
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  removeThinkingMessages: () => void
  setMessages: (messages: ChatMessage[]) => void
  addApproval: (approval: ApprovalItem) => void
  updateApproval: (id: string, updates: Partial<ApprovalItem>) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setCustomer: (customer: Customer | null) => void
  reset: () => void
}

const initialState = {
  messages: [],
  approvals: [],
  customer: null,
  connectionStatus: "connecting" as ConnectionStatus,
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
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

      setMessages: (messages) => set({ messages }),

      addApproval: (approval) =>
        set((state) => ({ approvals: [...state.approvals, approval] })),

      updateApproval: (id, updates) =>
        set((state) => ({
          approvals: state.approvals.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

      setCustomer: (customer) => set({ customer }),

      reset: () => set(initialState),
    }),
    {
      name: "kayzo-chat-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist messages — everything else is session state
      partialize: (state) => ({ messages: state.messages }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const cutoff = Date.now() - SIXTY_DAYS_MS
        state.messages = state.messages
          // Restore Date objects serialized as strings and drop expired messages
          .map((m) => ({ ...m, timestamp: new Date(m.timestamp as unknown as string) }))
          .filter((m) => m.timestamp.getTime() > cutoff)
          // Drop any thinking bubbles that were persisted mid-session
          .filter((m) => m.type !== "thinking")
      },
    }
  )
)
