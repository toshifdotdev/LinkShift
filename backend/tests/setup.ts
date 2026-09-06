// Global test setup. Runs before every test file.
// Keep this file free of heavy imports — it executes before module resolution
// of the files under test so env vars set here are visible at import time.

process.env.TRUST_PROXY_HOPS = process.env.TRUST_PROXY_HOPS ?? "0";
