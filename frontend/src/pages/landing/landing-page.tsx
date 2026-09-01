import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { LandingNavbar } from "./landing-navbar";
import { Hero } from "./sections/hero";
import { JourneyStrip } from "./sections/journey-strip";
import { Features } from "./sections/features";
import { Analytics } from "./sections/analytics";
import { QrSection } from "./sections/qr-section";
import { DomainsSection } from "./sections/domains-section";
import { HowItWorks } from "./sections/how-it-works";
import { PricingPreview } from "./sections/pricing-preview";
import { FinalCta } from "./sections/final-cta";
import { Footer } from "./sections/footer";

/* Sections carry scroll-mt-* so they land below the fixed navbar. */
function useSectionHashScroll() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    /* location.key changes on every navigation, so re-clicking a section
       link scrolls again even when the hash is unchanged. */
  }, [location]);
}

function LandingPage() {
  useSectionHashScroll();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>
        <Hero />
        <JourneyStrip />
        <Features />
        <Analytics />
        <QrSection />
        <DomainsSection />
        <HowItWorks />
        <PricingPreview />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

export { LandingPage };
