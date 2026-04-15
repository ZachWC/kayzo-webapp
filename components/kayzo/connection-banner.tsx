"use client"

import { useState } from "react"
import { X, RefreshCw, WifiOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ConnectionStatus } from "@/lib/types"

interface ConnectionBannerProps {
  status?: ConnectionStatus
}

export function ConnectionBanner({ status = "reconnecting" }: ConnectionBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || status === "connected" || status === "setup_pending") return null

  const config = {
    connecting: {
      bg: "bg-blue-500",
      text: "Connecting to Kayzo...",
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    reconnecting: {
      bg: "bg-yellow-500",
      text: "Reconnecting...",
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    failed: {
      bg: "bg-destructive",
      text: "Unable to connect",
      icon: <WifiOff className="w-4 h-4" />,
    },
  }[status as "connecting" | "reconnecting" | "failed"]

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2.5 text-white text-sm font-medium",
        config.bg
      )}
    >
      <div className="flex items-center gap-2">
        {config.icon}
        <span>{config.text}</span>
      </div>
      <div className="flex items-center gap-2">
        {status === "failed" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs font-semibold border-white/40 text-white bg-white/10 hover:bg-white/20"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-white/80 hover:text-white transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
