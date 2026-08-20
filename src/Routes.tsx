import { HashRouter, Route, Routes as RRRoutes } from "react-router-dom";
import AuthorPage from "./AuthorPage";
import Index from "./Index";

export default function Routes() {
  return (
    <HashRouter>
      <RRRoutes>
        <Route path="/" element={<Index />} />
        <Route path="/author/:authorId" element={<AuthorPage />} />
      </RRRoutes>
    </HashRouter>
  );
}
