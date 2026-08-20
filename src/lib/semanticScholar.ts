const API = "https://api.semanticscholar.org/graph/v1";

export type Author = {
  authorId: string;
  name: string;
  affiliations?: string[];
  paperCount?: number;
  citationCount?: number;
  homepage?: string | null;
};

export type Paper = {
  paperId: string;
  title: string;
  year: number | null;
  publicationDate: string | null;
  venue?: string;
  url?: string;
  citationCount?: number;
  isOpenAccess?: boolean;
  openAccessPdf?: { url: string } | null;
  abstract?: string | null;
  authors?: { authorId: string | null; name: string }[];
  externalIds?: Record<string, string | number> | null;
};

/** One citing paper, merged across however many of the author's papers it cites. */
export type Citation = {
  citingPaper: Paper;
  /** The author's own papers that this paper cites. */
  cites: {
    paperId: string;
    title: string;
    isInfluential: boolean;
    contexts: string[];
  }[];
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Semantic Scholar's unauthenticated pool is small and shared with every other
 * anonymous caller, so 429s are routine rather than exceptional. Back off and
 * keep trying; the caller reports progress while we wait.
 */
async function apiGet<T>(
  path: string,
  {
    apiKey,
    signal,
    onRetry,
  }: {
    apiKey?: string;
    signal?: AbortSignal;
    onRetry?: (waitMs: number) => void;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;

  let waitMs = 1500;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API + path, { headers, signal });
    if (res.ok) return (await res.json()) as T;

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 5) {
      const body = await res.text().catch(() => "");
      throw new ApiError(
        res.status === 429
          ? "Semantic Scholar is rate-limiting us. Wait a minute and try again, or add an API key."
          : `Semantic Scholar returned ${res.status}. ${body.slice(0, 200)}`,
        res.status,
      );
    }
    onRetry?.(waitMs);
    await sleep(waitMs);
    waitMs = Math.min(waitMs * 2, 20000);
  }
}

/** Pulls an author ID out of a raw ID, a semanticscholar.org URL, or a name query. */
export function parseAuthorInput(
  input: string,
): { kind: "id"; authorId: string } | { kind: "query"; query: string } {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(
    /semanticscholar\.org\/author\/(?:[^/]*\/)?(\d+)/i,
  );
  if (urlMatch) return { kind: "id", authorId: urlMatch[1] };
  if (/^\d+$/.test(trimmed)) return { kind: "id", authorId: trimmed };
  return { kind: "query", query: trimmed };
}

export async function searchAuthors(
  query: string,
  opts: { apiKey?: string; signal?: AbortSignal } = {},
) {
  const res = await apiGet<{ data: Author[] }>(
    `/author/search?query=${encodeURIComponent(query)}&fields=name,affiliations,paperCount,citationCount,homepage&limit=10`,
    opts,
  );
  return res.data ?? [];
}

export async function getAuthor(
  authorId: string,
  opts: { apiKey?: string; signal?: AbortSignal } = {},
) {
  return apiGet<Author>(
    `/author/${authorId}?fields=name,affiliations,paperCount,citationCount,homepage`,
    opts,
  );
}

const PAPER_FIELDS =
  "title,year,publicationDate,venue,url,citationCount,externalIds";

export async function getAuthorPapers(
  authorId: string,
  opts: { apiKey?: string; signal?: AbortSignal } = {},
) {
  const papers: Paper[] = [];
  let offset = 0;
  while (true) {
    const res = await apiGet<{ data: Paper[]; next?: number }>(
      `/author/${authorId}/papers?fields=${PAPER_FIELDS}&limit=100&offset=${offset}`,
      opts,
    );
    papers.push(...(res.data ?? []));
    if (res.next === undefined) break;
    offset = res.next;
  }
  return papers;
}

const CITING_FIELDS =
  "contexts,intents,isInfluential,title,year,publicationDate,venue,url,citationCount,isOpenAccess,openAccessPdf,abstract,authors,externalIds";

type CitationEdge = {
  citingPaper: Paper;
  isInfluential?: boolean;
  contexts?: string[];
};

