/**
 * Development-only network delay for verifying loading states.
 * Active ONLY in dev builds AND when the page URL contains `?slow`.
 * Inert in production and in normal dev usage.
 */
export async function devSlow(ms = 1400): Promise<void> {
  if (!import.meta.env.DEV) return;
  if (!new URLSearchParams(window.location.search).has("slow")) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
