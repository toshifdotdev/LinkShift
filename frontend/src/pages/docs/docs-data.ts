/*
 * Documentation information architecture.
 * Categories → topics → blocks. Copy stays factual and short; media blocks
 * reference real product captures where one exists (see MediaBlock in
 * docs-topic-page.tsx) and fall back to a labeled placeholder slot otherwise.
 */

export type DocBlock =
  | { kind: "p"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "note"; text: string }
  | { kind: "example"; lines: string[] }
  | { kind: "media"; label: string };

export interface DocTopic {
  slug: string;
  title: string;
  summary: string;
  body: DocBlock[];
}

export interface DocCategory {
  slug: string;
  index: string;
  title: string;
  blurb: string;
  topics: DocTopic[];
}

export const DOC_CATEGORIES: DocCategory[] = [
  {
    slug: "getting-started",
    index: "01",
    title: "Getting started",
    blurb: "From account to first tracked click in a few minutes.",
    topics: [
      {
        slug: "create-your-account",
        title: "Create your account",
        summary: "Sign up with email or Google, verify your address, land on your desk.",
        body: [
          {
            kind: "p",
            text: "You can join LinkShift with an email address and password, or in one step with your Google account. Every new account starts on the Free plan — no card required.",
          },
          {
            kind: "steps",
            items: [
              "Choose “Get started” and enter your email and password, or continue with Google.",
              "Check your inbox and follow the verification link so your account can send and receive email.",
              "You land on the Overview desk — your links, recent clicks and account status at a glance.",
            ],
          },
          {
            kind: "note",
            text: "Verification emails can take a minute. If nothing arrives, use “resend” from the verification page before retrying.",
          },
        ],
      },
      {
        slug: "shorten-your-first-link",
        title: "Shorten your first link",
        summary: "Paste a destination, get a short code, share it anywhere.",
        body: [
          {
            kind: "p",
            text: "A LinkShift route is a short code on a domain (for example go.linkshift.in/spring-sale) that redirects to your destination URL. Every visit is recorded as a click.",
          },
          {
            kind: "steps",
            items: [
              "Open Links and choose “New link”.",
              "Paste the destination URL. Optionally pick a custom slug if your plan includes them.",
              "Create the link, then copy it from the ledger and share it.",
            ],
          },
          {
            kind: "media",
            label: "The create-link dialog with destination, slug preview and domain picker",
          },
        ],
      },
      {
        slug: "reading-your-dashboard",
        title: "Read your dashboard",
        summary: "What the Overview and Analytics instruments actually mean.",
        body: [
          {
            kind: "p",
            text: "Overview is your desk: total links, active links, total clicks and your most-clicked routes. Analytics goes deeper per link — clicks over time, devices, countries, clients and traffic sources depending on your plan.",
          },
          {
            kind: "p",
            text: "A “click” is one completed redirect through your short link. Bots and failed scans are not counted as clicks.",
          },
          {
            kind: "note",
            text: "Each plan keeps a different history window — 30 days on Free up to 3 years on Pro. See “Analytics history & ranges”.",
          },
        ],
      },
    ],
  },
  {
    slug: "links",
    index: "02",
    title: "Links & routing",
    blurb: "Slugs, destinations, forwarding and app deep linking.",
    topics: [
      {
        slug: "managing-links",
        title: "Manage and protect links",
        summary: "Edit destinations, set expiry, and password-protect a route.",
        body: [
          {
            kind: "p",
            text: "Every link can be edited from the ledger: change its destination, pause it with an expiry date, or put a password in front of it. Visitors to a protected link see an unlock page before they continue.",
          },
          {
            kind: "steps",
            items: [
              "Open the link's action menu in the Links ledger.",
              "Edit the destination, set an expiry, or enable a password.",
              "Save — changes apply to the next visitor immediately.",
            ],
          },
          {
            kind: "note",
            text: "Plans include a monthly allowance of destination changes (3 on Free up to unlimited on Pro). The counter resets with your billing cycle.",
          },
        ],
      },
      {
        slug: "custom-slugs",
        title: "Custom slugs",
        summary: "Readable codes like /spring-sale instead of generated ones.",
        body: [
          {
            kind: "p",
            text: "A slug is the readable tail of your short link. Free accounts receive generated codes; paid plans include a monthly allowance of custom slugs (5 on Starter, 25 on Creator, unlimited on Pro).",
          },
          {
            kind: "p",
            text: "Slugs must be unique on their domain. If a slug is taken, the dialog tells you before you create the link.",
          },
        ],
      },
      {
        slug: "path-forwarding",
        title: "Path & query forwarding",
        summary:
          "One short link that carries whatever path and query a visitor appends through to your destination. URL forwarding — not app opening.",
        body: [
          {
            kind: "p",
            text: "Path Forwarding lets a short link preserve anything a visitor adds after the slug — extra path segments and query parameters — and append it to your destination URL. It is pure URL forwarding: no app is involved, and it behaves the same on every device.",
          },
          {
            kind: "example",
            lines: [
              "Your link       https://go.linkshift.in/my-link",
              "Visitor opens   https://go.linkshift.in/my-link/products/123?ref=instagram",
              "Destination     https://example.com/base/products/123?ref=instagram",
            ],
          },
          {
            kind: "p",
            text: "Use it when one campaign link should reach many pages — a whole shop section, docs tree or event schedule — or when you share links with tracking parameters (?ref=, ?utm_source=) that must survive the hop.",
          },
          {
            kind: "p",
            text: "On Android, iOS and desktop alike the visitor is simply redirected to the composed URL. If the link also has Mobile App Deep Linking enabled, the same appended tail is handed into the app target instead.",
          },
          {
            kind: "note",
            text: "Path Forwarding is a Pro and Enterprise capability. On lower plans the control is replaced by an upgrade explanation, and the API enforces the same rule.",
          },
          {
            kind: "p",
            text: "Common mistakes: enabling forwarding when the destination has no matching routes (visitors land on 404s); expecting LinkShift to map or rewrite paths (the tail is appended verbatim); assuming query parameters are merged (they are forwarded exactly as typed).",
          },
          {
            kind: "p",
            text: "Limits to understand: the appended path and query are passed through as-is, so your destination remains responsible for validating whatever it receives. LinkShift does not inspect or sanitize the destination's response.",
          },
        ],
      },
      {
        slug: "mobile-app-deep-linking",
        title: "Mobile app deep linking",
        summary:
          "Try to open your mobile app when a visitor arrives on a phone — with a website or store fallback when it isn't installed.",
        body: [
          {
            kind: "p",
            text: "Mobile App Deep Linking is for links that should open a mobile application instead of a web page when the visitor is on a supported device. Desktop visitors always continue to the normal web destination.",
          },
          {
            kind: "p",
            text: "You provide the identifiers yourself: LinkShift cannot discover a third-party app's scheme or package from a website URL. These values come from your own app's configuration or the developer who built it.",
          },
          {
            kind: "steps",
            items: [
              "App URI scheme (required) — the custom scheme your app registers, such as myapp for myapp:// links.",
              "Android package — your application ID, such as com.example.app. Enables the native handoff in Chrome on Android.",
              "In-app path (optional) — the screen to open inside the app; any path the visitor appends is placed after it.",
              "App Store / Play Store URLs (optional) — offered when the app cannot be opened or is not installed.",
            ],
          },
          {
            kind: "example",
            lines: [
              "App URI scheme   myapp              → opens myapp://…",
              "Android package  com.example.app",
              "In-app path      product",
              "Visitor opens    https://go.linkshift.in/my-link/product/123?ref=ads",
              "App receives     myapp://product/123?ref=ads",
            ],
          },
          {
            kind: "p",
            text: "A concrete example, purely explanatory: imagine you run the Instagram app and want one campaign link that opens your app on phones. You would enter the identifiers your app already registers — LinkShift discovers and converts nothing:",
          },
          {
            kind: "example",
            lines: [
              "App URI scheme   instagram                  → opens instagram://…",
              "Android package  com.instagram.android      → Chrome's native handoff",
              "In-app path      (empty, or a path your app documents)",
              "App Store URL    the app's App Store page   → offered if not installed",
              "Play Store URL   the app's Play page        → fallback if not installed",
            ],
          },
          {
            kind: "p",
            text: "The exact scheme, package and in-app paths depend entirely on what the target app supports — check the app's developer documentation for the real values. Linking to someone else's app only works with values its owner has published; LinkShift cannot turn an arbitrary instagram.com or youtube.com URL into an app open.",
          },
          {
            kind: "p",
            text: "Android (Chrome and other Chromium browsers): LinkShift redirects through an intent:// URL. If the app is installed, Chrome hands straight over; if not, it honors the fallback — your Play Store URL when set, otherwise the web destination.",
          },
          {
            kind: "p",
            text: "iOS and other mobile browsers: installed apps cannot be detected from the web, so the visitor sees a short LinkShift interstitial that attempts the scheme once. If the app doesn't take over within a couple of seconds, the page falls back to the website. Manual buttons — Open in app, Continue to website, and Get the app when a store URL is set — are always available.",
          },
          {
            kind: "p",
            text: "When the app is not installed, nobody is stranded: Android falls back to the store or website automatically, and the iOS interstitial continues to the website and offers the store button.",
          },
          {
            kind: "note",
            text: "Common mistakes: entering the scheme with :// (provide only the name, e.g. myapp); a scheme that doesn't exactly match what the app registers; leaving the Android package empty and wondering why Chrome shows the interstitial instead of the native handoff; testing inside in-app browsers (Instagram, WhatsApp) that block scheme opens — test in the system browser.",
          },
          {
            kind: "p",
            text: "Limits to understand: true Universal Links / Android App Links require verification files (apple-app-site-association, assetlinks.json) served from the app owner's own domain — LinkShift cannot provide those for third-party apps, so opening relies on URI schemes. Schemes are not exclusive: any app can claim one, and some browsers ask the user to confirm the handoff.",
          },
        ],
      },
    ],
  },
  {
    slug: "domains",
    index: "03",
    title: "Custom domains",
    blurb: "Put your short links on your own hostname.",
    topics: [
      {
        slug: "add-a-domain",
        title: "Add and verify a domain",
        summary: "Point a CNAME at LinkShift and verify ownership.",
        body: [
          {
            kind: "steps",
            items: [
              "In Domains, add the hostname you own (for example lnk.yourbrand.com).",
              "Create a CNAME record with your DNS provider pointing at the target shown in LinkShift.",
              "Return to LinkShift and run verification. Once verified, the domain appears in the create-link picker.",
            ],
          },
          {
            kind: "p",
            text: "DNS propagation can take from a few minutes to a few hours. Verification can be retried at any time.",
          },
          {
            kind: "media",
            label: "The Domains ledger with DNS target and verification status lamp",
          },
        ],
      },
      {
        slug: "default-domain",
        title: "Choose your default domain",
        summary: "Which hostname new links are created on.",
        body: [
          {
            kind: "p",
            text: "One of your verified domains (or the shared go.linkshift.in domain on Free) is your default: new links use it unless you pick another in the create dialog.",
          },
          {
            kind: "note",
            text: "Domain counts are plan-scoped: Starter includes 1 custom domain, Creator 5, Pro and Enterprise unlimited. Free accounts use the shared domain.",
          },
        ],
      },
    ],
  },
  {
    slug: "qr",
    index: "04",
    title: "QR codes",
    blurb: "Every link ships with a styled, printable QR code.",
    topics: [
      {
        slug: "qr-studio",
        title: "Design a QR in the studio",
        summary: "Colors, corners, embedded logo, and live preview.",
        body: [
          {
            kind: "p",
            text: "The QR Studio renders your link as a scannable code you can style: module color, background, corner treatment and an embedded logo. The preview updates live and warns before a combination gets hard to scan.",
          },
          {
            kind: "steps",
            items: [
              "Open QR Studio and pick the link the code should open.",
              "Style it — the preview re-renders as you change controls.",
              "Save to your gallery and export for print or screen.",
            ],
          },
          {
            kind: "media",
            label: "QR Studio split view: style controls left, live preview right",
          },
        ],
      },
      {
        slug: "qr-limits",
        title: "QR allowances",
        summary: "How many codes you can generate per month on each plan.",
        body: [
          {
            kind: "p",
            text: "Generated codes count against a monthly allowance: 10 on Free, 100 on Starter, unlimited on Creator and above. Codes you have already saved keep working forever — the allowance covers generation, not scanning.",
          },
        ],
      },
    ],
  },
  {
    slug: "analytics",
    index: "05",
    title: "Analytics & data",
    blurb: "Metrics, history windows and exports.",
    topics: [
      {
        slug: "metrics-defined",
        title: "Metrics, defined",
        summary: "Exactly what each instrument measures.",
        body: [
          {
            kind: "p",
            text: "Clicks over time plots completed redirects per day. Devices, countries, browsers and operating systems break those clicks down by the signals visitors' browsers send. Referrers show where clicks came from; UTM parameters show what your own campaigns tagged.",
          },
          {
            kind: "media",
            label: "The analytics desk with headline numbers and the clicks-over-time chart",
          },
          {
            kind: "note",
            text: "Breakdown depth is plan-tiered: devices and countries on every plan; browsers and OS from Starter; referrers and UTM from Creator.",
          },
        ],
      },
      {
        slug: "history-and-ranges",
        title: "Analytics history & ranges",
        summary: "30 days to 3 years, enforced per plan.",
        body: [
          {
            kind: "p",
            text: "Your plan sets the history window the range picker offers: Free 30 days, Starter 180, Creator 365, Pro and Enterprise 1095 (3 years). Ranges beyond your window are shown locked with the plan that unlocks them — the same rule applies on the API, not just the interface.",
          },
        ],
      },
      {
        slug: "csv-export",
        title: "Export CSV",
        summary: "Take a link's analytics out of LinkShift — Creator and above.",
        body: [
          {
            kind: "p",
            text: "From a link's analytics view, export the current range as a CSV file for spreadsheets and BI tools. Export is included on Creator, Pro and Enterprise plans.",
          },
        ],
      },
    ],
  },
  {
    slug: "billing",
    index: "06",
    title: "Billing & plans",
    blurb: "Limits, upgrades and how payments work.",
    topics: [
      {
        slug: "plans-and-limits",
        title: "Plans & limits",
        summary: "The full limit table, in plain words.",
        body: [
          {
            kind: "p",
            text: "Free: 50 links, 2,500 redirects/month, 10 QR/month, 30-day analytics. Starter: 1,000 links, 50k redirects, 100 QR, 1 custom domain, 180-day analytics. Creator: 10k links, 500k redirects, unlimited QR, 5 domains, referrer/UTM breakdowns and CSV export, 365-day analytics. Pro: no caps, Path Forwarding, 3-year analytics.",
          },
          {
            kind: "note",
            text: "Redirect allowances include a grace headroom before links ever stop working — see the pricing page for current numbers.",
          },
        ],
      },
      {
        slug: "upgrades-and-payments",
        title: "Upgrades, downgrades & payments",
        summary: "Payments run through Razorpay; changes prorate at the next cycle.",
        body: [
          {
            kind: "p",
            text: "Upgrades and downgrades are made from Billing in the app. Payments are processed by Razorpay; LinkShift never stores card numbers. After a successful payment your plan changes immediately and the waybill on Billing shows the new renewal date.",
          },
          {
            kind: "p",
            text: "Refunds, taxes and payment disclosures live in the payment policy pages linked from the pricing page and your receipt emails.",
          },
        ],
      },
    ],
  },
  {
    slug: "account",
    index: "07",
    title: "Account & security",
    blurb: "Profile, sign-in and data control.",
    topics: [
      {
        slug: "profile-and-sign-in",
        title: "Profile & sign-in",
        summary: "Name, avatar, password and Google sign-in.",
        body: [
          {
            kind: "p",
            text: "Settings holds your profile (name, avatar), security (password change, active sign-in method) and appearance (light or dark office). Google-connected accounts can add a password at any time.",
          },
        ],
      },
      {
        slug: "delete-your-account",
        title: "Delete your account",
        summary: "What deletion removes, and what keeps working until then.",
        body: [
          {
            kind: "p",
            text: "Account deletion is available from Settings and takes effect after confirmation. It removes your profile, links, QR codes and analytics. Short links stop redirecting once deleted — export any data you need first.",
          },
          {
            kind: "note",
            text: "Deletion is irreversible. Active subscriptions should be cancelled from Billing first so no further invoices are raised.",
          },
        ],
      },
    ],
  },
  {
    slug: "troubleshooting",
    index: "08",
    title: "Troubleshooting",
    blurb: "Work through the common failures, one check at a time.",
    topics: [
      {
        slug: "app-wont-open",
        title: "App won't open from a link",
        summary: "A checklist for deep links that show the interstitial or the website instead of your app.",
        body: [
          {
            kind: "steps",
            items: [
              "Confirm the app is installed on the device you are testing — LinkShift cannot tell either way.",
              "Check the App URI scheme exactly: only the name (myapp), no ://, no spaces, matching what the app registers.",
              "On Android, fill in the Android package to get Chrome's native handoff; without it you'll see the interstitial by design.",
              "Test in the system browser, not an in-app browser (Instagram, WhatsApp, Facebook) — many of those block scheme opens.",
              "Open the link on desktop to confirm the web destination works, then re-test on a phone.",
            ],
          },
          {
            kind: "note",
            text: "If the interstitial shows and then continues to the website, the scheme attempt timed out — almost always a wrong scheme or a missing app, not a LinkShift failure.",
          },
        ],
      },
      {
        slug: "paths-not-arriving",
        title: "Paths or queries not arriving",
        summary: "The appended tail disappears between your short link and the destination.",
        body: [
          {
            kind: "steps",
            items: [
              "Verify Path Forwarding is enabled on the link — it is off by default.",
              "Check the destination actually has a route for the appended path; a 404 there is the destination's response, not LinkShift's.",
              "Confirm the tail is appended directly to the short link (…/my-link/products/123), not URL-encoded before sharing.",
            ],
          },
          {
            kind: "p",
            text: "LinkShift forwards the appended path and query verbatim. It does not rewrite segments, merge parameters, or add defaults — if the destination receives them, that is exactly what arrived.",
          },
        ],
      },
      {
        slug: "domain-verification-failing",
        title: "Domain verification failing",
        summary: "The CNAME is set but LinkShift still says unverified.",
        body: [
          {
            kind: "steps",
            items: [
              "Check the record type is CNAME (not A, TXT or ALIAS) pointing at the exact target shown in LinkShift.",
              "Watch for a trailing dot or a proxied record (orange-cloud providers) changing the target.",
              "Wait for propagation — new records can take minutes to hours — then retry verification from the Domains ledger.",
            ],
          },
          {
            kind: "note",
            text: "A record that resolves but is proxied through a CDN usually fails verification; pause proxying for the hostname while you verify.",
          },
        ],
      },
    ],
  },
];

export const ALL_TOPICS: Array<{ category: DocCategory; topic: DocTopic }> =
  DOC_CATEGORIES.flatMap((category) =>
    category.topics.map((topic) => ({ category, topic })),
  );

export function findTopic(slug: string) {
  return ALL_TOPICS.find((entry) => entry.topic.slug === slug);
}
