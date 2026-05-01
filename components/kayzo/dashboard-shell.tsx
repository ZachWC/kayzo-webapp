"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { MessageSquare, Bell, Clock, HardHat, Plug, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConnectionBanner } from "./connection-banner"
import { useAppStore } from "@/store"
import { createClient } from "@/lib/supabase/client"

interface DashboardShellProps {
  children: React.ReactNode
  contractorName: string
  customerSlug: string
}

const NAV_ITEMS = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/approvals", label: "Approvals", icon: Bell },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/activity", label: "Activity", icon: Clock },
  { href: "/account", label: "Account", icon: User },
]

export function DashboardShell({ children, contractorName, customerSlug }: DashboardShellProps) {
  const pathname = usePathname()
  const { connectionStatus, approvals, setCustomer } = useAppStore()

  useEffect(() => {
    setCustomer({ id: "", email: "", name: contractorName, slug: customerSlug, subscriptionStatus: "active", subscriptionTier: "cloud", freeAccount: false, gatewayType: "cloud", gatewayUrl: null })
  }, [customerSlug, contractorName, setCustomer])

  // Product policy: review-first only — no autonomy UI. Sync contractor_preferences on load
  // so gateway + plugins never auto-order, auto-schedule, or auto-reply without approval.
  useEffect(() => {
    if (!customerSlug) return
    const apiBase =
      process.env.NEXT_PUBLIC_GATEWAY_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "https://api.kayzo.app"

    const supabase = createClient()
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const token = data.session?.access_token
        if (!token) return
        return fetch(`${apiBase}/api/preferences/${customerSlug}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ordering_mode: "always_ask",
            scheduling_mode: "always_ask",
            email_replies_mode: "always_ask",
            flagging_mode: "always_act",
            bid_markup: 20,
          }),
        }).catch(() => {})
      })
      .catch(() => {})
  }, [customerSlug])

  const pendingCount = approvals.filter((a) => a.status === "pending").length

  const initials = contractorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[--navy] border-r border-[oklch(0.28_0.04_255)] shrink-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[oklch(0.28_0.04_255)]">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <HardHat className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Kayzo</span>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1" aria-label="Main navigation">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                isActive(href)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-[oklch(0.75_0.03_255)] hover:bg-[oklch(0.25_0.04_255)] hover:text-white"
              )}
              aria-current={isActive(href) ? "page" : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{label}</span>
              {label === "Approvals" && pendingCount > 0 && (
                <span
                  className={cn(
                    "min-w-5 h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center",
                    isActive(href) ? "bg-white/20 text-white" : "bg-destructive text-white"
                  )}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-[oklch(0.28_0.04_255)]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{contractorName}</p>
              <p className="text-xs text-[oklch(0.55_0.03_255)] truncate">Contractor</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-[--navy] border-b border-[oklch(0.28_0.04_255)] shrink-0">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <HardHat className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Kayzo</span>
          </div>

          <div className="hidden md:block">
            <h1 className="text-sm font-semibold text-[oklch(0.75_0.03_255)] capitalize">
              {NAV_ITEMS.find((n) => isActive(n.href))?.label ?? ""}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:block text-sm text-[oklch(0.75_0.03_255)] font-medium">
              {contractorName}
            </span>
            <Link
              href="/approvals"
              className="relative p-2 rounded-lg hover:bg-[oklch(0.25_0.04_255)] transition-colors"
              aria-label={`${pendingCount} pending approvals`}
            >
              <Bell className="w-5 h-5 text-[oklch(0.75_0.03_255)]" />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </Link>
            <div className="flex md:hidden w-8 h-8 rounded-full bg-primary items-center justify-center text-xs font-bold text-primary-foreground">
              {initials}
            </div>
          </div>
        </header>

        <ConnectionBanner status={connectionStatus} />

        <main className="flex-1 overflow-hidden">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="flex md:hidden bg-[--navy] border-t border-[oklch(0.28_0.04_255)] shrink-0" aria-label="Bottom navigation">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 px-1 relative transition-colors",
                isActive(href)
                  ? "text-primary"
                  : "text-[oklch(0.55_0.03_255)] hover:text-[oklch(0.75_0.03_255)]"
              )}
              aria-current={isActive(href) ? "page" : undefined}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {label === "Approvals" && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-destructive rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

