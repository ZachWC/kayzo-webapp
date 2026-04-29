import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { logout, cancelAccount } from "../actions"

function makeClient({
  signOutError = null as { message: string } | null,
  user = { id: "user-123" } as { id: string } | null,
  updateError = null as { message: string } | null,
} = {}) {
  const eq = vi.fn().mockResolvedValue({ error: updateError })
  const update = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ update })
  const signOut = vi.fn().mockResolvedValue({ error: signOutError })
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null })

  const client = { auth: { signOut, getUser }, from }
  return { client, mocks: { from, update, eq, signOut, getUser } }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("logout", () => {
  it("calls supabase.auth.signOut()", async () => {
    const { client, mocks } = makeClient()
    vi.mocked(createClient).mockResolvedValue(client as never)

    await logout()

    expect(mocks.signOut).toHaveBeenCalledOnce()
  })

  it("redirects to /login after signing out", async () => {
    const { client } = makeClient()
    vi.mocked(createClient).mockResolvedValue(client as never)

    await logout()

    expect(redirect).toHaveBeenCalledWith("/login")
  })
})

describe("cancelAccount", () => {
  describe("success", () => {
    it("updates subscription_status to cancelled for the current user", async () => {
      const { client, mocks } = makeClient()
      vi.mocked(createClient).mockResolvedValue(client as never)

      await cancelAccount()

      expect(mocks.from).toHaveBeenCalledWith("customers")
      expect(mocks.update).toHaveBeenCalledWith({ subscription_status: "cancelled" })
      expect(mocks.eq).toHaveBeenCalledWith("auth_user_id", "user-123")
    })

    it("signs out after cancelling", async () => {
      const { client, mocks } = makeClient()
      vi.mocked(createClient).mockResolvedValue(client as never)

      await cancelAccount()

      expect(mocks.signOut).toHaveBeenCalledOnce()
    })

    it("redirects to /login after cancelling", async () => {
      const { client } = makeClient()
      vi.mocked(createClient).mockResolvedValue(client as never)

      await cancelAccount()

      expect(redirect).toHaveBeenCalledWith("/login")
    })

    it("does not return an error on success", async () => {
      const { client } = makeClient()
      vi.mocked(createClient).mockResolvedValue(client as never)

      const result = await cancelAccount()

      expect(result).toBeNull()
    })
  })

  describe("errors", () => {
    it("returns the error message when the database update fails", async () => {
      const { client } = makeClient({ updateError: { message: "Permission denied" } })
      vi.mocked(createClient).mockResolvedValue(client as never)

      const result = await cancelAccount()

      expect(result).toBe("Permission denied")
    })

    it("does not sign out when the database update fails", async () => {
      const { client, mocks } = makeClient({ updateError: { message: "Permission denied" } })
      vi.mocked(createClient).mockResolvedValue(client as never)

      await cancelAccount()

      expect(mocks.signOut).not.toHaveBeenCalled()
    })

    it("does not redirect when the database update fails", async () => {
      const { client } = makeClient({ updateError: { message: "Permission denied" } })
      vi.mocked(createClient).mockResolvedValue(client as never)

      await cancelAccount()

      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe("no session", () => {
    it("redirects to /login when there is no authenticated user", async () => {
      const { client } = makeClient({ user: null })
      vi.mocked(createClient).mockResolvedValue(client as never)

      await cancelAccount()

      expect(redirect).toHaveBeenCalledWith("/login")
    })
  })
})
