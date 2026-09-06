import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, MoveRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";

const links = [
  { label: "Product", href: "/#product", id: "product" },
  { label: "Analytics", href: "/#analytics", id: "analytics" },
  { label: "How it works", href: "/#how-it-works", id: "how-it-works" },
  { label: "Pricing", href: "/pricing", id: null },
  { label: "Docs", href: "/docs", id: null },
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
          <ThemeToggle />
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <Link
            to="/login"
            className="nav-rule text-[13px] text-fg-secondary transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link to="/register">
            <Button
              size="sm"
              variant="outline"
              className="group/cta border-brand/40 bg-brand/[0.09] hover:border-brand/75 hover:bg-brand/[0.16]"
            >
              Get started
              <MoveRight
                className="size-3.5 text-brand transition-transform duration-200 ease-out group-hover/cta:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex size-9 items-center justify-center rounded-md text-fg-secondary transition-colors hover:bg-elevated hover:text-foreground"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
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
              <Link to="/login" className="flex-1">
                <Button variant="outline" size="lg" className="w-full">
                  Log in
                </Button>
              </Link>
              <Link to="/register" className="flex-1">
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
