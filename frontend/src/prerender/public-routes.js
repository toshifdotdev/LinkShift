import { DOC_CATEGORIES } from "../pages/docs/docs-data.ts";
export const STATIC_PUBLIC_PATHS = [
    "/",
    "/pricing",
    "/docs",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/refunds",
    "/shipping",
    "/acceptable-use",
    "/register",
];
export const PUBLIC_PATHS = [
    ...STATIC_PUBLIC_PATHS,
    ...DOC_CATEGORIES.flatMap((category) => category.topics.map((topic) => `/docs/${topic.slug}`)),
];
