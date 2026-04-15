"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { HardHat, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function SetupPendingPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(false)

  const checkAgain = async () => {
    setIsChecking(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }
    const { data: customer } = await supabase
      .from("customers")
      .select("gateway_url")
      .eq("email", user.email)
      .single()

    if (customer?.gateway_url) {
      router.push("/")
    } else {
      setIsChecking(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--navy] p-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <HardHat className="w-9 h-9 text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Your device is being set up</h1>
        <p className="text-[oklch(0.65_0.03_255)] text-sm leading-relaxed mb-8">
          Kayzo is being installed on your dedicated device. You will receive an email when it is
          ready. This usually takes less than 24 hours.
        </p>

        <Button
          onClick={checkAgain}
          disabled={isChecking}
          variant="outline"
          className="w-full h-12 text-base font-semibold bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          {isChecking ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            "Check again"
          )}
        </Button>
      </div>
    </div>
  )
}
