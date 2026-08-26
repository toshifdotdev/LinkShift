import { Link, Route, Routes } from "react-router-dom";
import { LandingPage } from "@/pages/landing/landing-page";
import { PricingPage } from "@/pages/pricing/pricing-page";
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
import { SettingsPlaceholder } from "@/pages/app/module-placeholders";

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
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
          <Route path="settings" element={<SettingsPlaceholder />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
