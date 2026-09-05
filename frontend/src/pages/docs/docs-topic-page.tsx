import { Image } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useSeo, buildBreadcrumbJsonLd } from "@/lib/seo";
import { Container } from "@/components/ui/container";
import { PublicShell } from "@/components/public-shell";
import { findTopic, type DocBlock } from "./docs-data";

function MediaPlaceholder({ label }: { label: string }) {
  return (
    <figure className="mt-6">
      <div
        role="img"
        aria-label={`Media placeholder: ${label}`}
        className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-elevated/40 px-6 text-center"
      >
        <Image className="size-5 text-fg-muted" aria-hidden="true" />
        <p className="font-mono text-[10px] font-medium tracking-[0.16em] text-fg-muted uppercase">
          Media placeholder
        </p>
      </div>
      <figcaption className="mt-2 font-mono text-[11px] text-fg-muted">
        FIG — {label}
      </figcaption>
    </figure>
  );
}

function Block({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="text-pretty text-[15px] leading-relaxed text-fg-secondary">
          {block.text}
        </p>
      );
    case "steps":
      return (
        <ol className="flex flex-col gap-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3.5">
              <span className="mt-0.5 font-mono text-[11px] font-medium tracking-[0.08em] text-brand tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm leading-relaxed text-fg-secondary">{item}</span>
            </li>
          ))}
        </ol>
      );
    case "example":
      return (
        <div className="overflow-x-auto rounded-md border border-border bg-elevated/60 px-4 py-3">
          <pre className="font-mono text-[11.5px] leading-relaxed whitespace-pre text-fg-secondary">
            {block.lines.join("\n")}
          </pre>
        </div>
      );
    case "note":
      return (
        <p className="rounded-md border border-border bg-elevated/60 px-4 py-3 text-[13px] leading-relaxed text-fg-secondary">
          <span className="mr-2 font-mono text-[10px] font-medium tracking-[0.14em] text-brand uppercase">
            Note
          </span>
          {block.text}
        </p>
      );
    case "media":
      return <MediaPlaceholder label={block.label} />;
  }
}

function DocsTopicPage() {
  const { slug } = useParams();
  const entry = findTopic(slug ?? "");

  useSeo(
    entry
      ? {
          title: `${entry.topic.title} — LinkShift Docs`,
          description: entry.topic.summary,
          canonicalPath: `/docs/${entry.topic.slug}`,
          jsonLd: buildBreadcrumbJsonLd([
            { name: "Docs", path: "/docs" },
            { name: entry.category.title, path: `/docs` },
            { name: entry.topic.title, path: `/docs/${entry.topic.slug}` },
          ]),
        }
      : {
          title: "Documentation — LinkShift",
          canonicalPath: "/docs",
        },
  );

  if (!entry) return <Navigate to="/docs" replace />;

  const { category, topic } = entry;
  const index = category.topics.findIndex((t) => t.slug === topic.slug);
  const prev = category.topics[index - 1];
  const next = category.topics[index + 1];

  return (
    <PublicShell>
      <Container>
        <div className="mx-auto max-w-2xl">
          <nav aria-label="Breadcrumb" className="ls-marquee">
            <Link to="/docs" className="transition-colors hover:text-foreground">
              Docs
            </Link>
            <span aria-hidden="true">/</span>
            <span>{category.title}</span>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">{topic.title}</span>
          </nav>

          <h1 className="font-display mt-6 text-balance text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.1] font-medium tracking-[-0.015em]">
            {topic.title}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{topic.summary}</p>

          <div className="mt-8 flex flex-col gap-6">
            {topic.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>

          <nav
            aria-label="More topics"
            className="mt-12 flex items-stretch justify-between gap-4 border-t border-border pt-6"
          >
            {prev ? (
              <Link
                to={`/docs/${prev.slug}`}
                className="group flex max-w-[48%] flex-col gap-1 text-left"
              >
                <span className="font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                  ← Previous
                </span>
                <span className="truncate text-sm text-fg-secondary transition-colors group-hover:text-foreground">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}
            {next ? (
              <Link
                to={`/docs/${next.slug}`}
                className="group flex max-w-[48%] flex-col gap-1 text-right"
              >
                <span className="font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                  Next →
                </span>
                <span className="truncate text-sm text-fg-secondary transition-colors group-hover:text-foreground">
                  {next.title}
                </span>
              </Link>
            ) : (
              <Link to="/docs" className="group flex flex-col gap-1 text-right">
                <span className="font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                  All docs →
                </span>
                <span className="text-sm text-fg-secondary transition-colors group-hover:text-foreground">
                  Back to the index
                </span>
              </Link>
            )}
          </nav>

          <div className="mt-10 rounded-lg border border-border bg-surface p-5">
            <p className="ls-marquee">More in {category.title}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {category.topics
                .filter((t) => t.slug !== topic.slug)
                .map((t) => (
                  <li key={t.slug}>
                    <Link
                      to={`/docs/${t.slug}`}
                      className="text-sm text-fg-secondary transition-colors hover:text-foreground"
                    >
                      {t.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </Container>
    </PublicShell>
  );
}

export { DocsTopicPage };
