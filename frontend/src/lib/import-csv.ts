/**
 * CSV parsing for bulk link import.
 *
 * RFC 4180 quoting only — enough for a spreadsheet export of "old path, new
 * URL", without pulling in a parser dependency. Deliberately narrow:
 *
 *   - Comma separated, optional double-quote wrapping, `""` escapes a quote.
 *   - CRLF or LF line endings.
 *   - A UTF-8 BOM is stripped, because Excel writes one and it would otherwise
 *     become part of the first header name.
 *   - Trailing blank lines are ignored.
 *
 * Anything more elaborate (semicolons, tab-separated, formulas) is rejected
 * loudly rather than guessed at, because a silently mis-parsed migration is
 * worse than a clear error.
 */

export class CsvError extends Error {}

interface Record {
  cells: string[];
  line: number;
}

/** Split CSV text into records, tracking the source line of each. */
const splitRecords = (text: string): Record[] => {
  const records: Record[] = [];
  let cells: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let recordStartLine = 1;
  let i = 0;

  const pushField = () => {
    cells.push(field);
    field = "";
  };

  const pushRecord = () => {
    pushField();
    records.push({ cells, line: recordStartLine });
    cells = [];
  };

  while (i < text.length) {
    const ch = text[i] as string;

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (ch === "\n") line += 1;
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      if (field !== "") {
        throw new CsvError(
          `Line ${line}: a quote must start the field, not appear mid-value.`
        );
      }
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      // Consume CRLF as one terminator.
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushRecord();
      line += 1;
      recordStartLine = line;
      i += 1;
      continue;
    }

    if (field === "" && cells.length === 0) recordStartLine = line;
    field += ch;
    i += 1;
  }

  if (inQuotes) {
    throw new CsvError("The file ends inside a quoted value.");
  }
  if (field !== "" || cells.length > 0) {
    pushRecord();
  }

  return records;
};

export interface CsvParseResult {
  header: string[];
  /** Row values aligned to `header`; short rows are padded with "". */
  rows: string[][];
  /** Source line of each data row, for error messages. */
  lineNumbers: number[];
}

const isBlankRecord = (record: Record): boolean =>
  record.cells.length === 0 || (record.cells.length === 1 && record.cells[0]!.trim() === "");

/** Parse a CSV string into a header plus data rows. */
export const parseCsv = (input: string): CsvParseResult => {
  // Strip a BOM, then normalise CRLF so the scanner only handles "\n".
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

  if (text.trim() === "") {
    throw new CsvError("That file is empty.");
  }

  const records = splitRecords(text).filter((record) => !isBlankRecord(record));

  if (records.length === 0) {
    throw new CsvError("That file has no rows.");
  }

  const header = (records[0] as Record).cells.map((cell) => cell.trim().toLowerCase());
  const rows: string[][] = [];
  const lineNumbers: number[] = [];

  for (const record of records.slice(1)) {
    const cells = header.map((_, index) => (record.cells[index] ?? "").trim());
    if (cells.every((cell) => cell === "")) continue;
    rows.push(cells);
    lineNumbers.push(record.line);
  }

  if (rows.length === 0) {
    throw new CsvError("That file has a header but no data rows.");
  }

  return { header, rows, lineNumbers };
};

export interface MappedImportRow {
  /** 1-based data row (header excluded), matching the server's report. */
  row: number;
  targetUrl: string;
  slug?: string;
  name?: string;
}

export interface CsvMapping {
  urlColumn: number | null;
  slugColumn: number | null;
  nameColumn: number | null;
}

/** Column name aliases, so a spreadsheet need not match our names exactly. */
export const COLUMN_ALIASES = {
  url: [
    "url",
    "target",
    "targeturl",
    "destination",
    "destinationurl",
    "to",
    "newurl",
    "new",
  ],
  slug: ["slug", "path", "short", "shortid", "key", "oldpath", "old"],
  name: ["name", "label", "title", "description"],
} as const;

const matches = (header: string, aliases: readonly string[]): boolean => {
  const squashed = header.toLowerCase().replace(/[\s_\-.]/g, "");
  return aliases.some((alias) => alias.replace(/[\s_\-.]/g, "") === squashed);
};

export const autoMapColumns = (header: string[]): CsvMapping => ({
  urlColumn: header.findIndex((h) => matches(h, COLUMN_ALIASES.url)),
  slugColumn: header.findIndex((h) => matches(h, COLUMN_ALIASES.slug)),
  nameColumn: header.findIndex((h) => matches(h, COLUMN_ALIASES.name)),
});

/** Turn parsed CSV plus a column mapping into import rows. */
export const buildImportRows = (
  parsed: CsvParseResult,
  mapping: CsvMapping
): MappedImportRow[] => {
  const urlColumn = mapping.urlColumn;
  if (urlColumn === null) {
    throw new CsvError("Choose which column holds the destination URL.");
  }

  return parsed.rows.map((cells, index) => {
    // +1 so the number lines up with what the user sees in their spreadsheet,
    // counting the header as line 1.
    const row: MappedImportRow = {
      row: index + 1,
      targetUrl: cells[urlColumn] ?? "",
    };

    const slug = mapping.slugColumn === null ? "" : (cells[mapping.slugColumn] ?? "");
    if (slug) row.slug = slug;

    const name = mapping.nameColumn === null ? "" : (cells[mapping.nameColumn] ?? "");
    if (name) row.name = name;

    return row;
  });
};

/** A ready-to-fill template, so the expected shape is never a guess. */
export const IMPORT_TEMPLATE = [
  "slug,url,name",
  "launch,https://example.com/launch,Launch page",
  "pricing,https://example.com/pricing,Pricing",
].join("\n");

/**
 * Downloadable form of the template.
 *
 * Exposed publicly on the pricing table: bulk import is a Creator + Pro
 * feature, so the format has to be visible before someone pays for it.
 * Otherwise a prospect deciding between plans has no way to see what the
 * feature actually takes, and can only find out after paying.
 */
export const IMPORT_TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(
  IMPORT_TEMPLATE
)}`;
