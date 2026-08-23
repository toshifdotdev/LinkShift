// Scan IP storage privacy (Wave M3).
//
// Precise visitor IPs are transient enrichment inputs (GeoIP country/city);
// they are NOT retained verbatim. Storage applies configurable truncation:
//
//   SCAN_IP_PRIVACY=truncated  (default)
//       IPv4  → /24   (last octet zeroed, e.g. 203.0.113.0)
//       IPv6  → /48-ish (host bits dropped, e.g. 2001:db8:1234::)
//                              — best-effort for exotic/compressed forms
//   SCAN_IP_PRIVACY=full
//       store as received (only if a product need ever requires it)
//
// Country/city GeoIP enrichment happens BEFORE truncation, so analytics are
// unaffected.

const MODE = () => process.env.SCAN_IP_PRIVACY ?? "truncated";

function truncateIpv4(ip: string): string {
    const parts = ip.split(".");
    if (parts.length !== 4) return ip;
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

function truncateIpv6(ip: string): string {
    // Best-effort /48-style truncation. Compressed ("::") and mapped
    // (::ffff:a.b.c.d) forms degrade conservatively rather than mangle.
    const lower = ip.toLowerCase();
    const embeddedV4 = /^::ffff:\d+\.\d+\.\d+\.\d+$/.test(lower);
    if (embeddedV4) {
        const v4 = lower.split(":").pop()!.split(".").map(Number);
        return `::ffff:${v4[0]}.${v4[1]}.${v4[2]}.0`;
    }
    if (lower.includes("::")) {
        const head = lower.split("::")[0].split(":").filter(Boolean);
        if (head.length >= 3) return `${head.slice(0, 3).join(":")}::`;
        return `${head.join(":")}::`;
    }
    const groups = lower.split(":");
    if (groups.length >= 4) return `${groups.slice(0, 3).join(":")}::`;
    return ip;
}

export function storageIp(ip?: string | null): string | null {
    if (!ip) return null;
    if (MODE() === "full") return ip;
    if (ip.includes(".") && !ip.includes(":")) return truncateIpv4(ip);
    if (ip.includes(":")) return truncateIpv6(ip);
    return ip; // unknown shape — leave untouched rather than corrupt data
}
