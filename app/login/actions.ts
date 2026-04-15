"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function signIn(email: string, password: string): Promise<string | null> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return error.message
  }

  // Check if local customer has no gateway_url set yet
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: customer } = await supabase
      .from("customers")
      .select("gateway_type, gateway_url")
      .eq("email", user.email)
      .single()

    if (customer?.gateway_type === "local" && !customer.gateway_url) {
      redirect("/setup-pending")
    }
  }

  redirect("/")
}

export async function forgotPassword(email: string): Promise<string | null> {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/reset-password`,
  })

  if (error) return error.message
  return null
}
