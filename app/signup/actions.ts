"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<string | null> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })

  if (error) return error.message

  redirect("/signup/check-email")
  return null
}
