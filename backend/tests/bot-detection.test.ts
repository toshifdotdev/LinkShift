import { describe, expect, it } from "vitest";
import { classifyRequest, isNonPublicIp } from "../src/utils/botDetection";

describe("obvious automation is detected", () => {
    it.each([
        ["Slack link preview", "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)", "social-preview"],
        ["Slack image proxy", "Slack-ImgProxy (+https://api.slack.com/images)", "social-preview"],
        ["Discord", "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)", "social-preview"],
        ["WhatsApp", "WhatsApp/2.19.81 A", "social-preview"],
        ["Telegram", "TelegramBot (like TwitterBot)", "social-preview"],
        ["Facebook", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", "social-preview"],
        ["LinkedIn", "LinkedInBot/1.0 (compatible; Mozilla/5.0)", "social-preview"],
        ["Skype preview", "Skypeuripreview Preview/0.5 skype-url-parser@microsoft.com", "social-preview"],
    ])("flags a %s as a social preview", (_name, ua, reason) => {
        const result = classifyRequest({ userAgent: ua, ip: "93.184.216.34" });
        expect(result.isBot).toBe(true);
        expect(result.reason).toBe(reason);
        expect(result.category).toBe("Social / chat link preview");
    });

    it.each([
        ["Proofpoint", "Mozilla/5.0 Proofpoint URI Defense", "security-scanner"],
        ["Mimecast", "MimecastSecurityGateway", "security-scanner"],
        ["Microsoft Safe Links", "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 MsftSafeLinks", "security-scanner"],
        ["URLScan", "Mozilla/5.0 urlscan.io", "security-scanner"],
        ["Sucuri", "SucuriScanner", "security-scanner"],
    ])("flags a %s scanner", (_name, ua, reason) => {
        const result = classifyRequest({ userAgent: ua, ip: "8.8.8.8" });
        expect(result.isBot).toBe(true);
        if (reason) expect(result.reason).toBe(reason);
    });

    it.each([
        ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
        ["Bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"],
        ["DuckDuckBot", "DuckDuckBot/1.1"],
        ["YandexBot", "Mozilla/5.0 (compatible; YandexBot/3.0)"],
        ["GPTBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0"],
        ["PerplexityBot", "Mozilla/5.0; PerplexityBot/1.0"],
    ])("flags the %s search crawler", (_name, ua) => {
        const result = classifyRequest({ userAgent: ua, ip: "1.1.1.1" });
        expect(result.isBot).toBe(true);
        expect(result.reason).toBe("search-crawler");
    });

    it("flags uptime monitors", () => {
        for (const ua of [
            "Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)",
            "HealthDog",
        ]) {
            const result = classifyRequest({ userAgent: ua, ip: "9.9.9.9" });
            expect(result.isBot).toBe(true);
            expect(result.reason).toBe("monitoring");
        }
    });

    it("flags HTTP libraries and headless browsers", () => {
        for (const ua of [
            "curl/8.5.0",
            "Wget/1.21.3",
            "python-requests/2.31.0",
            "Go-http-client/1.1",
            "PostmanRuntime/7.36.0",
            "Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0.0.0",
        ]) {
            expect(classifyRequest({ userAgent: ua, ip: "9.9.9.9" }).isBot).toBe(true);
        }
    });

    it("flags a request with no User-Agent at all", () => {
        for (const ua of [undefined, null, "", "   "]) {
            const result = classifyRequest({ userAgent: ua, ip: "9.9.9.9" });
            expect(result.isBot).toBe(true);
            expect(result.reason).toBe("no-user-agent");
            expect(result.category).toBe("Unidentified");
        }
    });
});

describe("legitimate visitors are never dropped", () => {
    it.each([
        ["Chrome on Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"],
        ["Safari on iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"],
        ["Samsung Internet", "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36"],
        ["Firefox", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0"],
        ["Edge", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"],
        ["Google Chrome iOS", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1"],
        ["WeChat in-app webview", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.42"],
        ["Instagram in-app webview", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0.0.0"],
        ["Opera", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/116.0.0.0"],
    ])("keeps a %s click as human", (_name, ua) => {
        const result = classifyRequest({ userAgent: ua, ip: "93.184.216.34" });
        expect(result.isBot).toBe(false);
        expect(result.reason).toBeNull();
        expect(result.category).toBeNull();
    });

    it("keeps an unknown User-Agent as human rather than guessing", () => {
        const result = classifyRequest({
            userAgent: "SomeInternalClient/1.0 (+https://intranet.example)",
            ip: "93.184.216.34",
        });
        expect(result.isBot).toBe(false);
    });

    it("does not mistake WeChat's real in-app browser for a Messenger crawler", () => {
        
        
        for (const ua of [
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.42",
            "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile Safari/537.36 MicroMessenger/8.0.42.2460",
        ]) {
            expect(classifyRequest({ userAgent: ua, ip: "93.184.216.34" }).isBot).toBe(false);
        }
    });

    it("keeps a human click even when the IP is missing entirely", () => {
        const result = classifyRequest({
            userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/131.0.0.0 Safari/537.36",
            ip: undefined,
        });
        expect(result.isBot).toBe(false);
    });
});

describe("non-public addresses are structural bot signals", () => {
    it.each([
        "127.0.0.1",
        "10.0.0.5",
        "172.16.0.9",
        "172.31.255.254",
        "192.168.1.1",
        "169.254.169.254",
        "100.64.0.1",
        "0.0.0.0",
        "224.0.0.1",
    ])("treats %s as non-public", (ip) => {
        expect(isNonPublicIp(ip)).toBe(true);
        const result = classifyRequest({
            userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/131.0.0.0 Safari/537.36",
            ip,
        });
        expect(result.isBot).toBe(true);
        
        expect(result.reason).toBe("non-public-ip");
        expect(result.category).toBe("Network");
    });

    it.each([
        "::1",
        "fe80::1",
        "fd00::1",
        "::ffff:127.0.0.1",
        "::ffff:10.0.0.1",
        "::ffff:192.168.1.1",
    ])("treats IPv6 %s as non-public", (ip) => {
        expect(isNonPublicIp(ip)).toBe(true);
    });

it.each([
        "8.8.8.8",
        "1.1.1.1",
        "93.184.216.34",
        "172.15.0.1",
        "172.32.0.1",
        "2001:4860:4860::8888",
    ])("does not treat public address %s as non-public", (ip) => {
        expect(isNonPublicIp(ip)).toBe(false);
    });

    it.each([
        
        
        "192.0.2.5",
        "198.51.100.5",
        "203.0.113.5",
        
        "198.18.0.1",
    ])("treats reserved documentation range %s as non-public", (ip) => {
        expect(isNonPublicIp(ip)).toBe(true);
    });

    it("tolerates bracketed IPv6 and surrounding whitespace", () => {
        expect(isNonPublicIp(" [::1] ")).toBe(true);
    });
});

describe("every bot verdict carries an explanation", () => {
    it("returns a non-null reason whenever isBot is true", () => {
        const samples = [
            "Slackbot/1.0",
            "Googlebot/2.1",
            "curl/8.0.0",
            "UptimeRobot/2.0",
            "Proofpoint Scanner",
            "Mozilla/5.0 (compatible; Googlebot/2.1)",
        ];
        for (const userAgent of samples) {
            const result = classifyRequest({ userAgent, ip: "9.9.9.9" });
            expect(result.isBot).toBe(true);
            expect(result.reason).not.toBeNull();
            expect(result.category).not.toBeNull();
        }
    });
});