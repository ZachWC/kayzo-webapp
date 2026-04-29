import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { signUp } from "../actions"

function makeClient(signUpResult: {
  data: object
  error: { message: string } | null
}) {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue(signUpResult),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("signUp", () => {
  describe("success", () => {
    it("calls supabase.auth.signUp with email, password, and name in user metadata", async () => {
      const client = makeClient({ data: { user: { id: "abc-123" } }, error: null })
      vi.mocked(createClient).mockResolvedValue(client as never)

      await signUp("Bob Smith", "bob@example.com", "hunter2hunter2")

      expect(client.auth.signUp).toHaveBeenCalledWith({
        email: "bob@example.com",
        password: "hunter2hunter2",
        options: { data: { name: "Bob Smith" } },
      })
    })

    it("redirects to /signup/check-email on success", async () => {
      const client = makeClient({ data: { user: { id: "abc-123" } }, error: null })
      vi.mocked(createClient).mockResolvedValue(client as never)

      await signUp("Bob Smith", "bob@example.com", "hunter2hunter2")

      expect(redirect).toHaveBeenCalledWith("/signup/check-email")
    })

    it("does not return an error message on success", async () => {
      const client = makeClient({ data: { user: { id: "abc-123" } }, error: null })
      vi.mocked(createClient).mockResolvedValue(client as never)

      const result = await signUp("Bob Smith", "bob@example.com", "hunter2hunter2")

      expect(result).toBeNull()
    })
  })

  describe("errors", () => {
    it("returns the error message when the email is already registered", async () => {
      const client = makeClient({
        data: {},
        error: { message: "User already registered" },
      })
      vi.mocked(createClient).mockResolvedValue(client as never)

      const result = await signUp("Bob Smith", "existing@example.com", "hunter2hunter2")

      expect(result).toBe("User already registered")
    })

    it("does not redirect when Supabase returns an error", async () => {
      const client = makeClient({
        data: {},
        error: { message: "User already registered" },
      })
      vi.mocked(createClient).mockResolvedValue(client as never)

      await signUp("Bob Smith", "existing@example.com", "hunter2hunter2")

      expect(redirect).not.toHaveBeenCalled()
    })

    it("returns the error message when the password is too weak", async () => {
      const client = makeClient({
        data: {},
        error: { message: "Password should be at least 6 characters." },
      })
      vi.mocked(createClient).mockResolvedValue(client as never)

      const result = await signUp("Bob Smith", "bob@example.com", "weak")

      expect(result).toBe("Password should be at least 6 characters.")
    })

    it("returns the error message when the email address is invalid", async () => {
      const client = makeClient({
        data: {},
        error: { message: "Unable to validate email address: invalid format" },
      })
      vi.mocked(createClient).mockResolvedValue(client as never)

      const result = await signUp("Bob Smith", "not-an-email", "hunter2hunter2")

      expect(result).toBe("Unable to validate email address: invalid format")
    })
  })
})
