import { Navigate } from "react-router-dom";
import { useSeo, ROUTE_SEO } from "@/lib/seo";
import { Container } from "@/components/ui/container";
import { PublicShell } from "@/components/public-shell";
import { findLegalDoc, LEGAL_UPDATED, type LegalBlock, type LegalDoc } from "./legal-data";

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="text-pretty text-[15px] leading-relaxed text-fg-secondary">
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul className="flex flex-col gap-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-[9px] size-1 shrink-0 rounded-full bg-brand"
              />
              <span className="text-sm leading-relaxed text-fg-secondary">{item}</span>
            </li>
          ))}
        </ul>
      );
    case "todo":
      return (
        <p className="rounded-md border border-dashed border-border-strong bg-elevated/40 px-4 py-3 text-[13px] leading-relaxed text-fg-muted">
          <span className="mr-2 font-mono text-[10px] font-medium tracking-[0.14em] text-brand uppercase">
            Todo
          </span>
          {block.text}
        </p>
      );
  }
}

function LegalSections({ doc }: { doc: LegalDoc }) {
  return (
    <div className="mt-10 flex flex-col gap-8">
      {doc.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="font-display text-lg font-medium tracking-[-0.01em]">
            {section.heading}
          </h2>
          <div className="mt-3 flex flex-col gap-4">
            {section.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function LegalPage({ slug }: { slug: string }) {
  const doc = findLegalDoc(slug);

  const routeSeo = ROUTE_SEO[`/${slug}`];
  useSeo(
    doc && routeSeo
      ? { title: routeSeo.title, description: doc.intro, canonicalPath: routeSeo.canonicalPath }
      : { title: doc ? `${doc.title} — LinkShift` : "LinkShift", canonicalPath: `/${slug}` },
  );

  if (!doc) return <Navigate to="/" replace />;

  return (
    <PublicShell>
      <Container>
        <div className="mx-auto max-w-2xl">
          <p className="ls-marquee">Legal</p>
          <h1 className="font-display mt-6 text-balance text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.1] font-medium tracking-[-0.015em]">
            {doc.title}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{doc.intro}</p>
          <p className="mt-2 font-mono text-[11px] text-fg-muted">
            Last updated {LEGAL_UPDATED}
          </p>

          <LegalSections doc={doc} />
        </div>
      </Container>
    </PublicShell>
  );
}

export { LegalPage, LegalSections };
