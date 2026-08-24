import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, MoveRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

const links = [
  { label: "Product", href: "/#product", id: "product" },
  { label: "Analytics", href: "/#analytics", id: "analytics" },
  { label: "How it works", href: "/#how-it-works", id: "how-it-works" },
  { label: "Pricing", href: "/pricing", id: null },
];

/* Scroll-spy via IntersectionObserver — no scroll listeners, no per-frame work */
function useActiveSection(): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const ids = links.map((l) => l.id).filter((id): id is string => !!id);
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let found: string | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            found = entry.target.id;
            break;
          }
        }
        setActive(found);
      },
      { rootMargin: "-38% 0px -52% 0px" },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return active;
}

/**
 * Navbar-only CTA: a framed ember plate. Copper hairline frame over a
 * dark ember-tinted surface, slug typography, and an arrow that eases
 * forward on hover. Distinct from the solid site-wide primary while
 * speaking the same Ink & Ember language.
 */
function NavbarCta() {
  return (
    <span className="group/cta relative inline-flex h-8 cursor-pointer items-center gap-2 overflow-hidden rounded-md border border-brand/40 bg-brand/[0.09] px-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-foreground transition-[background-color,border-color,box-shadow] duration-200 hover:border-brand/75 hover:bg-brand/[0.16] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/70">
      {/* lower ember rule, drawn on hover */}
      <span
        aria-hidden="true"
        className="absolute right-2.5 bottom-[5px] left-3 h-px origin-left scale-x-0 bg-brand/80 transition-transform duration-300 ease-out group-hover/cta:scale-x-100"
      />
      Get started
      <MoveRight
        className="size-3.5 text-brand transition-transform duration-200 ease-out group-hover/cta:translate-x-0.5"
        aria-hidden="true"
      />
    </span>
  );
}

function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const activeSection = useActiveSection();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled || open
          ? "border-b border-border bg-background/80 backdrop-blur-sm"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />

        {/* quiet index nav: ember position dot marks the live section */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map((link) => {
            const isActive = link.id !== null && activeSection === link.id;
            return (
              <Link
                key={link.label}
                to={link.href}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "nav-rule flex items-center gap-1.5 text-[13px] transition-colors",
                  isActive ? "text-foreground" : "text-fg-secondary hover:text-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1 rounded-full bg-brand transition-[transform,opacity] duration-200",
                    isActive ? "scale-100 opacity-100" : "scale-0 opacity-0",
                  )}
                />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <Link
            to="/pricing"
            className="nav-rule text-[13px] text-fg-secondary transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link to="/pricing">
            <NavbarCta />
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-md text-fg-secondary transition-colors hover:bg-elevated hover:text-foreground md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-300 md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <nav
            aria-label="Mobile"
            className="flex flex-col gap-1 border-t border-border px-5 py-4"
          >
            {links.map((link) => {
              const isActive = link.id !== null && activeSection === link.id;
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2.5 text-[15px] transition-colors hover:bg-elevated",
                    isActive ? "text-foreground" : "text-fg-secondary hover:text-foreground",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1 rounded-full bg-brand transition-[transform,opacity] duration-200",
                      isActive ? "scale-100 opacity-100" : "scale-0 opacity-0",
                    )}
                  />
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-3 flex gap-2">
              <Link to="/pricing" className="flex-1">
                <Button variant="outline" size="lg" className="w-full">
                  Log in
                </Button>
              </Link>
              <Link to="/pricing" className="flex-1">
                <Button size="lg" className="w-full">
                  Get started
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

export { LandingNavbar };
