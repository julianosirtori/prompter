/**
 * Unique ids. `crypto.randomUUID` only exists in secure contexts, and the dev server opened
 * from a phone over the LAN (plain http) is not one, so fall back to `getRandomValues`.
 */
export const newId = (): string => {
  if (typeof crypto.randomUUID === 'function' && globalThis.isSecureContext !== false) {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};
