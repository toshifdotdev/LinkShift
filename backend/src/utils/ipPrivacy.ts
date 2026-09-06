














const MODE = () => process.env.SCAN_IP_PRIVACY ?? "truncated";

function truncateIpv4(ip: string): string {
    const parts = ip.split(".");
    if (parts.length !== 4) return ip;
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

function truncateIpv6(ip: string): string {
    
    
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
    return ip; 
}
