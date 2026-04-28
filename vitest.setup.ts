// Provide a working localStorage before any module (including the Zustand store) is imported.
// jsdom's localStorage can be unavailable or broken depending on the vitest worker flags.
const store: Record<string, string> = {}

const localStorageMock: Storage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, value) => {
    store[key] = String(value)
  },
  removeItem: (key) => {
    delete store[key]
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k])
  },
  key: (index) => Object.keys(store)[index] ?? null,
  get length() {
    return Object.keys(store).length
  },
}

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
})
