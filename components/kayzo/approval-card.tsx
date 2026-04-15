"use client"

import { useState } from "react"
import { Check, X, Package, Calendar, Mail, Flag } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGateway } from "@/lib/gateway/useGateway"
import type { ApprovalCategory, ApprovalStatus } from "@/lib/types"

export type { ApprovalCategory }

interface ApprovalCardProps {
  id: string
  category: ApprovalCategory
  title: string
  detail?: string
  amount?: number
  onApprove?: (id: string) => void
  onDecline?: (id: string) => void
  initialState?: ApprovalStatus
  compact?: boolean
}

const categoryConfig: Record<
  ApprovalCategory,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  ordering: {
    label: "Orders",
    color: "text-blue-700",
    bg: "bg-blue-100",
    icon: <Package className="w-3 h-3" />,
  },
  scheduling: {
    label: "Scheduling",
    color: "text-purple-700",
    bg: "bg-purple-100",
    icon: <Calendar className="w-3 h-3" />,
  },
  email_replies: {
    label: "Email",
    color: "text-orange-700",
    bg: "bg-orange-100",
    icon: <Mail className="w-3 h-3" />,
  },
  flagging: {
    label: "Urgent",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: <Flag className="w-3 h-3" />,
  },
}

export function ApprovalCard({
  id,
  category,
  title,
  detail,
  amount,
  onApprove,
  onDecline,
  initialState = "pending",
  compact = false,
}: ApprovalCardProps) {
  const [state, setState] = useState<ApprovalStatus>(initialState)
  const [resolvedAt] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
  const { send } = useGateway()

  const cfg = categoryConfig[category]

  const handleApprove = () => {
    setState("approved")
    send("approvals.approve", { approvalId: id })
    onApprove?.(id)
  }

  const handleDecline = () => {
    setState("declined")
    send("approvals.decline", { approvalId: id })
    onDecline?.(id)
  }

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden shadow-sm",
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {/* Category pill */}
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mb-2",
              cfg.bg,
              cfg.color
            )}
          >
            {cfg.icon}
            {cfg.label}
          </span>
          <h3 className={cn("font-semibold text-foreground leading-tight", compact ? "text-sm" : "text-base")}>
            {title}
          </h3>
          {detail && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{detail}</p>
          )}
        </div>

        {/* Amount */}
        {amount !== undefined && (
          <div className="shrink-0 text-right">
            <p className={cn("font-bold text-foreground tabular-nums", compact ? "text-lg" : "text-2xl")}>
              ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {state === "pending" ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 shadow-sm"
            >
              <Check className="w-4 h-4" />
              Approve
            </Button>
            <Button
              onClick={handleDecline}
              className="flex-1 h-11 bg-destructive text-white hover:bg-destructive/90 font-semibold gap-2 shadow-sm"
            >
              <X className="w-4 h-4" />
              Decline
            </Button>
          </div>
          <Link
            href={`/preferences?category=${category}`}
            className="text-xs text-muted-foreground hover:text-primary transition-colors text-center py-0.5 block"
          >
            Change how I handle these
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
              state === "approved"
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {state === "approved" ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
            {state === "approved" ? "Approved" : "Declined"}
          </span>
          <span className="text-xs text-muted-foreground">{resolvedAt}</span>
        </div>
      )}
    </div>
  )
}
