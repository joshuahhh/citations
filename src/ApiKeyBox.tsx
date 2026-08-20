import { useState } from "react";
import { useApiKey } from "./lib/apiKey";

export default function ApiKeyBox() {
  const [apiKey, setApiKey] = useApiKey();
  const [open, setOpen] = useState(false);

  return (
    <div className="text-xs text-slate-500">
      <button
        className="underline underline-offset-2 hover:text-slate-800"
        onClick={() => setOpen(!open)}
      >
        {apiKey ? "API key saved in this browser" : "Add an API key (optional)"}
      </button>
      {open && (
        <div className="mt-2 max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 leading-relaxed">
            Without a key we share Semantic Scholar's anonymous rate limit with
            everyone else, so big authors can be slow. A free key from{" "}
            <a
              className="text-sky-700 underline"
              href="https://www.semanticscholar.org/product/api#api-key"
              target="_blank"
              rel="noreferrer"
            >
              semanticscholar.org
            </a>{" "}
            is stored only in this browser and sent only to their API.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value.trim())}
              placeholder="x-api-key"
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
            />
            {apiKey && (
              <button
                className="rounded-md border border-slate-300 bg-white px-2 py-1"
                onClick={() => setApiKey("")}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
