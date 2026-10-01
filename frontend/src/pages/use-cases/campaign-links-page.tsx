import { UseCasePage } from "@/pages/use-cases/use-case-page";
import { USE_CASES } from "@/pages/use-cases/use-case-content";

export function CampaignLinksPage() {
  const content = USE_CASES["/campaign-links"];

  return (
    <UseCasePage
      seo={{
        title: content.seo.title,
        description: content.seo.description,
        canonicalPath: content.seo.canonicalPath,
      }}
      kicker={content.kicker}
      headline={content.headline}
      subhead={content.subhead}
      proof={content.proof}
      steps={content.steps}
      capabilities={content.capabilities}
      faqs={content.faqs}
      ctaLabel={content.ctaLabel}
    />
  );
}