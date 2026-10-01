import { describe, expect, it } from "vitest";

import {
  autoMapColumns,
  buildImportRows,
  CsvError,
  parseCsv,
} from "./import-csv";

/**
 * A mis-parsed import silently creates the wrong links, which for a migration
 * means a site that 404s. These tests pin the parser's edge cases: quoting,
 * embedded commas and newlines, BOMs, CRLF, blank lines, and the failure modes
 * where a loud error is better than a guess.
 */

describe("parseCsv", () => {
  it("reads a header and aligned rows", () => {
    const result = parseCsv("slug,url,name\nabout,https://a.com,About\n");

    expect(result.header).toEqual(["slug", "url", "name"]);
    expect(result.rows).toEqual([
      ["about", "https://a.com", "About"],
    ]);
  });

  it("lowercases headers so column matching is case-insensitive", () => {
    expect(parseCsv("SLUG,URL\nabout,https://a.com").header).toEqual(["slug", "url"]);
  });

  it("strips a UTF-8 BOM, which Excel writes and would corrupt the first header", () => {
    const result = parseCsv("\uFEFFslug,url\nabout,https://a.com");
    expect(result.header).toEqual(["slug", "url"]);
  });

  it("handles CRLF line endings", () => {
    const result = parseCsv("slug,url\r\nabout,https://a.com\r\npricing,https://b.com");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]).toEqual(["pricing", "https://b.com"]);
  });

  it("keeps a quoted comma inside one field", () => {
    const result = parseCsv('name,url\n"Acme, Inc.",https://acme.com');
    expect(result.rows[0]).toEqual(["Acme, Inc.", "https://acme.com"]);
  });

  it("unescapes a doubled quote inside a quoted field", () => {
    const result = parseCsv('name,url\n"The ""Big"" Sale",https://a.com');
    expect(result.rows[0]).toEqual(['The "Big" Sale', "https://a.com"]);
  });

  it("keeps a newline inside a quoted field without splitting the record", () => {
    const result = parseCsv('name,url\n"line one\nline two",https://a.com');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]![0]).toBe("line one\nline two");
  });

  it("pads a short row rather than shifting its values", () => {
    const result = parseCsv("slug,url,name\nabout,https://a.com");
    expect(result.rows[0]).toEqual(["about", "https://a.com", ""]);
  });

  it("ignores blank trailing lines", () => {
    const result = parseCsv("slug,url\nabout,https://a.com\n\n\n");
    expect(result.rows).toHaveLength(1);
  });

  it("trims surrounding whitespace from cells", () => {
    const result = parseCsv("slug,url\n  about  ,  https://a.com  ");
    expect(result.rows[0]).toEqual(["about", "https://a.com"]);
  });

  it("reports the source line of each data row", () => {
    const result = parseCsv("slug,url\nabout,https://a.com\npricing,https://b.com");
    expect(result.lineNumbers).toEqual([2, 3]);
  });

  it("rejects an empty file with a readable message", () => {
    expect(() => parseCsv("   ")).toThrow(CsvError);
    expect(() => parseCsv("   ")).toThrow(/empty/i);
  });

  it("rejects a header with no data rows", () => {
    expect(() => parseCsv("slug,url")).toThrow(/no data rows/i);
  });

  it("rejects a file that ends inside a quoted value", () => {
    expect(() => parseCsv('slug,url\n"unterminated,https://a.com')).toThrow(
      /ends inside a quoted value/i
    );
  });

  it("rejects a quote appearing mid-value rather than guessing", () => {
    expect(() => parseCsv('slug,url\nab"cd,https://a.com')).toThrow(CsvError);
  });
});

describe("column mapping", () => {
  it("auto-detects url, slug and name from common header spellings", () => {
    const parsed = parseCsv("Old Path,Destination URL,Title\na,https://a.com,A");
    const mapping = autoMapColumns(parsed.header);

    expect(mapping.slugColumn).toBe(0);
    expect(mapping.urlColumn).toBe(1);
    expect(mapping.nameColumn).toBe(2);
  });

  it("ignores punctuation and spacing differences", () => {
    const mapping = autoMapColumns(["short_id", "target-url", "label"]);
    expect(mapping.slugColumn).toBe(0);
    expect(mapping.urlColumn).toBe(1);
    expect(mapping.nameColumn).toBe(2);
  });

  it("reports -1 for a column it cannot identify", () => {
    const mapping = autoMapColumns(["alpha", "beta"]);
    expect(mapping.urlColumn).toBe(-1);
    expect(mapping.slugColumn).toBe(-1);
  });
});

describe("buildImportRows", () => {
  const parsed = parseCsv(
    "slug,url,name\nabout,https://a.com,About\npricing,https://b.com,\n"
  );

  it("maps cells into typed import rows", () => {
    const rows = buildImportRows(parsed, { urlColumn: 1, slugColumn: 0, nameColumn: 2 });

    expect(rows).toEqual([
      { row: 1, targetUrl: "https://a.com", slug: "about", name: "About" },
      { row: 2, targetUrl: "https://b.com", slug: "pricing" },
    ]);
  });

  it("omits slug and name rather than sending empty strings", () => {
    const rows = buildImportRows(parsed, { urlColumn: 1, slugColumn: 0, nameColumn: 2 });
    // A blank name must not be sent, so the server treats it as "not set".
    expect(rows[1]).not.toHaveProperty("name");
  });

  it("numbers rows from 1, excluding the header", () => {
    const rows = buildImportRows(parsed, { urlColumn: 1, slugColumn: 0, nameColumn: 2 });
    expect(rows.map((r) => r.row)).toEqual([1, 2]);
  });

  it("refuses to build rows when no URL column is chosen", () => {
    expect(() =>
      buildImportRows(parsed, { urlColumn: null, slugColumn: 0, nameColumn: 2 })
    ).toThrow(/destination URL/i);
  });

  it("allows slug-less rows, which fall back to a generated short id", () => {
    const p = parseCsv("url\nhttps://a.com");
    const rows = buildImportRows(p, { urlColumn: 0, slugColumn: -1, nameColumn: -1 });
    expect(rows).toEqual([{ row: 1, targetUrl: "https://a.com" }]);
  });
});
