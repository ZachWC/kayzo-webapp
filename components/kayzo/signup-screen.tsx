"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Building2, Eye, EyeOff, HardHat, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUpWithProfile } from "@/app/signup/actions"

export function SignupScreen() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setLogoPreview(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const formData = new FormData(e.currentTarget)
      const err = await signUpWithProfile(formData)
      if (err) setError(err)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

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

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <HardHat className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-white">Kayzo</span>
          </div>
          <p className="text-sm text-[oklch(0.65_0.03_255)] text-center">
            AI assistant for contractors
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-2xl p-6 border border-[oklch(0.88_0.01_250)]">
          <h1 className="text-xl font-semibold text-foreground mb-6">Create your account</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Full name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Bob Smith"
                className="h-12 text-base border-border"
                autoComplete="name"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                className="h-12 text-base border-border"
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                Phone number
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="h-12 text-base border-border"
                autoComplete="tel"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 text-base pr-12 border-border"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="companyName" className="text-sm font-medium text-foreground">
                Company name
              </Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Smith Construction LLC"
                className="h-12 text-base border-border"
                autoComplete="organization"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">
                Company logo <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <input
                ref={fileInputRef}
                id="companyLogo"
                name="companyLogo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 h-12 px-3 rounded-md border border-border bg-transparent hover:bg-muted/30 transition-colors text-sm text-muted-foreground w-full"
              >
                {logoPreview ? (
                  <>
                    <Image
                      src={logoPreview}
                      alt="Company logo preview"
                      width={28}
                      height={28}
                      className="rounded object-contain"
                      unoptimized
                    />
                    <span className="text-foreground text-sm truncate">Logo selected</span>
                  </>
                ) : (
                  <>
                    <div className="w-7 h-7 rounded border border-border flex items-center justify-center bg-muted/20">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="flex items-center gap-1.5">
                      <Upload className="w-4 h-4" />
                      Upload logo
                    </span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center -mt-1">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md mt-1"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-[oklch(0.5_0.03_255)] mt-6">
          &copy; {new Date().getFullYear()} Kayzo Inc. All rights reserved.
        </p>
      </div>
    </div>
  )
}
