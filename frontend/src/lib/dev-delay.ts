
export async function devSlow(ms = 1400): Promise<void> {
  if (!import.meta.env.DEV) return;
  if (!new URLSearchParams(window.location.search).has("slow")) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
