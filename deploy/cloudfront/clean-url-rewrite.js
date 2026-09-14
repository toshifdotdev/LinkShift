// ---------------------------------------------------------------------------
// CloudFront Function — viewer request — SPA clean-URL rewrite
// ---------------------------------------------------------------------------
//
// WHY THIS EXISTS
//
// The frontend build prerenders every public route to its own directory:
//
//     dist/index.html                  →  https://linkshift.in/
//     dist/pricing/index.html          →  https://linkshift.in/pricing
//     dist/docs/index.html             →  https://linkshift.in/docs
//     dist/docs/qr-studio/index.html   →  https://linkshift.in/docs/qr-studio
//
// S3 stores these as objects whose keys end in `/index.html`. A browser (or
// crawler) requests the clean URL `/pricing`, which matches no object key, so
// without this function every prerendered page 403s — and the canonical tags
// written during the build point at URLs that do not resolve.
//
// This function rewrites the request URI at the edge so the clean URL maps to
// the prerendered file.
//
// RUNTIME CONSTRAINTS — read before editing
//
// CloudFront Functions run on a restricted JavaScript runtime (ES5.1-ish,
// no Node APIs, no async, no imports/exports alongside the handler). The
// handler MUST be named `handler` and MUST be exported. Keep this file free of
// syntax the runtime rejects; validate with the AWS CLI command documented in
// deploy/DEPLOYMENT.md §12a before publishing.
//
// BEHAVIOUR CONTRACT (see frontend/scripts/__tests__/cloudfront-rewrite.test.ts)
//
//   "/"                     → "/index.html"
//   "/pricing"              → "/pricing/index.html"
//   "/docs"                 → "/docs/index.html"
//   "/docs/qr-studio"       → "/docs/qr-studio/index.html"
//   "/pricing/"             → "/pricing/index.html"
//   "/docs/qr-studio/"      → "/docs/qr-studio/index.html"
//   "/assets/index-abc.js"  → unchanged (has an extension)
//   "/sitemap.xml"          → unchanged (has an extension)
//   "/robots.txt"           → unchanged (has an extension)
//   "/llms.txt"             → unchanged (has an extension)
//   "/brand/og-image.png"   → unchanged (has an extension)
//   "/brand/favicon.ico"    → unchanged (has an extension)
//
// Anything without a file extension is treated as a document route and is
// rewritten to `<path>/index.html`. Unknown routes therefore resolve to
// `<path>/index.html`, which S3 does not hold — CloudFront's custom error
// responses then serve /404/index.html with a 404 status. See §12b for the
// required error-response configuration. /404/index.html is produced by the
// build via ERROR_ROUTE_PATHS (frontend/src/prerender/public-routes.ts) and is
// prerendered noindex,nofollow — it is intentionally absent from the sitemap.

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Already a directory-style request: "/" or "/pricing/".
  if (uri.charAt(uri.length - 1) === "/") {
    request.uri = uri + "index.html";
    return request;
  }

  // A file request (asset, sitemap, robots.txt, favicon, OG image) — leave it
  // exactly as-is. Detection is by the final path segment only, so a dotted
  // directory name cannot cause a false positive.
  var lastSegment = uri.substring(uri.lastIndexOf("/") + 1);
  if (lastSegment.indexOf(".") !== -1) {
    return request;
  }

  // A clean document URL.
  request.uri = uri + "/index.html";
  return request;
}
