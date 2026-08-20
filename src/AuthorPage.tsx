import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ApiKeyBox from "./ApiKeyBox";
import CitationRow from "./CitationRow";
import { useApiKey } from "./lib/apiKey";
import {
  formatAge,
  readCache,
  writeCache,
  type CachedResult,
} from "./lib/cache";
import { fetchAllCitations, type Progress } from "./lib/semanticScholar";

export default function AuthorPage() {
  const { authorId = "" } = useParams();
  const [apiKey] = useApiKey();

  const [result, setResult] = useState<CachedResult | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const abortRef = useRef<AbortController | null>(null);

  async function load() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setError(null);
    setProgress({ done: 0, total: 1, label: "Starting…" });
    try {
      const fresh = await fetchAllCitations(authorId, {
        apiKey: apiKey || undefined,
        signal: ac.signal,
        onProgress: setProgress,
      });
      if (ac.signal.aborted) return;
      writeCache(authorId, fresh);
      setResult({ ...fresh, fetchedAt: Date.now() });
    } catch (err) {
      if (ac.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ac.signal.aborted) setProgress(null);
    }
  }

  useEffect(() => {
    const cached = readCache(authorId);
    setResult(cached);
    setFilter("all");
    if (!cached) load();
    return () => abortRef.current?.abort();
    // Re-run only when the author changes; an API key change shouldn't refetch.
  }, [authorId]);

  const citations = useMemo(() => {
    if (!result) return [];
    if (filter === "all") return result.citations;
    return result.citations.filter((c) =>
      c.cites.some((p) => p.paperId === filter),
    );
  }, [result, filter]);

  const citedPapers = useMemo(() => {
    if (!result) return [];
    const counts = new Map<string, number>();
    for (const c of result.citations)
      for (const p of c.cites)
        counts.set(p.paperId, (counts.get(p.paperId) ?? 0) + 1);
    return result.papers
      .filter((p) => counts.has(p.paperId))
      .map((p) => ({ ...p, count: counts.get(p.paperId)! }))
      .sort((a, b) => b.count - a.count);
  }, [result]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link to="/" className="text-sm text-sky-700 underline">
        ← another author
      </Link>

      <header className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {result ? result.author.name : `Author ${authorId}`}
        </h1>
        <a
          className="text-sm text-sky-700 underline"
          href={`https://www.semanticscholar.org/author/${authorId}`}
          target="_blank"
          rel="noreferrer"
        >
          Semantic Scholar profile
        </a>
      </header>

      {result && (
        <p className="mt-1 text-sm text-slate-500">
          {result.citations.length} citing papers across {citedPapers.length} of{" "}
          {result.papers.length} papers · updated {formatAge(result.fetchedAt)}{" "}
          ·{" "}
          <button
            className="underline hover:text-slate-800"
            onClick={load}
            disabled={!!progress}
          >
            refresh
          </button>
        </p>
      )}

      {progress && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm text-slate-700">{progress.label}</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-sky-600 transition-[width] duration-300"
              style={{
                width: `${progress.total ? (100 * progress.done) / progress.total : 0}%`,
              }}
            />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {progress.done} / {progress.total} papers
            {result ? " · showing cached results below" : ""}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          <button className="mt-2 underline" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {result && citedPapers.length > 1 && (
        <div className="mt-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="all">
              All papers ({result.citations.length} citations)
            </option>
            {citedPapers.map((p) => (
              <option key={p.paperId} value={p.paperId}>
                {p.title} ({p.count})
              </option>
            ))}
          </select>
        </div>
      )}

      {result && (
        <ol className="mt-6 divide-y divide-slate-200 border-t border-slate-200">
          {citations.map((c) => (
            <CitationRow
              key={c.citingPaper.paperId}
              citation={c}
              showsAllPapers={filter === "all"}
            />
          ))}
        </ol>
      )}

      {result && citations.length === 0 && !progress && (
        <p className="mt-6 text-slate-600">No citations found.</p>
      )}

      <div className="mt-10">
        <ApiKeyBox />
      </div>
    </div>
  );
}
