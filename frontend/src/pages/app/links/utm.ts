import type { CreateLinkPayload, UpdateLinkPayload } from "@/api/links";
import type { LinkItem } from "@/types/api";

/**
 * The single UTM implementation shared by Create Link and Edit Link: form state, seeding,
 * validation and the wire mapping. The backend owns persistence — link.service re-applies
 * the tags to the destination URL with buildUtmUrl on every save.
 */

/** The five campaign tags as they live in form state. */
interface UtmValues {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
}

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;

/** Field order, placeholders and API keys — mirrors the utm_* parameters utm.service writes. */
interface UtmFieldDef {
  key: keyof UtmValues;
  wire: "utmSource" | "utmMedium" | "utmCampaign" | "utmTerm" | "utmContent";
  placeholder: string;
  ariaLabel: string;
  /** true = the input spans both grid columns. */
  full?: boolean;
}

const UTM_FIELDS: readonly UtmFieldDef[] = [
  { key: "source", wire: "utmSource", placeholder: "utm_source *", ariaLabel: "UTM source (required)" },
  { key: "medium", wire: "utmMedium", placeholder: "utm_medium *", ariaLabel: "UTM medium (required)" },
  { key: "campaign", wire: "utmCampaign", placeholder: "utm_campaign *", ariaLabel: "UTM campaign (required)", full: true },
  { key: "term", wire: "utmTerm", placeholder: "utm_term (optional)", ariaLabel: "UTM term" },
  { key: "content", wire: "utmContent", placeholder: "utm_content (optional)", ariaLabel: "UTM content" },
];

/** Keys as Create Link sends them: trimmed, blank omitted entirely. */
type UtmCreatePatch = Pick<CreateLinkPayload, UtmFieldDef["wire"]>;

/** Keys as Edit Link sends them: trimmed, cleared tag nulled, untouched tag absent. */
type UtmUpdatePatch = Pick<UpdateLinkPayload, UtmFieldDef["wire"]>;

const UTM_REQUIRED_MESSAGE = "UTM source, medium and campaign are required when tagging a campaign.";

function emptyUtm(): UtmValues {
  return { source: "", medium: "", campaign: "", term: "", content: "" };
}

/** Seed form state from a saved link so existing tags are shown, not lost. */
function utmFromLink(link: LinkItem): UtmValues {
  return {
    source: link.utmSource ?? "",
    medium: link.utmMedium ?? "",
    campaign: link.utmCampaign ?? "",
    term: link.utmTerm ?? "",
    content: link.utmContent ?? "",
  };
}

function hasAnyUtm(utm: UtmValues): boolean {
  return UTM_KEYS.some((key) => utm[key]);
}

/** Source, medium and campaign become required the moment any tag is used. */
function utmMissingRequired(utm: UtmValues): boolean {
  return hasAnyUtm(utm) && (!utm.source || !utm.medium || !utm.campaign);
}

function utmCreatePayload(utm: UtmValues): UtmCreatePatch {
  return {
    utmSource: utm.source.trim() || undefined,
    utmMedium: utm.medium.trim() || undefined,
    utmCampaign: utm.campaign.trim() || undefined,
    utmTerm: utm.term.trim() || undefined,
    utmContent: utm.content.trim() || undefined,
  };
}

/**
 * Diff against the stored tags: untouched tags are left out so the backend keeps them
 * (and so saving an unrelated field never trips the UTM plan check), cleared tags go
 * null so they are removed from the destination URL.
 */
function utmUpdatePatch(stored: UtmValues, next: UtmValues): UtmUpdatePatch {
  const patch: UtmUpdatePatch = {};
  for (const field of UTM_FIELDS) {
    const before = stored[field.key].trim();
    const after = next[field.key].trim();
    if (before === after) continue;
    patch[field.wire] = after === "" ? null : after;
  }
  return patch;
}

export {
  UTM_FIELDS,
  UTM_REQUIRED_MESSAGE,
  emptyUtm,
  utmFromLink,
  hasAnyUtm,
  utmMissingRequired,
  utmCreatePayload,
  utmUpdatePatch,
};
export type { UtmValues, UtmCreatePatch, UtmUpdatePatch };
