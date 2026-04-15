"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { ApprovalCard } from "./approval-card"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store"
import type { ApprovalCategory } from "@/lib/types"

type FilterTab = "All" | ApprovalCategory
const TABS: FilterTab[] = ["All", "ordering", "scheduling", "email_replies", "flagging"]
const TAB_LABELS: Record<FilterTab, string> = {
  All: "All",
  ordering: "Orders",
  scheduling: "Scheduling",
  email_replies: "Email",
  flagging: "Urgent",
}

export function ApprovalsScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>("All")
  const { approvals, updateApproval } = useAppStore()

  const filtered = approvals.filter(
    (a) => activeTab === "All" || a.category === activeTab
  )
  const pendingCount = approvals.filter((a) => a.status === "pending").length

  const handleApprove = (id: string) => updateApproval(id, { status: "approved" })
  const handleDecline = (id: string) => updateApproval(id, { status: "declined" })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-3 bg-background border-b border-border">
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-xl font-bold text-foreground">Approvals</h2>
          {pendingCount > 0 && (
            <span className="text-sm font-medium text-muted-foreground">
              {pendingCount} pending
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                activeTab === tab
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-base">No pending approvals.</p>
              <p className="text-sm text-muted-foreground mt-1">Kayzo is on top of it.</p>
            </div>
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">
                {item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <ApprovalCard
                id={item.id}
                category={item.category}
                title={item.title}
                detail={item.details}
                amount={item.amount}
                initialState={item.status}
                onApprove={handleApprove}
                onDecline={handleDecline}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
