import { HardHat, Mail } from "lucide-react"
import Link from "next/link"

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[--navy] p-4">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle, oklch(0.92 0.01 255) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm text-center">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <HardHat className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-white">Kayzo</span>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-2xl p-8 border border-[oklch(0.88_0.01_250)]">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-7 h-7 text-primary" />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-foreground mb-3">Check your email</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a confirmation link to your email address. Click it to activate your
            account.
          </p>

          <p className="text-xs text-muted-foreground">
            Already confirmed?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[oklch(0.5_0.03_255)] mt-6">
          &copy; {new Date().getFullYear()} Kayzo Inc. All rights reserved.
        </p>
      </div>
    </div>
  )
}
