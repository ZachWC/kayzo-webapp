"use client"

import { useState } from "react"
import {
  MessageSquare,
  Bell,
  SlidersHorizontal,
  Clock,
  HardHat,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ConnectionBanner } from "./connection-banner"

export type Screen = "chat" | "approvals" | "preferences" | "activity"

interface NavItem {
  id: Screen
  label: string
  icon: React.ReactNode
  badge?: number
}

interface AppShellProps {
  children: React.ReactNode
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
  pendingCount?: number
  contractorName?: string
}

export function AppShell({
  children,
  currentScreen,
  onNavigate,
  pendingCount = 3,
  contractorName = "Mike Reyes",
}: AppShellProps) {
  const navItems: NavItem[] = [
    {
      id: "chat",
      label: "Chat",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      id: "approvals",
      label: "Approvals",
      icon: <Bell className="w-5 h-5" />,
      badge: pendingCount,
    },
    {
      id: "preferences",
      label: "Preferences",
      icon: <SlidersHorizontal className="w-5 h-5" />,
    },
    {
      id: "activity",
      label: "Activity",
      icon: <Clock className="w-5 h-5" />,
    },
  ]

  const initials = contractorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[--navy] border-r border-[oklch(0.28_0.04_255)] shrink-0">
        {/* Sidebar Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[oklch(0.28_0.04_255)]">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <HardHat className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Kayzo</span>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all text-left w-full",
                currentScreen === item.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-[oklch(0.75_0.03_255)] hover:bg-[oklch(0.25_0.04_255)] hover:text-white"
              )}
              aria-current={currentScreen === item.id ? "page" : undefined}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span
                  className={cn(
                    "min-w-5 h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center",
                    currentScreen === item.id
                      ? "bg-white/20 text-white"
                      : "bg-destructive text-white"
                  )}
                  aria-label={`${item.badge} pending`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Sidebar User */}
        <div className="p-3 border-t border-[oklch(0.28_0.04_255)]">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
          >
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
          {/* Mobile: Kayzo logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <HardHat className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Kayzo</span>
          </div>

          {/* Desktop: screen title */}
          <div className="hidden md:block">
            <h1 className="text-sm font-semibold text-[oklch(0.75_0.03_255)] capitalize">
              {currentScreen}
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Contractor name — desktop */}
            <span className="hidden md:block text-sm text-[oklch(0.75_0.03_255)] font-medium">
              {contractorName}
            </span>

            {/* Notification bell */}
            <button
              className="relative p-2 rounded-lg hover:bg-[oklch(0.25_0.04_255)] transition-colors"
              aria-label={`${pendingCount} pending approvals`}
              onClick={() => onNavigate("approvals")}
            >
              <Bell className="w-5 h-5 text-[oklch(0.75_0.03_255)]" />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>

            {/* Mobile avatar */}
            <div className="flex md:hidden w-8 h-8 rounded-full bg-primary items-center justify-center text-xs font-bold text-primary-foreground">
              {initials}
            </div>
          </div>
        </header>

        {/* Connection banner */}
        <ConnectionBanner status="connected" />

        {/* Page content */}
        <main className="flex-1 overflow-hidden">{children}</main>

        {/* Mobile Bottom Nav */}
        <nav
          className="flex md:hidden bg-[--navy] border-t border-[oklch(0.28_0.04_255)] shrink-0"
          aria-label="Bottom navigation"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 px-1 relative transition-colors",
                currentScreen === item.id
                  ? "text-primary"
                  : "text-[oklch(0.55_0.03_255)] hover:text-[oklch(0.75_0.03_255)]"
              )}
              aria-current={currentScreen === item.id ? "page" : undefined}
            >
              <div className="relative">
                {item.icon}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-destructive rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
