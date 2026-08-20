import type { Author, Citation, Paper } from "./semanticScholar";

export type CachedResult = {
  fetchedAt: number;
  author: Author;
  papers: Paper[];
  citations: Citation[];
};

const key = (authorId: string) => `s2-citations:${authorId}`;

export function readCache(authorId: string): CachedResult | null {
  try {
    const raw = localStorage.getItem(key(authorId));
    return raw ? (JSON.parse(raw) as CachedResult) : null;
  } catch {
    return null;
  }
}

export function writeCache(
  authorId: string,
  result: Omit<CachedResult, "fetchedAt">,
) {
  try {
    localStorage.setItem(
      key(authorId),
      JSON.stringify({ ...result, fetchedAt: Date.now() }),
    );
  } catch {
    // Quota exceeded for a very prolific author — losing the cache is fine.
  }
}

export function formatAge(ms: number): string {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
