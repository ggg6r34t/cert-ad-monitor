export function parseBrandTerms(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildClientQueries(name: string, brandTerms: string, max = 8): string[] {
  const dedup = new Set<string>([name.trim(), ...parseBrandTerms(brandTerms)]);
  return Array.from(dedup).filter(Boolean).slice(0, Math.max(1, max));
}

