import { Link, Route, Routes } from "react-router-dom";
import { LandingPage } from "@/pages/landing/landing-page";
import { PricingPage } from "@/pages/pricing/pricing-page";

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="font-mono text-sm tracking-widest text-brand uppercase">404</p>
        <h1 className="font-display mt-3 text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-fg-secondary">
          The page you requested does not exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block text-sm font-medium text-fg-secondary underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
