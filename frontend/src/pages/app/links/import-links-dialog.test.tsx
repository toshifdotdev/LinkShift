import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { previewLinkImport, commitLinkImport } = vi.hoisted(() => ({
  previewLinkImport: vi.fn(),
  commitLinkImport: vi.fn(),
}));
vi.mock("@/api/link-import", () => ({ previewLinkImport, commitLinkImport }));

const { useDomains } = vi.hoisted(() => ({ useDomains: vi.fn() }));
vi.mock("@/hooks/use-domains", () => ({ useDomains }));

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/components/ui/toaster", () => ({ useToaster: () => ({ toast }) }));

import { ImportLinksDialog } from "./import-links-dialog";

const DOMAIN = {
  id: "clx0000000000000000000dom",
  host: "go.example.com",
  verified: true,
  verifiedAt: null,
  isDefault: true,
  userId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const renderDialog = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ImportLinksDialog open onOpenChange={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const uploadCsv = async (csv: string, name = "links.csv") => {
  const input = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  const file = new File([csv], name, { type: "text/csv" });
  fireEvent.change(input, { target: { files: [file] } });
  // File.text() is async, so let the parse settle.
  await waitFor(() => expect(input.files).toBeTruthy());
};

const okResult = {
  dryRun: true,
  summary: { total: 2, created: 2, rejected: 0 },
  results: [
    { row: 1, outcome: "created" as const, shortId: "about" },
    { row: 2, outcome: "created" as const, shortId: "pricing" },
  ],
};

const TWO_ROWS = "slug,url\nabout,https://a.com\npricing,https://b.com\n";

beforeEach(() => {
  vi.clearAllMocks();
  useDomains.mockReturnValue({ data: [DOMAIN] });
});

describe("ImportLinksDialog", () => {
  it("explains that a slug is one path segment", () => {
    renderDialog();
    // The flattening requirement is the most likely way to produce a broken
    // migration, so it is stated before a file is even chosen.
    expect(screen.getByText(/one path segment/i)).toBeInTheDocument();
    expect(screen.getByText(/blog-about/)).toBeInTheDocument();
  });

  it("reads a file, auto-maps columns and shows the row count", async () => {
    renderDialog();
    await uploadCsv(
      "slug,url,name\nabout,https://a.com,About\npricing,https://b.com,Pricing\n"
    );

    expect(await screen.findByText(/2 rows read/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/destination url/i)).toHaveValue("1");
    expect(screen.getByLabelText(/^slug/i)).toHaveValue("0");
    expect(screen.getByLabelText(/^name/i)).toHaveValue("2");
  });

  it("surfaces a parse error instead of guessing", async () => {
    renderDialog();
    await uploadCsv('slug,url\n"unterminated,https://a.com');

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /ends inside a quoted value/i
    );
    expect(screen.queryByText(/rows read/i)).not.toBeInTheDocument();
  });

  it("sends a dry run first and never writes on the first pass", async () => {
    previewLinkImport.mockResolvedValue(okResult);
    renderDialog();
    await uploadCsv(TWO_ROWS);

    fireEvent.click(await screen.findByRole("button", { name: /check 2 rows/i }));

    await waitFor(() => expect(previewLinkImport).toHaveBeenCalledTimes(1));
    expect(previewLinkImport.mock.calls[0]![1]).toEqual([
      { targetUrl: "https://a.com", slug: "about" },
      { targetUrl: "https://b.com", slug: "pricing" },
    ]);
    // The commit endpoint must not be touched until the user confirms.
    expect(commitLinkImport).not.toHaveBeenCalled();
  });

  it("lists per-row reasons from the dry run", async () => {
    previewLinkImport.mockResolvedValue({
      dryRun: true,
      summary: { total: 2, created: 1, rejected: 1 },
      results: [
        { row: 1, outcome: "created" as const, shortId: "about" },
        {
          row: 2,
          outcome: "rejected" as const,
          code: "SLUG_TAKEN",
          reason: '"pricing" already exists on go.example.com.',
        },
      ],
    });
    renderDialog();
    await uploadCsv(TWO_ROWS);
    fireEvent.click(await screen.findByRole("button", { name: /check 2 rows/i }));

    expect(await screen.findByText(/1 will be skipped/i)).toBeInTheDocument();
    expect(screen.getByText(/slug already used/i)).toBeInTheDocument();
    expect(screen.getByText(/already exists on go\.example\.com/i)).toBeInTheDocument();
  });

  it("disables the create button when the plan limit blocked the batch", async () => {
    previewLinkImport.mockResolvedValue({
      dryRun: true,
      summary: {
        total: 1,
        created: 0,
        rejected: 1,
        blocked: "You have reached the maximum number of links allowed by your plan",
      },
      results: [
        {
          row: 1,
          outcome: "rejected" as const,
          code: "LIMIT_REACHED",
          reason: "You have reached the maximum number of links allowed by your plan",
        },
      ],
    });
    renderDialog();
    await uploadCsv("slug,url\nabout,https://a.com\n");
    fireEvent.click(await screen.findByRole("button", { name: /check 1 row/i }));

    // The blocked reason appears twice: once in the banner and once in the
    // per-row list, so assert on presence rather than a single match.
    expect((await screen.findAllByText(/maximum number of links/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /create \d+ links/i })).toBeDisabled();
  });

  it("commits only after the user confirms", async () => {
    previewLinkImport.mockResolvedValue(okResult);
    commitLinkImport.mockResolvedValue({
      dryRun: false,
      summary: { total: 2, created: 2, rejected: 0 },
      results: okResult.results,
    });
    renderDialog();
    await uploadCsv(TWO_ROWS);
    fireEvent.click(await screen.findByRole("button", { name: /check 2 rows/i }));
    fireEvent.click(await screen.findByRole("button", { name: /create 2 links/i }));

    await waitFor(() => expect(commitLinkImport).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/2 links created/i)).toBeInTheDocument();
  });

  it("blocks the flow when there is no verified domain to import onto", async () => {
    useDomains.mockReturnValue({ data: [{ ...DOMAIN, verified: false }] });
    renderDialog();
    await uploadCsv("slug,url\nabout,https://a.com\n");

    expect(await screen.findByText(/connect and verify a domain/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /check 1 row/i })).toBeDisabled();
  });
});
