import type { ReactNode } from "react";
import { LandingNavbar } from "@/pages/landing/landing-navbar";
import { Footer } from "@/pages/landing/sections/footer";


function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingNavbar />
      <main className="flex-1 pt-28 pb-24 sm:pt-32">{children}</main>
      <Footer />
    </div>
  );
}

export { PublicShell };
