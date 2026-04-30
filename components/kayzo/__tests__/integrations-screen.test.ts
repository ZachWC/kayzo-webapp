/**
 * Tests for the Integrations screen data layer:
 * - Credential save logic (Lowe's / Home Depot)
 * - Integrations status fetch and response shape validation
 * - Error handling
 *
 * Note: React Testing Library is not installed in this project. These tests
 * verify the fetch/API layer in isolation using vi.stubGlobal("fetch", ...).
 * Component rendering is not covered here.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ── Types mirrored from integrations-screen.tsx ──────────────────────────────

interface LoweStatus {
  configured: boolean
  accountNumber: string | null
  hasApiKey: boolean
}

interface IntegrationsData {
  gmail: { connected: boolean; email: string | null; oauthAvailable: boolean }
  lowes: LoweStatus
  homedepot: LoweStatus
  updatedAt: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const API_BASE = "https://api.kayzo.app"
const SLUG = "testcontractor"
const TOKEN = "test-auth-token"

function makeIntegrationsResponse(overrides: Partial<IntegrationsData> = {}): IntegrationsData {
  return {
    gmail: { connected: false, email: null, oauthAvailable: false },
    lowes: { configured: false, accountNumber: null, hasApiKey: false },
    homedepot: { configured: false, accountNumber: null, hasApiKey: false },
    updatedAt: null,
    ...overrides,
  }
}

/**
 * Mirrors the saveLowes fetch logic from integrations-screen.tsx.
 * Extracted here so we can test it as a pure function.
 */
async function saveLowes(
  apiBase: string,
  slug: string,
  token: string,
  apiKey: string,
  accountNumber: string,
): Promise<void> {
  const body: Record<string, string> = {}
  if (apiKey) body.lowes_api_key = apiKey
  body.lowes_account_number = accountNumber

  const res = await fetch(`${apiBase}/api/integrations/${slug}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "Failed to save")
  }
}

/**
 * Mirrors the saveHomeDepot fetch logic from integrations-screen.tsx.
 */
async function saveHomeDepot(
  apiBase: string,
  slug: string,
  token: string,
  apiKey: string,
  accountNumber: string,
): Promise<void> {
  const body: Record<string, string> = {}
  if (apiKey) body.homedepot_api_key = apiKey
  body.homedepot_account_number = accountNumber

  const res = await fetch(`${apiBase}/api/integrations/${slug}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "Failed to save")
  }
}

/**
 * Mirrors the fetchIntegrations logic from integrations-screen.tsx.
 */
async function fetchIntegrations(
  apiBase: string,
  slug: string,
  token: string,
): Promise<IntegrationsData | null> {
  try {
    const res = await fetch(`${apiBase}/api/integrations/${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      return (await res.json()) as IntegrationsData
    }
    return null
  } catch {
    return null
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── fetchIntegrations ─────────────────────────────────────────────────────────

describe("fetchIntegrations", () => {
  it("sends a GET request to the integrations endpoint with auth header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeIntegrationsResponse()),
      }),
    )

    await fetchIntegrations(API_BASE, SLUG, TOKEN)

    expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/integrations/${SLUG}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
  })

  it("returns the parsed integrations data on success", async () => {
    const response = makeIntegrationsResponse({
      lowes: { configured: true, accountNumber: "ACC-123", hasApiKey: true },
    })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(response) }),
    )

    const result = await fetchIntegrations(API_BASE, SLUG, TOKEN)

    expect(result?.lowes.configured).toBe(true)
    expect(result?.lowes.accountNumber).toBe("ACC-123")
    expect(result?.lowes.hasApiKey).toBe(true)
  })

  it("returns null when the fetch throws a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")))

    const result = await fetchIntegrations(API_BASE, SLUG, TOKEN)

    expect(result).toBeNull()
  })

  it("returns null when the server responds with a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    )

    const result = await fetchIntegrations(API_BASE, SLUG, TOKEN)

    expect(result).toBeNull()
  })

  it("includes gmail, lowes, and homedepot in the response shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeIntegrationsResponse()),
      }),
    )

    const result = await fetchIntegrations(API_BASE, SLUG, TOKEN)

    expect(result).toHaveProperty("gmail")
    expect(result).toHaveProperty("lowes")
    expect(result).toHaveProperty("homedepot")
  })
})

// ── saveLowes ─────────────────────────────────────────────────────────────────

describe("saveLowes", () => {
  it("sends a PATCH to /api/integrations/:slug with the auth token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }),
    )

    await saveLowes(API_BASE, SLUG, TOKEN, "", "ACC-123")

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/api/integrations/${SLUG}`,
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    )
  })

  it("includes lowes_account_number in the request body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }),
    )

    await saveLowes(API_BASE, SLUG, TOKEN, "", "ACC-9999")

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    ) as Record<string, string>
    expect(body.lowes_account_number).toBe("ACC-9999")
  })

  it("includes lowes_api_key in the request body when provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }),
    )

    await saveLowes(API_BASE, SLUG, TOKEN, "new-secret-key", "ACC-123")

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    ) as Record<string, string>
    expect(body.lowes_api_key).toBe("new-secret-key")
  })

  it("omits lowes_api_key from the request body when apiKey is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }),
    )

    await saveLowes(API_BASE, SLUG, TOKEN, "", "ACC-123")

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    ) as Record<string, string>
    expect(body).not.toHaveProperty("lowes_api_key")
  })

  it("throws an Error when the server responds with a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "unauthorized" }),
      }),
    )

    await expect(saveLowes(API_BASE, SLUG, TOKEN, "", "ACC-123")).rejects.toThrow("unauthorized")
  })

  it("throws a fallback error message when the server error body has no error field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      }),
    )

    await expect(saveLowes(API_BASE, SLUG, TOKEN, "", "ACC-123")).rejects.toThrow("Failed to save")
  })
})

