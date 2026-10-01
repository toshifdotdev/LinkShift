import { useLocation } from "react-router-dom";
import App from "@/App";
import { ErrorBoundary } from "@/components/ui/error-boundary";

/**
 * Root-level crash guard.
 *
 * The boundary already existed but was only mounted around the authenticated
 * app layout, so a render error on any public page — landing, pricing, docs,
 * status — tore down the whole tree and left a blank page. That is the worst
 * possible failure on a marketing surface: a visitor sees nothing, and so does
 * a crawler.
 *
 * `resetKey` carries the location so navigating after a crash clears the error
 * and renders the destination, rather than making every later route replay the
 * same failure until a manual reload.
 *
 * Lives in its own module because `main.tsx` is the bootstrap and should not
 * define components.
 */
export function AppWithCrashGuard() {
  const { pathname } = useLocation();

  return (
    <ErrorBoundary resetKey={pathname}>
      <App />
    </ErrorBoundary>
  );
}