export async function getCitations(
  paperId: string,
  opts: {
    apiKey?: string;
    signal?: AbortSignal;
    onRetry?: (waitMs: number) => void;
  } = {},
) {
  const edges: CitationEdge[] = [];
  let offset = 0;
  while (true) {
    const res = await apiGet<{ data: CitationEdge[]; next?: number }>(
      `/paper/${paperId}/citations?fields=${CITING_FIELDS}&limit=1000&offset=${offset}`,
      opts,
    );
    edges.push(...(res.data ?? []));
    if (res.next === undefined) break;
    offset = res.next;
  }
  return edges;
}

export type Progress = { done: number; total: number; label: string };

/**
 * Fetches every paper by an author, then every citation of each, merged into one
 * reverse-chronological list. Requests are sequential on purpose: the anonymous
 * rate limit punishes bursts far more than it punishes slowness.
 */
export async function fetchAllCitations(
  authorId: string,
  {
    apiKey,
    signal,
    onProgress,
  }: {
    apiKey?: string;
    signal?: AbortSignal;
    onProgress?: (p: Progress) => void;
  } = {},
): Promise<{ author: Author; papers: Paper[]; citations: Citation[] }> {
  onProgress?.({ done: 0, total: 1, label: "Looking up author…" });
  const author = await getAuthor(authorId, { apiKey, signal });

  onProgress?.({
    done: 0,
    total: 1,
    label: `Loading papers by ${author.name}…`,
  });
  const papers = await getAuthorPapers(authorId, { apiKey, signal });

  const byCiting = new Map<string, Citation>();
  const cited = papers.filter((p) => (p.citationCount ?? 0) > 0);
  let done = 0;

  for (const paper of cited) {
    onProgress?.({
      done,
      total: cited.length,
      label: `Citations of “${paper.title}”`,
    });
    const edges = await getCitations(paper.paperId, {
      apiKey,
      signal,
      onRetry: (waitMs) =>
        onProgress?.({
          done,
          total: cited.length,
          label: `Rate-limited; retrying in ${Math.round(waitMs / 1000)}s…`,
        }),
    });
    for (const edge of edges) {
      const citing = edge.citingPaper;
      if (!citing?.paperId) continue;
      // Skip self-citations by the same author.
      if (citing.authors?.some((a) => a.authorId === authorId)) continue;
      const existing = byCiting.get(citing.paperId);
      const entry = {
        paperId: paper.paperId,
        title: paper.title,
        isInfluential: !!edge.isInfluential,
        contexts: edge.contexts ?? [],
      };
      if (existing) existing.cites.push(entry);
      else
        byCiting.set(citing.paperId, { citingPaper: citing, cites: [entry] });
    }
    done++;
    onProgress?.({
      done,
      total: cited.length,
      label: `Citations of “${paper.title}”`,
    });
  }

  const citations = [...byCiting.values()].sort((a, b) =>
    sortKey(b.citingPaper).localeCompare(sortKey(a.citingPaper)),
  );
  return { author, papers, citations };
}

/** Undated papers sort to the bottom of their year. */
export function sortKey(p: Paper): string {
  if (p.publicationDate) return p.publicationDate;
  if (p.year) return `${p.year}-00-00`;
  return "0000-00-00";
}

export function formatDate(p: Paper): string {
  if (!p.publicationDate) return p.year ? String(p.year) : "no date";
  const [y, m, d] = p.publicationDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function paperLinks(p: Paper): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  if (p.url) links.push({ label: "Semantic Scholar", href: p.url });
  const doi = p.externalIds?.DOI;
  if (doi) links.push({ label: "DOI", href: `https://doi.org/${doi}` });
  const arxiv = p.externalIds?.ArXiv;
  if (arxiv)
    links.push({ label: "arXiv", href: `https://arxiv.org/abs/${arxiv}` });
  if (
    p.openAccessPdf?.url &&
    p.openAccessPdf.url !== (doi ? `https://doi.org/${doi}` : "")
  ) {
    links.push({ label: "PDF", href: p.openAccessPdf.url });
  }
  return links;
}
