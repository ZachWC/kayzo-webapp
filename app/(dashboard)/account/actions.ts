"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function cancelAccount(): Promise<string | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
    return null
  }

  const { error } = await supabase
    .from("customers")
    .update({ subscription_status: "cancelled" })
    .eq("auth_user_id", user.id)

  if (error) return error.message

  await supabase.auth.signOut()
  redirect("/login")
  return null
}
