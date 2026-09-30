

export type BotReason =
    | "non-public-ip"
    | "social-preview"
    | "security-scanner"
    | "search-crawler"
    | "monitoring"
    | "http-library"
    | "no-user-agent";

export type BotCategory =
    | "Network"
    | "Link preview"
    | "Email security"
    | "Search engine"
    | "Uptime monitoring"
    | "Library or script"
    | "Unidentified";

export interface BotClassification {
    
    isBot: boolean;
    reason: BotReason | null;
    category: BotCategory | null;
}

export const BOT_CATEGORY_LABEL: Record<BotReason, string> = {
    "non-public-ip": "Non-public network",
    "social-preview": "Social / chat link preview",
    "security-scanner": "Email security scanner",
    "search-crawler": "Search engine crawler",
    monitoring: "Uptime monitor",
    "http-library": "Library or script",
    "no-user-agent": "No user agent",
};

const UA_RULES: { reason: BotReason; pattern: RegExp }[] = [
    
    
    
    
    
    
    
    
    
    { reason: "social-preview", pattern: /(slack|discord|whatsapp|telegram|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|pinterest\/|redditbot|skypeuripreview|embedly|quora link preview|showyoubot|outbrain|vkshare|w3c_validator|flipboard|telegrambot|slackbot|slack-imgproxy)/i },

    
    
    
    { reason: "security-scanner", pattern: /(proofpoint|mimecast|forcepoint|messageLabs|barracuda|symantec|broadcom|microsoftsafelinks|msftsafelinks|urldefense|urlscan|sucuri|google[-_]?web[-_]?light|safe.?browsing|nuclei|xsap|xssfilter|bitdefender|avast|avg\/|kaspersky|eset|trendmicro)/i },

    
    { reason: "monitoring", pattern: /(uptimerobot|healthdog|statuscake|pingdom|site24x7|statuspage|newrelicpinger|datadoghq|cron|monitoring|uptime|heartbeat|healthcheck|gtmetrix)/i },

    
    { reason: "http-library", pattern: /(curl\/|wget\/|python-requests|python-urllib|go-http-client|okhttp|axios\/|node-fetch|got \(|httpie|lwp-trivial|java\/|apache-httpclient|libwww-perl|scrapy|headlesschrome\/|phantomjs|puppeteer|playwright|postmanruntime|insomnia|http_request2)/i },

    
    { reason: "search-crawler", pattern: /(googlebot|google-inspectiontool|bingbot|bingpreview|slurp|duckduckbot|baiduspider|yandexbot|yandeximages|sogou|exabot|facebot|ia_archiver|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|seznambot|qwantify|neevabot|bytespider|gptbot|claudebot|ccbot|perplexitybot|applebot-extended)/i },
];

const PRIVATE_IPV4 =
    /^(0\.|10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|192\.0\.0\.|192\.0\.2\.|198\.18\.|198\.51\.100\.|203\.0\.113\.|224\.|240\.)/;

export const isNonPublicIp = (ip: string | undefined): boolean => {
    if (!ip) return false;

    const addr = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
    if (!addr) return false;

    
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(addr);
    if (mapped) return PRIVATE_IPV4.test(mapped[1]);

    if (addr.includes(":")) {
        
        
        return (
            addr === "::" ||
            addr === "::1" ||
            addr.startsWith("fc") ||
            addr.startsWith("fd") ||
            addr.startsWith("fe8") ||
            addr.startsWith("fe9") ||
            addr.startsWith("fea") ||
            addr.startsWith("feb") ||
            addr.startsWith("::ffff:127.") ||
            addr.startsWith("::ffff:10.") ||
            addr.startsWith("::ffff:192.168.")
        );
    }

    return PRIVATE_IPV4.test(addr);
};

export interface ClassifyInput {
    userAgent?: string | null;
    ip?: string | null;
}

export const classifyRequest = ({ userAgent, ip }: ClassifyInput): BotClassification => {
    
    if (isNonPublicIp(ip ?? undefined)) {
        return { isBot: true, reason: "non-public-ip", category: "Network" };
    }

    const ua = (userAgent ?? "").trim();

    
    
    if (!ua) {
        return { isBot: true, reason: "no-user-agent", category: "Unidentified" };
    }

    
    for (const rule of UA_RULES) {
        if (rule.pattern.test(ua)) {
            return {
                isBot: true,
                reason: rule.reason,
                category: BOT_CATEGORY_LABEL[rule.reason] as BotCategory,
            };
        }
    }

    
    
    return { isBot: false, reason: null, category: null };
};