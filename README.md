# Latest Citations

A reverse-chronological "who just cited me?" view for any [Semantic Scholar](https://www.semanticscholar.org) author.

Enter a name, an author ID, or a profile URL. The app fetches every paper by that author, then every
citation of each of those papers, merges them into one list, and sorts newest-first by publication date.

- Runs entirely in the browser — no server, no backend.
- Results are cached in `localStorage`; the header shows how stale they are and offers a refresh.
- An optional Semantic Scholar API key (stored only in your browser) raises the rate limit; without one
  the app shares the anonymous pool and backs off on 429s.
- Self-citations are excluded. Papers citing more than one of the author's works appear once, tagged
  with each work they cite.

## Develop

```sh
npm install
npm run dev
npm run typecheck
```

Pushes to `main` build and deploy to GitHub Pages (see `.github/workflows/deploy.yml`).
