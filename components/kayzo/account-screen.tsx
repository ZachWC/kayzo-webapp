"use client"

import { useState, useTransition } from "react"
import { LogOut, Trash2 } from "lucide-react"
import { logout, cancelAccount } from "@/app/(dashboard)/account/actions"

function AccountCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {children}
    </div>
  )
}

export function AccountScreen() {
  const [logoutPending, startLogout] = useTransition()
  const [cancelPending, startCancel] = useTransition()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  function handleLogout() {
    startLogout(async () => {
      await logout()
    })
  }

  function handleCancelAccount() {
    startCancel(async () => {
      const error = await cancelAccount()
      if (error) {
        console.error("cancelAccount error:", error)
        setCancelError("We couldn't cancel your account right now. Please try again.")
        setConfirmCancel(false)
      }
    })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-foreground pt-1">Account</h2>

        <AccountCard>
          <div>
            <p className="text-sm font-semibold text-foreground">Session</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Sign out of your Kayzo account on this device.
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {logoutPending ? "Signing out…" : "Log out"}
          </button>
        </AccountCard>

        <AccountCard>
          <div>
            <p className="text-sm font-semibold text-destructive">Cancel account</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Permanently cancel your Kayzo subscription. This cannot be undone.
            </p>
          </div>
          {cancelError && (
            <p className="text-xs text-destructive">{cancelError}</p>
          )}
          {!confirmCancel ? (
            <button
              onClick={() => { setCancelError(null); setConfirmCancel(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Cancel account
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleCancelAccount}
                disabled={cancelPending}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {cancelPending ? "Cancelling…" : "Yes, cancel my account"}
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={cancelPending}
                className="px-4 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                Never mind
              </button>
            </div>
          )}
        </AccountCard>
      </div>
    </div>
  )
}
