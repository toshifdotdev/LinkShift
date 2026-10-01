import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { fetchStatus } = vi.hoisted(() => ({ fetchStatus: vi.fn() }));
vi.mock("@/api/status", () => ({ fetchStatus }));

import { StatusPage } from "@/pages/status/status-page";
import { ThemeProvider } from "@/theme/theme";

const operational = {
    status: "operational" as const,
    updatedAt: "2026-09-30T12:00:00.000Z",
    components: [
        { id: "api", name: "API and redirects", status: "operational" as const },
        { id: "database", name: "Link and analytics storage", status: "operational" as const },
        { id: "cache", name: "Redirect cache", status: "operational" as const },
    ],
};

const renderPage = () =>
    render(
        <ThemeProvider>
            <MemoryRouter>
                <StatusPage />
            </MemoryRouter>
        </ThemeProvider>
    );

describe("StatusPage", () => {
    beforeEach(() => {
        fetchStatus.mockReset();
    });

    it("reports all components when everything is healthy", async () => {
        fetchStatus.mockResolvedValue(operational);
        renderPage();

        expect(await screen.findByText("All systems operational")).toBeInTheDocument();
        expect(screen.getByText("API and redirects")).toBeInTheDocument();
        expect(screen.getByText("Link and analytics storage")).toBeInTheDocument();
        expect(screen.getByText("Redirect cache")).toBeInTheDocument();
        expect(screen.getAllByText("Operational")).toHaveLength(3);
    });

    it("does not claim operational while the cache is degraded", async () => {
        fetchStatus.mockResolvedValue({
            ...operational,
            status: "degraded",
            components: operational.components.map((c) =>
                c.id === "cache" ? { ...c, status: "degraded" as const } : c,
            ),
        });
        renderPage();

        expect(await screen.findByText("Some systems are degraded")).toBeInTheDocument();
        expect(screen.getByText("Degraded")).toBeInTheDocument();
        expect(screen.queryByText("All systems operational")).not.toBeInTheDocument();
    });

    it("reports an outage when the database is down", async () => {
        fetchStatus.mockResolvedValue({
            ...operational,
            status: "down",
            components: operational.components.map((c) =>
                c.id === "database" ? { ...c, status: "down" as const } : c,
            ),
        });
        renderPage();

        expect(await screen.findByText("We are experiencing an outage")).toBeInTheDocument();
        expect(screen.getByText("Down")).toBeInTheDocument();
    });

    it("treats an unreachable status feed as an outage rather than staying silent", async () => {
        fetchStatus.mockRejectedValue(new Error("network down"));
        renderPage();

        expect(await screen.findByText("We are experiencing an outage")).toBeInTheDocument();
        expect(
            screen.getByText(/status feed itself could not be reached/i),
        ).toBeInTheDocument();
    });

    it("shows a checking state before the first response arrives", () => {
        fetchStatus.mockReturnValue(new Promise(() => {}));
        renderPage();

        expect(screen.getByText("Checking…")).toBeInTheDocument();
    });

    it("links to contact for anything not covered by the feed", async () => {
        fetchStatus.mockResolvedValue(operational);
        renderPage();

        await waitFor(() =>
            expect(screen.getByRole("link", { name: /contact form/i })).toHaveAttribute(
                "href",
                "/contact",
            )
        );
    });
});