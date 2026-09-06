import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { LandingPage } from "@/pages/landing/landing-page";
import { PricingPage } from "@/pages/pricing/pricing-page";
import { DocsPage } from "@/pages/docs/docs-page";
import { DocsTopicPage } from "@/pages/docs/docs-topic-page";
import { FaqPage } from "@/pages/faq/faq-page";
import { LegalPage } from "@/pages/legal/legal-page";
import { ContactPage } from "@/pages/contact/contact-page";
import { LoginPage } from "@/pages/auth/login";
import { RegisterPage } from "@/pages/auth/register";
import { ForgotPasswordPage } from "@/pages/auth/forgot-password";
import { ResetPasswordPage } from "@/pages/auth/reset-password";
import { VerifyEmailPage } from "@/pages/auth/verify-email";
import { GoogleCallbackPage } from "@/pages/auth/google-callback";
import { RequireAuth } from "@/auth/require-auth";
import { AppLayout } from "@/components/app/app-layout";
import { OverviewPage } from "@/pages/app/overview";
import { LinksPage } from "@/pages/app/links/links-page";
import { QrPage } from "@/pages/app/qr/qr-page";
import { AnalyticsPage } from "@/pages/app/analytics/analytics-page";
import { DomainsPage } from "@/pages/app/domains/domains-page";
import { BillingPage } from "@/pages/app/billing/billing-page";
import { SettingsPage } from "@/pages/app/settings/settings-page";
import { useSeo } from "@/lib/seo";


function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) return;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function NotFound() {
  useSeo({ title: "Page not found — LinkShift", robots: "noindex,nofollow" });
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-5">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-px w-[min(40rem,80%)] -translate-x-1/2 bg-gradient-to-r from-transparent via-brand/30 to-transparent"
      />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-brand/70" />
        <p className="ls-marquee justify-center">404</p>
        <h1 className="font-display mt-3 text-2xl font-semibold tracking-[-0.015em]">Page not found</h1>
        <p className="mt-2 text-sm text-fg-secondary">
          The page you requested does not exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-9 items-center rounded-md bg-brand px-4 font-mono text-[11px] font-medium tracking-[0.08em] text-primary-foreground uppercase transition-colors hover:bg-brand-hover"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/docs/:slug" element={<DocsTopicPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/privacy" element={<LegalPage slug="privacy" />} />
      <Route path="/terms" element={<LegalPage slug="terms" />} />
      <Route path="/refunds" element={<LegalPage slug="refunds" />} />
      <Route path="/shipping" element={<LegalPage slug="shipping" />} />
      <Route path="/acceptable-use" element={<LegalPage slug="acceptable-use" />} />
      <Route path="/contact" element={<ContactPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="links" element={<LinksPage />} />
          <Route path="qr" element={<QrPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="domains" element={<DomainsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
