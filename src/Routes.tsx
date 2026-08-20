import { HashRouter, Route, Routes as RRRoutes } from "react-router-dom";
import Index from "./Index";

export default function Routes() {
  return (
    <HashRouter>
      <RRRoutes>
        <Route path="/" element={<Index />} />
      </RRRoutes>
    </HashRouter>
  );
}
