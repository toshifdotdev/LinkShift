/*
 * Public legal & policy foundation.
 * Copy sticks to what the product verifiably does. Anything only the owner
 * can supply (legal entity, addresses, support email, refund window,
 * jurisdiction) is a `todo` block — rendered as a visible placeholder until
 * replaced.
 */

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "todo"; text: string };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  slug: string;
  route: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_UPDATED = "31 August 2026";

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "privacy",
    route: "/privacy",
    title: "Privacy Policy",
    intro:
      "What LinkShift collects, why, and how long we keep it. Written for the product as it actually works.",
    sections: [
      {
        heading: "What we collect",
        blocks: [
          {
            kind: "list",
            items: [
              "Account data — your email address, an optional display name, a hashed password if you register with email, or your Google account ID and avatar if you sign in with Google.",
              "Content you create — short links and their destinations, custom domains you verify, QR codes you design, and the optional settings on each link (expiry, password, path forwarding, app deep-linking values you provide).",
              "Scan data — when someone opens a short link we record the time, device type, browser, operating system, country and city derived from the request, the referring page, and any UTM parameters in the URL. By default the visitor's IP address is stored truncated (network-level precision only), not in full.",
              "Billing data — your plan, subscription status and payment history. Card numbers are entered into Razorpay's checkout and never touch LinkShift servers.",
            ],
          },
        ],
      },
      {
        heading: "How we use it",
        blocks: [
          {
            kind: "p",
            text: "To run the service: resolving your short links, building your analytics, enforcing your plan's limits, securing accounts, and sending transactional email (verification, password reset, receipts) through our email provider, Resend. We do not sell personal data, and we do not use visitor scan data to advertise to anyone.",
          },
        ],
      },
      {
        heading: "Cookies and local storage",
        blocks: [
          {
            kind: "p",
            text: "Signed-in users receive an HTTP-only session refresh cookie and we store your theme preference locally. Visitors clicking a short link are simply redirected; we do not place advertising or cross-site tracking cookies on the redirect hop.",
          },
        ],
      },
      {
        heading: "Who we share it with",
        blocks: [
          {
            kind: "p",
            text: "Only the processors the service needs: Razorpay for payment processing, Resend for transactional email, and Cloudinary for avatar image storage — plus the hosting and database infrastructure the service runs on. Destinations you shorten are shown to visitors who open your links, which is the point of the product.",
          },
        ],
      },
      {
        heading: "Retention",
        blocks: [
          {
            kind: "p",
            text: "Scan analytics are kept for your plan's history window — 30 days on Free up to 3 years on Pro — after which they age out of the dashboard. Account data is kept until you delete your account, which removes your profile, links, QR codes and analytics. Payment records are kept as long as law requires.",
          },
        ],
      },
      {
        heading: "Your choices",
        blocks: [
          {
            kind: "list",
            items: [
              "Update your profile, password and appearance from Settings.",
              "Delete your account from Settings; deletion is irreversible and stops all redirects.",
              "Email us with any privacy question or request using the contact details below.",
            ],
          },
        ],
      },
      {
        heading: "Security",
        blocks: [
          {
            kind: "p",
            text: "Passwords are stored hashed, session refresh tokens are hashed and delivered in HTTP-only cookies, and all traffic is served over TLS. No method of transmission is perfectly secure, but we design so that a breach of any single layer does not expose your account.",
          },
        ],
      },
      {
        heading: "Children",
        blocks: [
          {
            kind: "p",
            text: "LinkShift is not directed at children under 13, and we do not knowingly collect their data.",
          },
        ],
      },
      {
        heading: "Changes and contact",
        blocks: [
          {
            kind: "p",
            text: "If this policy changes materially we will note it on this page with a new update date. Questions and requests go to:",
          },
          { kind: "todo", text: "Support email address (e.g. support@yourdomain)." },
          { kind: "todo", text: "Operator legal name and postal address (also required on Terms and receipts)." },
          {
            kind: "todo",
            text: "Grievance officer name and contact, if required for your operating jurisdiction.",
          },
        ],
      },
    ],
  },
  {
    slug: "terms",
    route: "/terms",
    title: "Terms of Service",
    intro:
      "The agreement between you and LinkShift for using the service. Short, readable, and enforceable.",
    sections: [
      {
        heading: "The agreement",
        blocks: [
          {
            kind: "p",
            text: "These terms govern your use of LinkShift, operated by the entity named below. Creating an account or using the service means you accept them. If you use LinkShift on behalf of an organisation, you represent that you can bind it.",
          },
          { kind: "todo", text: "Operator legal name (the contracting party)." },
        ],
      },
      {
        heading: "The service",
        blocks: [
          {
            kind: "p",
            text: "LinkShift lets you create short links, custom domains, QR codes and analytics, with plan-based limits described on the pricing page. We may add, change or retire features over time; when we remove a paid capability you currently use, your then-current plan terms govern the transition.",
          },
        ],
      },
      {
        heading: "Your account",
        blocks: [
          {
            kind: "list",
            items: [
              "Provide a real, reachable email address and keep it verified.",
              "Keep your credentials secret; activity under your account is your responsibility.",
              "You must be at least 13 years old, and of legal age to contract where you live.",
            ],
          },
        ],
      },
      {
        heading: "Your content and links",
        blocks: [
          {
            kind: "p",
            text: "You own your links and destinations and are solely responsible for them. LinkShift is a routing and analytics tool: we do not review, host or endorse destination content, and visitors who follow a short link land on third-party sites outside our control. Use of links must also follow the Acceptable Use Policy.",
          },
        ],
      },
      {
        heading: "Plans, billing and cancellation",
        blocks: [
          {
            kind: "p",
            text: "Paid plans renew automatically until cancelled, via Razorpay. Upgrades apply immediately; downgrades and cycle changes start at the next period; cancellation stops future charges and access continues to the end of the paid period. Refunds follow the Refund & Cancellation Policy.",
          },
        ],
      },
      {
        heading: "Abuse, suspension and termination",
        blocks: [
          {
            kind: "p",
            text: "We may suspend or terminate accounts or individual links that violate these terms or the Acceptable Use Policy, or that threaten the service or its users. You may delete your account at any time from Settings.",
          },
        ],
      },
      {
        heading: "Disclaimers and liability",
        blocks: [
          {
            kind: "p",
            text: "The service is provided “as is”. To the maximum extent permitted by law, our aggregate liability arising out of the service is limited to the amounts you paid for it in the twelve months before the event giving rise to the claim; we are not liable for indirect or consequential losses, or for the content or availability of third-party destinations.",
          },
        ],
      },
      {
        heading: "Governing law",
        blocks: [
          { kind: "todo", text: "Governing law and courts (suggest: laws of India, courts of <city>)." },
        ],
      },
      {
        heading: "Changes and contact",
        blocks: [
          {
            kind: "p",
            text: "We may update these terms; material changes get a new update date on this page and, where practical, an email notice. Continued use after changes means acceptance.",
          },
          { kind: "todo", text: "Support email address for legal notices." },
        ],
      },
    ],
  },
  {
    slug: "refunds",
    route: "/refunds",
    title: "Refund & Cancellation Policy",
    intro:
      "How cancellation, refunds and failed international payments work for LinkShift subscriptions.",
    sections: [
      {
        heading: "Digital delivery",
        blocks: [
          {
            kind: "p",
            text: "LinkShift is a digital service. A subscription is activated immediately after Razorpay confirms payment, so there is no shipping or delivery window.",
          },
        ],
      },
      {
        heading: "Cancellation",
        blocks: [
          {
            kind: "p",
            text: "Cancel anytime from Billing in the app. Cancellation stops future renewals; access continues until the end of the period you already paid for. No partial-period credit is issued on a plain cancellation unless this policy or law says otherwise.",
          },
        ],
      },
      {
        heading: "Refunds",
        blocks: [
          {
            kind: "list",
            items: [
              "Failed, duplicate or erroneously captured charges are refunded in full.",
              "Refunds, where due, are issued through Razorpay to the original payment method.",
              "Request a refund from the contact page, including the payment ID from your receipt.",
            ],
          },
          {
            kind: "todo",
            text: "Refund window for first-time purchases (e.g. “within 7 days of the first charge”) — a business decision only the owner can set.",
          },
        ],
      },
      {
        heading: "International payments",
        blocks: [
          {
            kind: "p",
            text: "Checkout is offered in INR or USD based on your region. Your card issuer or bank may apply its own foreign-conversion fees on cross-border transactions; those are charged by the issuer, not by LinkShift. Taxes, where applicable, are stated at checkout and on receipts.",
          },
          { kind: "todo", text: "Tax/GST treatment statement once the operator's registration is settled." },
        ],
      },
      {
        heading: "Questions",
        blocks: [
          { kind: "todo", text: "Support email address for billing questions." },
        ],
      },
    ],
  },
  {
    slug: "shipping",
    route: "/shipping",
    title: "Shipping & Delivery Policy",
    intro:
      "LinkShift is a fully digital service — there is nothing to ship. This policy states what is delivered, how, and when delivery is complete.",
    sections: [
      {
        heading: "No physical goods",
        blocks: [
          {
            kind: "p",
            text: "LinkShift sells subscriptions to an online service: short links, custom domains, QR codes and analytics. We do not sell, pack or dispatch any physical product, and no shipping carriers, tracking numbers or delivery addresses are ever involved. No shipping fees are charged.",
          },
        ],
      },
      {
        heading: "Digital delivery",
        blocks: [
          {
            kind: "p",
            text: "Delivery is electronic and automatic. When Razorpay confirms a payment, your account's plan is upgraded immediately and every feature of the new plan is available the next time the dashboard loads — normally within seconds of payment.",
          },
          {
            kind: "list",
            items: [
              "Activation: your plan status changes in the app the moment the payment is confirmed.",
              "Confirmation: a receipt email is sent to your account address, and the Billing page shows the renewal date.",
              "Availability: the service is reachable worldwide over the internet; no regional fulfilment applies.",
            ],
          },
        ],
      },
      {
        heading: "When delivery is complete",
        blocks: [
          {
            kind: "p",
            text: "Delivery is complete when your dashboard shows the new plan and your links, domains and QR codes operate under its limits. Because there is no shipping window, there is no delivery estimate to miss; if your plan has not changed within a few minutes of a confirmed payment, something went wrong and we will fix it — see the contact page.",
          },
        ],
      },
      {
        heading: "If access does not arrive",
        blocks: [
          {
            kind: "p",
            text: "First check the Billing page and your receipt email. If the payment shows as captured but your plan has not changed, write to us with the payment ID from the receipt and we will reconcile it.",
          },
          { kind: "todo", text: "Support email address for delivery/billing issues." },
        ],
      },
    ],
  },
  {
    slug: "acceptable-use",
    route: "/acceptable-use",
    title: "Acceptable Use Policy",
    intro:
      "The line between a short-link tool and an abuse tool. Links that cross it are removed.",
    sections: [
      {
        heading: "Prohibited use",
        blocks: [
          {
            kind: "list",
            items: [
              "Spam: mass unsolicited linking in messages, comments or reviews.",
              "Malware, phishing, credential harvesting, or destinations that deceive visitors about what they will get.",
              "Illegal goods, services or content in the destination's jurisdiction or the operator's.",
              "Infringing someone else's rights — trademark, copyright, privacy — through a link or slug.",
              "Artificially inflating scan counts with bots or paid traffic to game analytics or plan limits.",
              "Circumventing a suspension, block, or plan limit.",
            ],
          },
        ],
      },
      {
        heading: "Enforcement",
        blocks: [
          {
            kind: "p",
            text: "We may disable individual links, pause redirects, or suspend accounts that break this policy, without notice where notice would cause harm. Repeat or serious abuse ends the account.",
          },
        ],
      },
      {
        heading: "Reporting abuse",
        blocks: [
          {
            kind: "p",
            text: "To report a LinkShift short link that violates this policy, send the link itself and what is wrong with it to the contact address below; we act on credible reports promptly.",
          },
          { kind: "todo", text: "Abuse reporting email address (e.g. abuse@yourdomain)." },
        ],
      },
    ],
  },
  {
    slug: "contact",
    route: "/contact",
    title: "Contact",
    intro:
      "How to reach the humans behind LinkShift — support, billing, privacy and abuse reports.",
    sections: [
      {
        heading: "Before you write",
        blocks: [
          {
            kind: "p",
            text: "Most product questions are already answered in the Documentation and the FAQ. Billing details live on your Billing page; every receipt email carries the payment ID we need to trace a charge.",
          },
        ],
      },
      {
        heading: "Writing to us",
        blocks: [
          {
            kind: "list",
            items: [
              "Billing: include the payment ID from your receipt.",
              "Abuse: include the short link and what is wrong with it.",
              "Privacy: include the account email the request concerns.",
            ],
          },
          { kind: "todo", text: "Support email address." },
          { kind: "todo", text: "Postal address and operator legal name." },
          { kind: "todo", text: "Response-time target (e.g. “within 2 business days”)." },
        ],
      },
    ],
  },
];

export function findLegalDoc(slug: string) {
  return LEGAL_DOCS.find((doc) => doc.slug === slug);
}
