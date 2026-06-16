import type { UserId } from "../types/identity";

// ID helpers shared across stores and mock services. Kept dependency-free so
// these can be used from any layer (UI, hooks, services) without dragging in
// a uuid package.

/**
 * Generates a fresh ID. Prefers `crypto.randomUUID()` for an RFC 4122 v4 in a
 * single call. When `randomUUID` is unavailable (older browsers, certain
 * sandboxed runtimes) we synthesize a v4-shaped string from `getRandomValues`.
 * As a last resort — environments without WebCrypto at all — we fall back to
 * `Math.random`. The fallback is documented as non-cryptographic; callers who
 * need security guarantees (auth tokens, session keys) should not use this.
 */
export function newId(): string {
  const c: Crypto | undefined =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return v4FromBytes(bytes);
  }
  return v4FromBytes(mathRandomBytes16());
}

function mathRandomBytes16(): Uint8Array {
  const buf = new Uint8Array(16);
  // Non-cryptographic fallback. Acceptable for client-only IDs where
  // collision probability is the only concern.
  for (let i = 0; i < 16; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return buf;
}

function v4FromBytes(bytes: Uint8Array): string {
  // RFC 4122 §4.4: pin the version nibble to 4 and the variant bits to 10.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: string[] = new Array(16);
  for (let i = 0; i < 16; i++) {
    hex[i] = bytes[i].toString(16).padStart(2, "0");
  }
  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}

/**
 * Returns the two user IDs in a deterministic order. Used as the storage key
 * for `Match.userIds` so that `(a, b)` and `(b, a)` collapse to the same
 * tuple regardless of which side initiated the match.
 *
 * Comparison uses the `<` operator (UTF-16 code-unit order) rather than
 * `localeCompare` because ID equality must be locale-independent: the same
 * input pair must always produce the same output, on any user's device.
 */
export function canonicalUserPair(a: UserId, b: UserId): [UserId, UserId] {
  if (a === b) {
    throw new Error("canonicalUserPair requires two distinct user IDs");
  }
  return a < b ? [a, b] : [b, a];
}
