/**
 * Zero out a Uint8Array in-place to reduce the chance of sensitive data lingering in memory.
 * Note: This is a best-effort utility; JS runtimes may copy/optimize buffers.
 */
export function zeroize(buf: Uint8Array): void {
  for (let i = 0; i < buf.length; i++) buf[i] = 0;
}
