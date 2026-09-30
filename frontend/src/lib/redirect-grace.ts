

export function graceLabel(
  used: number | null,
  cap: number | null,
  graceCap: number | null | undefined,
): string | undefined {
  if (used === null || cap === null || cap === 0) return undefined;
  if (!graceCap || graceCap <= cap) return undefined;
  if (used < cap) return undefined;

  if (used >= graceCap) {
    return `${used.toLocaleString()} / ${graceCap.toLocaleString()} — grace used`;
  }
  return `${used.toLocaleString()} / ${graceCap.toLocaleString()} — grace`;
}