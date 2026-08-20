import { useState } from "react";
import { formatDate, paperLinks, type Citation } from "./lib/semanticScholar";

export default function CitationRow({
  citation,
  showsAllPapers,
}: {
  citation: Citation;
  showsAllPapers: boolean;
}) {
  const p = citation.citingPaper;
  const [open, setOpen] = useState(false);
  const contexts = citation.cites.flatMap((c) => c.contexts);
  const influential = citation.cites.some((c) => c.isInfluential);

  return (
    <li className="py-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-medium text-slate-900">
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {p.title}
          </a>
        </h2>
        <time className="shrink-0 text-sm whitespace-nowrap text-slate-500">
          {formatDate(p)}
        </time>
      </div>

      {p.authors && p.authors.length > 0 && (
        <p className="mt-1 text-sm text-slate-600">
          {p.authors
            .slice(0, 8)
            .map((a) => a.name)
            .join(", ")}
          {p.authors.length > 8 ? ", …" : ""}
        </p>
      )}

      {p.venue && (
        <p className="mt-0.5 text-sm text-slate-500 italic">{p.venue}</p>
      )}

      {showsAllPapers && (
        <p className="mt-2 text-sm text-slate-600">
          cites{" "}
          {citation.cites.map((c, i) => (
            <span key={c.paperId}>
              {i > 0 && ", "}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                {c.title}
              </span>
            </span>
          ))}
          {influential && (
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
              influential
            </span>
          )}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {paperLinks(p).map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="text-sky-700 hover:underline"
          >
            {l.label}
          </a>
        ))}
        {(p.abstract || contexts.length > 0) && (
          <button
            className="text-slate-500 hover:underline"
            onClick={() => setOpen(!open)}
          >
            {open
              ? "less"
              : contexts.length > 0
                ? `where it cites you (${contexts.length})`
                : "abstract"}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-l-2 border-slate-200 pl-3 text-sm text-slate-600">
          {contexts.map((c, i) => (
            <p key={i} className="italic">
              “…{c}…”
            </p>
          ))}
          {p.abstract && <p>{p.abstract}</p>}
        </div>
      )}
    </li>
  );
}
