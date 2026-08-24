import { Link } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/brand/logo";

const productLinks = [
  { label: "Product", href: "/#product" },
  { label: "Analytics", href: "/#analytics" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <Container>
        <div className="grid gap-10 py-14 md:grid-cols-[1.2fr_1fr] md:gap-8">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-muted">
              Precise link shortening, QR codes and analytics — built for people who
              care about every click.
            </p>
          </div>

          <nav aria-label="Footer" className="md:justify-self-end">
            <p className="font-mono text-[11px] tracking-[0.16em] text-fg-muted uppercase">
              Product
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-10 gap-y-2.5 sm:flex sm:flex-col">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-fg-secondary transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-border py-6 sm:flex-row sm:items-center">
          <p className="font-mono text-xs text-fg-muted">© {new Date().getFullYear()} LinkShift</p>
          <p className="flex items-center gap-2 font-mono text-xs text-fg-muted">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
            All systems operational
          </p>
        </div>
      </Container>
    </footer>
  );
}

export { Footer };
