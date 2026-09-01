import { Link } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { Lamp } from "@/components/ui/lamp";
import { Logo } from "@/components/brand/logo";

const productLinks = [
  { label: "Product", href: "/#product" },
  { label: "Analytics", href: "/#analytics" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

const resourceLinks = [
  { label: "Documentation", href: "/docs" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Refund & Cancellation", href: "/refunds" },
  { label: "Shipping & Delivery", href: "/shipping" },
  { label: "Acceptable Use", href: "/acceptable-use" },
];

function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <Container>
        <div className="grid gap-10 py-14 md:grid-cols-[1.2fr_1fr] md:gap-8">
          <div>
            <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-muted">
            Precise link shortening, QR codes, and analytics. Built for people who
            care about every click.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:justify-self-end">
          <div>
            <p className="ls-marquee">Product</p>
            <ul className="mt-4 flex flex-col gap-2.5">
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
          </div>
          <div>
            <p className="ls-marquee">Resources</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {resourceLinks.map((link) => (
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
          </div>
          <div>
            <p className="ls-marquee">Legal</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {legalLinks.map((link) => (
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
          </div>
        </nav>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-border py-6 sm:flex-row sm:items-center">
        <p className="font-mono text-xs text-fg-muted">© {new Date().getFullYear()} LinkShift</p>
        <Lamp tone="success" pulse>
          Live. Self-healing.
        </Lamp>
      </div>
      </Container>
    </footer>
  );
}

export { Footer };
