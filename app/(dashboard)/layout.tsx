import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/kayzo/dashboard-shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch customer record for name and gateway info
  const { data: customer } = await supabase
    .from("customers")
    .select("name, slug, gateway_type, gateway_url")
    .eq("email", user.email)
    .single()

  if (customer?.gateway_type === "local" && !customer.gateway_url) {
    redirect("/setup-pending")
  }

  return (
    <DashboardShell
      contractorName={customer?.name ?? user.email ?? "Contractor"}
      customerSlug={customer?.slug ?? ""}
    >
      {children}
    </DashboardShell>
  )
}
