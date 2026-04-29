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

export async function signUpWithProfile(formData: FormData): Promise<string | null> {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const phone = (formData.get("phone") as string) || ""
  const companyName = (formData.get("companyName") as string) || ""
  const logoFile = formData.get("companyLogo") as File | null

  const supabase = await createClient()

  let companyLogoUrl: string | null = null

  if (logoFile && logoFile.size > 0) {
    const ext = logoFile.name.split(".").pop() ?? "png"
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const bytes = await logoFile.arrayBuffer()

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company-logos")
      .upload(fileName, bytes, { contentType: logoFile.type, upsert: false })

    if (!uploadError && uploadData) {
      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(uploadData.path)
      companyLogoUrl = publicUrl
    }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone, company_name: companyName, company_logo_url: companyLogoUrl },
    },
  })

  if (error) return error.message

  redirect("/signup/check-email")
  return null
}
