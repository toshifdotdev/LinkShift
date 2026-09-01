import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { PublicShell } from "@/components/public-shell";
import { Kicker } from "@/pages/landing/components/reveal";

interface FaqEntry {
  q: string;
  a: string;
}

interface FaqGroup {
  title: string;
  index: string;
  entries: FaqEntry[];
}

const FAQ_GROUPS: FaqGroup[] = [
  {
    index: "01",
    title: "General",
    entries: [
      {
        q: "What is LinkShift?",
        a: "A link shortener with a full desk behind it: custom short links on your own domains, styled QR codes, and per-link analytics. Built for people who care where every click comes from.",
      },
      {
        q: "Is there a free plan?",
        a: "Yes. Free includes 50 links, 2,500 redirects a month, 10 QR codes a month and 30 days of analytics — no card required to start.",
      },
      {
        q: "Do my short links expire?",
        a: "Only if you want them to. Expiry is an optional setting per link; otherwise a link keeps redirecting for as long as your account exists.",
      },
    ],
  },
  {
    index: "02",
    title: "Links & QR",
    entries: [
      {
        q: "Can I change where a link points?",
        a: "Yes — edit the destination from the link's action menu. Plans include a monthly allowance of destination changes (3 on Free, up to unlimited on Pro).",
      },
      {
        q: "Can I password-protect a link?",
        a: "Yes. Visitors see an unlock page and only continue after entering the password. Forwarded paths and query parameters survive the unlock.",
      },
      {
        q: "Do QR codes keep working if I change the link?",
        a: "A QR code encodes your short link, not the destination — so editing the destination keeps every printed code working.",
      },
      {
        q: "What does the QR allowance cover?",
        a: "Generation, not scanning. Codes you have saved keep scanning forever; the monthly allowance (10 Free / 100 Starter / unlimited above) limits new renders.",
      },
    ],
  },
  {
    index: "03",
    title: "Domains",
    entries: [
      {
        q: "Can I use my own domain?",
        a: "From Starter upward. Add the hostname, point a CNAME at the target LinkShift shows you, verify, and it appears in the create-link picker. Free accounts use the shared go.linkshift.in domain.",
      },
      {
        q: "How long does verification take?",
        a: "Verification itself is instant once DNS has propagated. Propagation usually takes minutes but can take a few hours depending on your provider; you can retry at any time.",
      },
    ],
  },
  {
    index: "04",
    title: "Analytics",
    entries: [
      {
        q: "What counts as a click?",
        a: "One completed redirect through your short link. The daily chart, device and country breakdowns all derive from completed redirects.",
      },
      {
        q: "How far back does analytics go?",
        a: "Your plan sets the window: 30 days on Free, 180 on Starter, 365 on Creator and 3 years on Pro. The range picker shows longer windows locked with the plan that unlocks them.",
      },
      {
        q: "Can I export my data?",
        a: "CSV export of a link's analytics is included on Creator, Pro and Enterprise plans.",
      },
    ],
  },
  {
    index: "05",
    title: "Billing & plans",
    entries: [
      {
        q: "How are payments processed?",
        a: "Through Razorpay. LinkShift never sees or stores your card number; receipts and renewal dates appear on the Billing waybill.",
      },
      {
        q: "Can I change plans at any time?",
        a: "Yes. Upgrades apply immediately; the Billing page always shows your current plan and next renewal date.",
      },
      {
        q: "What happens if I hit a limit?",
        a: "Redirect allowances include grace headroom so links don't stop cold at the edge of a quota — you'll see an in-app notice with the upgrade path instead.",
      },
    ],
  },
  {
    index: "06",
    title: "Account & security",
    entries: [
      {
        q: "Can I use Google sign-in and a password together?",
        a: "Yes. A Google-connected account can add a password from Settings, and either method signs you in afterwards.",
      },
      {
        q: "How do I delete my account?",
        a: "From Settings, with a confirmation step. Deletion removes your profile, links, QR codes and analytics and cannot be undone — export anything you need first.",
      },
    ],
  },
];

function FaqPage() {
  return (
    <PublicShell>
      <Container>
        <header className="max-w-2xl">
          <Kicker>FAQ</Kicker>
          <h1 className="font-display mt-5 text-balance text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.06] font-medium tracking-[-0.02em]">
            Asked often,
            <br />
            <span className="text-fg-muted">answered plainly.</span>
          </h1>
          <p className="text-pretty mt-5 text-[15px] leading-relaxed text-fg-secondary">
            The short version of everything. For the long version, see the{" "}
            <Link to="/docs" className="text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:text-brand-hover">
              documentation
            </Link>
            .
          </p>
        </header>

        <div className="mt-14 grid gap-x-12 gap-y-12 lg:grid-cols-2">
          {FAQ_GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <p className="ls-marquee">
                {group.index} · {group.title}
              </p>
              <div className="mt-4 border-t border-border">
                {group.entries.map((entry) => (
                  <details key={entry.q} className="group border-b border-border-subtle py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                      {entry.q}
                      <ChevronDown
                        className="size-4 shrink-0 text-fg-muted transition-transform duration-200 group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="text-pretty mt-3 text-sm leading-relaxed text-fg-secondary">
                      {entry.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </PublicShell>
  );
}

export { FaqPage };