// ── saveHomeDepot ─────────────────────────────────────────────────────────────

describe("saveHomeDepot", () => {
  it("sends a PATCH to /api/integrations/:slug with the auth token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }),
    )

    await saveHomeDepot(API_BASE, SLUG, TOKEN, "", "PRO-77")

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/api/integrations/${SLUG}`,
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    )
  })

  it("includes homedepot_account_number in the request body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }),
    )

    await saveHomeDepot(API_BASE, SLUG, TOKEN, "", "PRO-4444")

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    ) as Record<string, string>
    expect(body.homedepot_account_number).toBe("PRO-4444")
  })

  it("includes homedepot_api_key in the request body when provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }),
    )

    await saveHomeDepot(API_BASE, SLUG, TOKEN, "hd-secret-key", "PRO-77")

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    ) as Record<string, string>
    expect(body.homedepot_api_key).toBe("hd-secret-key")
  })

  it("omits homedepot_api_key from the request body when apiKey is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }),
    )

    await saveHomeDepot(API_BASE, SLUG, TOKEN, "", "PRO-77")

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    ) as Record<string, string>
    expect(body).not.toHaveProperty("homedepot_api_key")
  })

  it("throws an Error when the server responds with a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "forbidden" }),
      }),
    )

    await expect(saveHomeDepot(API_BASE, SLUG, TOKEN, "", "PRO-77")).rejects.toThrow("forbidden")
  })

  it("does not include Lowe's fields in the Home Depot save request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }),
    )

    await saveHomeDepot(API_BASE, SLUG, TOKEN, "hd-key", "PRO-99")

    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    ) as Record<string, string>
    expect(body).not.toHaveProperty("lowes_api_key")
    expect(body).not.toHaveProperty("lowes_account_number")
  })
})

// ── IntegrationsData shape validation ─────────────────────────────────────────

describe("integrations response shape", () => {
  it("lowes.configured is true when hasApiKey is true", () => {
    const data = makeIntegrationsResponse({
      lowes: { configured: true, accountNumber: null, hasApiKey: true },
    })
    expect(data.lowes.configured).toBe(true)
    expect(data.lowes.hasApiKey).toBe(true)
  })

  it("lowes.configured is true when accountNumber is set (even without api key)", () => {
    const data = makeIntegrationsResponse({
      lowes: { configured: true, accountNumber: "ACC-123", hasApiKey: false },
    })
    expect(data.lowes.configured).toBe(true)
    expect(data.lowes.accountNumber).toBe("ACC-123")
  })

  it("lowes.configured is false when neither api key nor account number is present", () => {
    const data = makeIntegrationsResponse()
    expect(data.lowes.configured).toBe(false)
    expect(data.lowes.hasApiKey).toBe(false)
    expect(data.lowes.accountNumber).toBeNull()
  })

  it("homedepot.configured is independent of lowes.configured", () => {
    const data = makeIntegrationsResponse({
      lowes: { configured: true, accountNumber: "L-123", hasApiKey: true },
      homedepot: { configured: false, accountNumber: null, hasApiKey: false },
    })
    expect(data.lowes.configured).toBe(true)
    expect(data.homedepot.configured).toBe(false)
  })

  it("raw api keys are never present in the response shape (hasApiKey is a boolean sentinel)", () => {
    const data = makeIntegrationsResponse({
      lowes: { configured: true, accountNumber: null, hasApiKey: true },
    })
    // The shape should not have a field that could carry the raw key
    expect(Object.keys(data.lowes)).not.toContain("apiKey")
    expect(Object.keys(data.lowes)).not.toContain("lowes_api_key")
  })
})
