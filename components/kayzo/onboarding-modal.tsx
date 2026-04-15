"use client"

import { useState } from "react"
import { Check, ChevronLeft, ChevronRight, HardHat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OnboardingStep {
  question: string
  key: string
  options: { value: string; label: string; description?: string }[]
}

const STEPS: OnboardingStep[] = [
  {
    question: "How do you want Kayzo to handle material orders?",
    key: "materialOrders",
    options: [
      {
        value: "always-ask",
        label: "Always ask me first",
        description: "I'll approve every order before it goes through.",
      },
      {
        value: "auto-under",
        label: "Auto-approve small orders",
        description: "I'll set a dollar limit — anything under it goes automatically.",
      },
      {
        value: "always-act",
        label: "Handle it automatically",
        description: "Kayzo orders what's needed. I review the activity log.",
      },
    ],
  },
  {
    question: "How should Kayzo manage your crew schedule?",
    key: "scheduling",
    options: [
      {
        value: "always-ask",
        label: "Show me before any changes",
        description: "I approve all schedule updates.",
      },
      {
        value: "always-act",
        label: "Update automatically",
        description: "Kayzo keeps the schedule current without interrupting me.",
      },
    ],
  },
  {
    question: "What about email replies to clients and suppliers?",
    key: "emails",
    options: [
      {
        value: "always-ask",
        label: "Draft for me to review",
        description: "I read and send every reply myself.",
      },
      {
        value: "always-act",
        label: "Send on my behalf",
        description: "Kayzo handles routine replies automatically.",
      },
    ],
  },
  {
    question: "What's your typical project markup?",
    key: "markup",
    options: [
      { value: "10", label: "10%" },
      { value: "15", label: "15%" },
      { value: "18", label: "18%" },
      { value: "20", label: "20%" },
      { value: "25", label: "25%" },
    ],
  },
]

const SUMMARY_LABELS: Record<string, Record<string, string>> = {
  materialOrders: {
    "always-ask": "Always ask",
    "auto-under": "Auto-approve small orders",
    "always-act": "Always automatic",
  },
  scheduling: {
    "always-ask": "Review first",
    "always-act": "Automatic",
  },
  emails: {
    "always-ask": "Draft for review",
    "always-act": "Send automatically",
  },
  markup: {
    "10": "10%", "15": "15%", "18": "18%", "20": "20%", "25": "25%",
  },
}

import { useAppStore } from "@/store"

interface OnboardingModalProps {
  onComplete?: () => void
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const { customer } = useAppStore()
  const apiBase = process.env.NEXT_PUBLIC_GATEWAY_API_URL ?? "https://api.kayzo.ai"

  const isLastStep = step === STEPS.length
  const currentStep = STEPS[step]
  const canContinue = isLastStep || !!selections[currentStep?.key]

  const handleSelect = (key: string, value: string) => {
    setSelections((prev) => ({ ...prev, [key]: value }))
  }

  const handleNext = () => {
    if (step < STEPS.length) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-5 pb-2 px-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i < step
                  ? "bg-primary w-6"
                  : i === step
                  ? "bg-primary w-8"
                  : "bg-muted w-4"
              )}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-4 min-h-[360px] flex flex-col">
          {!isLastStep ? (
            <>
              <div className="mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Step {step + 1} of {STEPS.length}
                </p>
              </div>
              <h2 className="text-lg font-bold text-foreground leading-snug mb-5 text-balance">
                {currentStep.question}
              </h2>

              <div className="flex flex-col gap-3 flex-1">
                {currentStep.options.map((opt) => {
                  const isSelected = selections[currentStep.key] === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(currentStep.key, opt.value)}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                        {opt.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            /* Summary screen */
            <>
              <div className="flex flex-col items-center text-center mb-6 mt-2">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
                  <HardHat className="w-7 h-7 text-primary-foreground" />
                </div>
                <h2 className="text-lg font-bold text-foreground">You&apos;re all set!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Here&apos;s a summary of your preferences. You can change these anytime.
                </p>
              </div>

              <div className="bg-muted rounded-xl p-4 space-y-3 flex-1">
                {[
                  { label: "Material orders", key: "materialOrders" },
                  { label: "Scheduling", key: "scheduling" },
                  { label: "Email replies", key: "emails" },
                  { label: "Default markup", key: "markup" },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {SUMMARY_LABELS[key]?.[selections[key]] ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={handleBack} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {isLastStep ? (
            <Button
              onClick={async () => {
                if (!customer?.slug) { onComplete?.(); return }
                setIsSaving(true)
                const modeMap: Record<string, string> = {
                  "always-ask": "always_ask",
                  "auto-under": "threshold",
                  "always-act": "always_act",
                }
                await fetch(`${apiBase}/api/preferences/${customer.slug}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ordering: {
                      mode: modeMap[selections.materialOrders] ?? "always_ask",
                      threshold: selections.materialOrders === "auto-under" ? 500 : null,
                    },
                    scheduling: { mode: modeMap[selections.scheduling] ?? "always_ask" },
                    emailReplies: { mode: modeMap[selections.emails] ?? "always_ask" },
                    bidMarkup: Number(selections.markup ?? 20),
                  }),
                }).catch(() => {})
                setIsSaving(false)
                onComplete?.()
              }}
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 font-semibold"
            >
              {isSaving ? "Saving…" : "Get started"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canContinue}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 font-semibold gap-1.5"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
