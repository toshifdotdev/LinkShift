

import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import App from "@/App";
import { ThemeProvider } from "@/theme/theme";
import { SessionProvider } from "@/auth/session";
import { ToastProvider } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
    ROUTE_SEO,
    buildLandingJsonLd,
    buildFaqJsonLd,
    buildBreadcrumbJsonLd,
} from "@/lib/seo";
import { DOC_CATEGORIES } from "@/pages/docs/docs-data";
import { FAQ_GROUPS } from "@/pages/faq/faq-page";
import { PUBLIC_PATHS } from "./public-routes";

export { PUBLIC_PATHS, ROUTE_SEO };

export interface PrerenderHead {
    title: string;
    description: string;
    canonical: string;
    jsonLd?: Record<string, unknown>;
}


const queryClient = new QueryClient({
    defaultOptions: { queries: { enabled: false, retry: false } },
});


export function renderRoute(path: string): string {
    return renderToString(
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <MotionConfig reducedMotion="user">
                    <MemoryRouter initialEntries={[path]}>
                        <SessionProvider>
                            <ToastProvider>
                                <TooltipProvider>
                                    <App />
                                </TooltipProvider>
                            </ToastProvider>
                        </SessionProvider>
                    </MemoryRouter>
                </MotionConfig>
            </QueryClientProvider>
        </ThemeProvider>,
    );
}


export function jsonLdForPath(path: string): Record<string, unknown> | undefined {
    if (path === "/") return buildLandingJsonLd();
    if (path === "/faq") {
        return buildFaqJsonLd(FAQ_GROUPS.flatMap((group) => group.entries));
    }
    const match = DOC_CATEGORIES.flatMap((category) =>
        category.topics.map((topic) => ({ category, topic })),
    ).find((entry) => `/docs/${entry.topic.slug}` === path);
    if (match) {
        return buildBreadcrumbJsonLd([
            { name: "Docs", path: "/docs" },
            { name: match.category.title, path: "/docs" },
            { name: match.topic.title, path: `/docs/${match.topic.slug}` },
        ]);
    }
    return undefined;
}

export function headForPath(path: string): PrerenderHead {
    
    
    const route = ROUTE_SEO[path];
    if (route) {
        return {
            title: route.title,
            description: route.description,
            canonical: `https://linkshift.in${route.canonicalPath}`,
            jsonLd: jsonLdForPath(path),
        };
    }

    const match = DOC_CATEGORIES.flatMap((category) =>
        category.topics.map((topic) => ({ category, topic })),
    ).find((entry) => `/docs/${entry.topic.slug}` === path);
    if (match) {
        return {
            title: `${match.topic.title} — LinkShift Docs`,
            description: match.topic.summary,
            canonical: `https://linkshift.in/docs/${match.topic.slug}`,
            jsonLd: jsonLdForPath(path),
        };
    }

    throw new Error(`No SEO metadata registered for prerendered path: ${path}`);
}
