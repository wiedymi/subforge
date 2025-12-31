/**
 * Normalize binary input to Uint8Array.
 */
export function toUint8Array(input: Uint8Array | ArrayBuffer): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input)
}
