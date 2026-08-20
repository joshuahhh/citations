import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ApiKeyBox from "./ApiKeyBox";
import { useApiKey } from "./lib/apiKey";
import {
  parseAuthorInput,
  searchAuthors,
  type Author,
} from "./lib/semanticScholar";

export default function Index() {
  const navigate = useNavigate();
  const [apiKey] = useApiKey();
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Author[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setError(null);
    setResults(null);
    const parsed = parseAuthorInput(input);
    if (parsed.kind === "id") {
      navigate(`/author/${parsed.authorId}`);
      return;
    }
    setBusy(true);
    try {
      const authors = await searchAuthors(parsed.query, {
        apiKey: apiKey || undefined,
      });
      if (authors.length === 1) navigate(`/author/${authors[0].authorId}`);
      else setResults(authors);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Latest Citations
      </h1>
      <p className="mt-3 leading-relaxed text-slate-600">
        Everything that has cited an author's papers, newest first. Powered by
        the Semantic Scholar API.
      </p>

      <form onSubmit={submit} className="mt-8 flex gap-2">
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Author name, Semantic Scholar author ID, or profile URL"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-sky-700 px-4 py-2 font-medium text-white shadow-sm hover:bg-sky-800 disabled:opacity-50"
        >
          {busy ? "Searching…" : "Go"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {results && results.length === 0 && (
        <p className="mt-6 text-slate-600">No authors matched that name.</p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {results.map((a) => (
            <li key={a.authorId}>
              <Link
                to={`/author/${a.authorId}`}
                className="block px-4 py-3 hover:bg-slate-50"
              >
                <div className="font-medium text-slate-900">{a.name}</div>
                <div className="text-sm text-slate-500">
                  {a.affiliations?.length
                    ? `${a.affiliations.join(", ")} · `
                    : ""}
                  {a.paperCount ?? 0} papers · {a.citationCount ?? 0} citations
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <ApiKeyBox />
      </div>
    </div>
  );
}
