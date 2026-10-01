import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import {
    OnboardingChecklist,
    type OnboardingState,
} from "@/components/app/onboarding-checklist";

const state = (over: Partial<OnboardingState> = {}): OnboardingState => ({
    emailVerified: true,
    hasVerifiedDomain: false,
    hasLink: false,
    complete: false,
    ...over,
});

const renderChecklist = (value: OnboardingState) =>
    render(
        <MemoryRouter>
            <OnboardingChecklist state={value} />
        </MemoryRouter>
    );

describe("OnboardingChecklist", () => {
    it("stays hidden once onboarding is complete", () => {
        const { container } = renderChecklist(
            state({ hasVerifiedDomain: true, hasLink: true, complete: true })
        );

        expect(container).toBeEmptyDOMElement();
    });

    it("shows every step with nothing done", () => {
        renderChecklist(state({ emailVerified: false }));

        expect(screen.getByText("Getting started")).toBeInTheDocument();
        expect(screen.getByText("Confirm your email address")).toBeInTheDocument();
        expect(screen.getByText("Connect a domain you own")).toBeInTheDocument();
        expect(screen.getByText("Create your first short link")).toBeInTheDocument();
        expect(screen.getByText("3 steps left")).toBeInTheDocument();
    });

    it("ticks off the domain step once a domain is verified", () => {
        renderChecklist(state({ hasVerifiedDomain: true }));

        const domainStep = screen.getByText("Connect a domain you own");
        expect(domainStep.className).toContain("line-through");
        expect(screen.getByText("1 step left")).toBeInTheDocument();
    });

    it("still offers the first link after the domain is done", () => {
        renderChecklist(state({ hasVerifiedDomain: true }));

        expect(
            screen.queryByRole("link", { name: /connect a domain/i })
        ).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: /create a link/i })).toHaveAttribute(
            "href",
            "/app/links"
        );
    });

    it("points the remaining step at the domains page", () => {
        renderChecklist(state({ hasLink: true }));

        expect(screen.getByRole("link", { name: /connect a domain/i })).toHaveAttribute(
            "href",
            "/app/domains"
        );
        expect(screen.getByText("1 step left")).toBeInTheDocument();
    });
});