// Typed wrapper around `localStorage` with a JSON-safe in-memory fallback for
// environments where it is unavailable (SSR, Node-based tests) or throws on
// access (Safari private mode, some embedded webviews). All values are
// serialized as JSON, so consumers should pass plain data — no Map, Date, or
// class instances unless they handle (de)hydration themselves.

interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function createMemoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) ?? null) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function detectBackend(): StorageBackend {
  // Two failure modes to guard against:
  //   1. `localStorage` is undefined (SSR, Node test runners).
  //   2. `localStorage` exists but throws on read/write (private-mode Safari,
  //      sandboxed iframes, blocked third-party storage).
  // Probe with a write/remove pair; if either step throws, fall back to
  // memory so callers never crash on a storage access.
  try {
    if (typeof localStorage === "undefined") {
      return createMemoryBackend();
    }
    const probeKey = "__mm_storage_probe__";
    localStorage.setItem(probeKey, "1");
    localStorage.removeItem(probeKey);
    return localStorage;
  } catch {
    return createMemoryBackend();
  }
}

let backend: StorageBackend | null = null;
function getBackend(): StorageBackend {
  if (backend === null) backend = detectBackend();
  return backend;
}

export const storage = {
  /**
   * Reads `key` from storage and JSON-parses it as `T`. Returns `null` when
   * the key is missing OR when the stored value is not valid JSON — callers
   * always get a single sentinel for "no usable value here" without having
   * to handle parse errors themselves.
   */
  get<T>(key: string): T | null {
    const raw = getBackend().getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  /** Serializes `value` as JSON and writes it under `key`. */
  set<T>(key: string, value: T): void {
    getBackend().setItem(key, JSON.stringify(value));
  },

  /** Removes `key` if present. No-ops when the key is absent. */
  remove(key: string): void {
    getBackend().removeItem(key);
  },
};

// Exposed for tests: lets the harness reset the cached backend after stubbing
// or removing `localStorage`. Not part of the production surface.
export function __resetStorageBackendForTests(): void {
  backend = null;
}
