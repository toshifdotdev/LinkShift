import { describe, expect, it } from "vitest";
import { DEFAULT_SHORT_DOMAIN, shortUrl } from "./short-url";

describe("shortUrl", () => {
  it("falls back to the default short domain when none is provided", () => {
    expect(shortUrl("abc1234")).toBe(`https://${DEFAULT_SHORT_DOMAIN}/abc1234`);
  });

  it("uses a custom domain host when provided", () => {
    expect(shortUrl("abc1234", "go.example.com")).toBe("https://go.example.com/abc1234");
  });

  it("falls back to the default when the custom domain is empty", () => {
    expect(shortUrl("abc1234", "")).toBe(`https://${DEFAULT_SHORT_DOMAIN}/abc1234`);
  });

  it("falls back to the default when the custom domain is null", () => {
    expect(shortUrl("abc1234", null)).toBe(`https://${DEFAULT_SHORT_DOMAIN}/abc1234`);
  });

  // The short link a visitor is given is always the bare canonical URL: campaign
  // tags are attached to the destination on the server, and forwarded paths are
  // whatever the visitor types after it. Neither belongs in the URL we hand out.
  it("carries no path and no query of its own", () => {
    const url = new URL(shortUrl("abc1234", "links.acme.com"));

    expect(url.pathname).toBe("/abc1234");
    expect(url.search).toBe("");
    expect(url.href).toBe("https://links.acme.com/abc1234");
  });
});
