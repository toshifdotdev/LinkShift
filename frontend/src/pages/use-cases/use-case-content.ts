import type { UseCaseProps } from "./use-case-page";

export interface UseCaseContent extends Omit<UseCaseProps, "seo"> {
  path: string;
  seo: UseCaseProps["seo"] & { breadcrumbs: Array<{ name: string; path: string }> };
}

export const USE_CASES: Record<string, UseCaseContent> = {
  "/campaign-links": {
    path: "/campaign-links",
    kicker: "Campaign links",
    headline: "One link per campaign, with the tracking already attached",
    subhead:
      "You set the campaign tags once, on the link, and the destination address is built to include them. Every human click is then filed against the campaign. Nobody has to remember to add parameters when they paste the link somewhere new.",
    proof:
      "LinkShift counts people, not requests. Chat previews, email scanners and crawlers open your link too. They are stored and shown separately, so they never inflate a campaign number or count against your monthly redirects.",
    ctaLabel: "Create a campaign link",
    seo: {
      title: "Campaign Short Links with UTM Tracking — LinkShift",
      description:
        "Save utm_source, medium and campaign on a short link once. LinkShift builds the destination with them, and reports human clicks per campaign with referrer and country.",
      canonicalPath: "/campaign-links",
      breadcrumbs: [
        { name: "LinkShift", path: "/" },
        { name: "Campaign links", path: "/campaign-links" },
      ],
    },
    steps: [
      {
        title: "Set the tags on the link, not on the paste",
        body: "Source, medium, campaign, term and content are saved with the link, and the destination is built with them in place. Any other query parameters already on that destination are left alone. Edit the tags later and the destination is rebuilt to match.",
      },
      {
        title: "Give it a key people will recognise",
        body: "Custom slugs are limited per month — 10 on Free, 25 on Creator, unlimited on Pro — so the short link reads as part of the campaign rather than a row of characters.",
      },
      {
        title: "Read the campaign, not just the total",
        body: "Analytics break down by link, so each campaign keeps its own numbers: human clicks, referrer, country, city, device, browser and operating system.",
      },
      {
        title: "Reuse the link when the campaign moves",
        body: "Edit the destination in one place. Everyone holding the printed code, the slide or the chat message follows it to the new page. Free includes 3 destination changes a month; Creator includes 150.",
      },
    ],
    capabilities: [
      "Five UTM parameters saved per link and built into the destination address",
      "Per-link analytics: referrer, country, city, device, browser, OS",
      "Custom slugs, with a stated monthly allowance per plan",
      "Destination changes without touching the link you handed out",
      "Password protection and optional expiry for embargoed campaigns",
      "CSV export of the full scan ledger on Creator and above",
      "Bot traffic recorded and disclosed, never counted as a click",
    ],
    faqs: [
      {
        q: "What happens to utm parameters already on my destination URL?",
        a: "The five UTM keys are cleared and replaced with the values you set on the link when it is saved, and every other query parameter on the destination is preserved. Change the tags on the link afterwards and the destination is rebuilt with the new values.",
      },
      {
        q: "Which plan do I need to set campaign tags?",
        a: "UTM tagging comes with Creator and above. Free and Starter links still resolve and still report human clicks, referrer and geography — the campaign tags are what add campaign-level grouping on top of that.",
      },
      {
        q: "Do I have to add tracking parameters every time I share the link?",
        a: "No. They live on the link. Wherever it is pasted, the tags travel with it, including into a QR code, because the code points at the same link.",
      },
      {
        q: "Why do my LinkShift numbers differ from my ad platform?",
        a: "Ad platforms generally count every request that fetches the URL, including automated link previews and security scanners. LinkShift classifies each request and counts human clicks, and reports the automated ones separately so you can see the difference rather than guess at it.",
      },
      {
        q: "How long do I get the data?",
        a: "30 days on Free, 180 on Starter, a year on Creator and three years on Pro.",
      },
      {
        q: "Is a custom domain needed?",
        a: "No. Links work on the shared LinkShift domain. Custom domains start on Starter, and a campaign is usually a good reason to have one.",
      },
    ],
  },

  "/qr-codes": {
    path: "/qr-codes",
    kicker: "QR codes",
    headline: "A code for a link, not a frozen URL",
    subhead:
      "The code in your packaging points at a LinkShift link. The design is yours — colour, pattern, corner style, logo, frame — and the destination stays changeable after the print run.",
    proof:
      "Because the code resolves a link rather than embedding an address, moving the destination updates every printed copy at once. Regeneration is not required, and your scan counts arrive in the same analytics as every other click.",
    ctaLabel: "Open QR Studio",
    seo: {
      title: "QR Code Studio — Styled Codes on Your Own Domain — LinkShift",
      description:
        "Design a QR code for any LinkShift link: colour, pattern, corner style, logo and frame. Change the destination later and the printed code still opens the new page.",
      canonicalPath: "/qr-codes",
      breadcrumbs: [
        { name: "LinkShift", path: "/" },
        { name: "QR codes", path: "/qr-codes" },
      ],
    },
    steps: [
      {
        title: "Pick the link the code should open",
        body: "QR Studio works from your existing links, so the code is only ever as current as the link behind it.",
      },
      {
        title: "Style it, watching the preview",
        body: "Set foreground and background colour, pick from the pattern styles, choose a corner (eye) and eye-ball style, add a frame, adjust the margin, and overlay a logo. The preview re-renders as you change controls and warns when a combination is at risk of not scanning.",
      },
      {
        title: "Save it and use it anywhere",
        body: "Saved codes go to your gallery for print or screen. Generated codes keep resolving indefinitely — the monthly allowance covers how many you can generate, not how many people can scan them.",
      },
    ],
    capabilities: [
      "Foreground and background colour with a live preview",
      "Pattern style, eye style and eye-ball style",
      "Logo overlay, uploaded once and reused across codes",
      "Adjustable margin and optional frame",
      "Scans recorded as human clicks, with bot requests listed separately",
      "Destination is changeable after printing",
      "10 codes a month on Free, 100 on Starter, unlimited on Creator and above",
    ],
    faqs: [
      {
        q: "What happens to a printed code if I change the link's destination?",
        a: "It opens the new destination. The code encodes the LinkShift link, not the final address, so there is nothing to reprint.",
      },
      {
        q: "Does a stylised code scan as reliably as a plain one?",
        a: "The studio warns when your choices reduce scannability, and the margin control lets you add quiet zone around the modules, which is the most common reason a custom code fails on a printed surface.",
      },
      {
        q: "What happens to the monthly allowance?",
        a: "It limits generation only. Free includes 10 codes a month, Starter 100, and Creator and Pro are unlimited. Codes you have already generated keep working after the allowance resets.",
      },
      {
        q: "Do I get a separate scan count for each code?",
        a: "A scan is a click on the link, so it lands in that link's analytics alongside every other click. If the same page needs two different codes, give each its own link and the numbers separate cleanly.",
      },
    ],
  },

  "/url-migration": {
    path: "/url-migration",
    kicker: "URL migration",
    headline: "Keep the URLs you already published",
    subhead:
      "Connect the domain you own, then give each old path its own short key. A redirect here is an exact match on a host and a key, which means the address people bookmarked and the address search engines indexed can both stay the one they were.",
    proof:
      "To be plain about what this is: LinkShift has no rules engine. There is no regex, no wildcards, no ordered precedence and no bulk importer in the dashboard. Every old URL becomes one link, created in the dashboard or through the REST API. If you are moving hundreds of paths, script the API.",
    ctaLabel: "Connect a domain",
    seo: {
      title: "Move URLs to Your Own Domain — LinkShift",
      description:
        "Keep the paths you have already published. Connect your domain, give each old URL its own short key, and change or retire the destination from one place.",
      canonicalPath: "/url-migration",
      breadcrumbs: [
        { name: "LinkShift", path: "/" },
        { name: "URL migration", path: "/url-migration" },
      ],
    },
    steps: [
      {
        title: "Verify the domain you are moving to",
        body: "Add the host and confirm ownership by DNS record. Once verified you can issue short keys on it; the certificate is provisioned for you, so there is no separate certificate step to schedule.",
      },
      {
        title: "Map each old path to a short key on that domain",
        body: "A redirect is matched on host plus key, and a key can only exist once per domain. A path like /blog/migration-notes can therefore keep its exact shape, just on a host you control.",
      },
      {
        title: "Create them in the dashboard, or script the API",
        body: "Single links are a form in the dashboard. For a large move, POST to the links endpoint and let a script create them from a mapping file. Nothing about the redirect changes — it is the same exact match either way.",
      },
      {
        title: "Watch the old paths, then retire them",
        body: "Each link keeps its own analytics, so a path that still draws traffic tells you it is still worth keeping. Set an expiry date to retire a path deliberately rather than leaving it to time out unnoticed.",
      },
    ],
    capabilities: [
      "Custom domains with DNS verification and automatic certificates",
      "One key per path, unique within a domain",
      "Choose which domain is the default for new links",
      "Create links in the dashboard or through the REST API",
      "Change a destination without reissuing the link",
      "Password protection for paths that should not be public",
      "Optional expiry date, which returns a hard 410 once passed",
      "Per-link analytics so you can see which old paths still earn their place",
    ],
    faqs: [
      {
        q: "Does LinkShift support regex or wildcard redirects?",
        a: "No. Every redirect is an exact match on a host and a short key. If your old structure needs pattern matching, model it in the script that creates the links, or put a pattern-matching layer in front of LinkShift.",
      },
      {
        q: "How do I migrate thousands of paths?",
        a: "Through the links API. Create one link per old path from a mapping file. Link count is the limit to plan around: 100 on Free, 1,000 on Starter, 10,000 on Creator and unlimited on Pro.",
      },
      {
        q: "Will my old addresses keep working?",
        a: "Yes, if you keep serving the old host and point it at LinkShift. Each old path is recreated as a key on a domain you own, so the URL a visitor types still resolves. Retire a path by setting an expiry date rather than deleting it silently.",
      },
      {
        q: "What is different from editing an nginx config?",
        a: "The destinations live in a dashboard you can see and change, they are versioned through the link change history, and they are editable without a deploy. The trade-off is that LinkShift matches exactly, where a config file can pattern-match — so the fit depends on whether your URLs are individually meaningful.",
      },
      {
        q: "Do I need my own domain?",
        a: "To keep your existing addresses, yes — the path is only preserved on a host you control. Custom domains start on Starter, which allows one, and Creator allows five.",
      },
    ],
  },
};