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

function LandingPage() {
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
