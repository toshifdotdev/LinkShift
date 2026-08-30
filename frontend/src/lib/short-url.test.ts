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
});
