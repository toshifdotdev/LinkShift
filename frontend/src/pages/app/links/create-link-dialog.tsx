import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Lock } from "lucide-react";
import { useState } from "react";
import { createLink } from "@/api/links";
import { getDomains } from "@/api/domains";
import { ApiError } from "@/api/client";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { UpgradeHint } from "./upgrade-hint";
import { cn } from "@/lib/utils";
import type { LinkItem } from "@/types/api";

const SLUG_RE = /^[a-zA-Z0-9_-]+$/;

const PASSWORD_RULES = [
  { key: "len", label: "8–64", test: (p: string) => p.length >= 8 && p.length <= 64 },
  { key: "lower", label: "a–z", test: (p: string) => /[a-z]/.test(p) },
  { key: "upper", label: "A–Z", test: (p: string) => /[A-Z]/.test(p) },
  { key: "digit", label: "0–9", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "!@#…", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

function CreateLinkDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (link: LinkItem) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const plan = user?.plan.name ?? "FREE";
  const canUseSlug = plan !== "FREE";
  const canUseUtm = plan === "CREATOR" || plan === "PRO";

  const [destination, setDestination] = useState("");
  const [name, setName] = useState("");
  const [domainId, setDomainId] = useState<string>("");
  const [advanced, setAdvanced] = useState(false);
  const [slug, setSlug] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [utm, setUtm] = useState({ source: "", medium: "", campaign: "", term: "", content: "" });
  const [fieldError, setFieldError] = useState<string | null>(null);

  const domains = useQuery({
    queryKey: ["domains"],
    queryFn: async () => (await getDomains()).data,
    enabled: open,
  });

  /* effective domain = user choice, else the default domain once loaded */
  const defaultDomain = domains.data?.find((d) => d.isDefault) ?? domains.data?.[0];
  const effectiveDomainId = domainId || defaultDomain?.id || "";

  const slugValid = !slug || (slug.length >= 3 && slug.length <= 50 && SLUG_RE.test(slug));
  const passwordValid = !usePassword || PASSWORD_RULES.every((r) => r.test(password));
  const destinationValid = /^https?:\/\/.+/i.test(destination.trim());

  const reset = () => {
    setDestination("");
    setName("");
    setDomainId("");
    setAdvanced(false);
    setSlug("");
    setExpiresAt("");
    setPassword("");
    setUsePassword(false);
    setUtm({ source: "", medium: "", campaign: "", term: "", content: "" });
    setFieldError(null);
  };

  const mutation = useMutation({
    mutationFn: createLink,
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["links"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
      onCreated(res.data);
      reset();
      onOpenChange(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!destinationValid) {
      setFieldError("Enter a valid destination URL starting with http:// or https://");
      return;
    }
    if (!effectiveDomainId) {
      setFieldError("Choose a domain for this link.");
      return;
    }
    if (!slugValid) {
      setFieldError("Slugs are 3–50 characters: letters, numbers, hyphens and underscores only.");
      return;
    }
    if (!passwordValid) {
      setFieldError("Password does not meet all requirements.");
      return;
    }
    const hasUtm = Boolean(utm.source || utm.medium || utm.campaign || utm.term || utm.content);
    if (hasUtm && (!utm.source || !utm.medium || !utm.campaign)) {
      setFieldError("UTM source, medium and campaign are required when tagging a campaign.");
      return;
    }

    mutation.mutate({
      targetUrl: destination.trim(),
      name: name.trim() || undefined,
      domainId: effectiveDomainId,
      slug: slug.trim() || undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      password: usePassword && password ? password : undefined,
      utmSource: utm.source.trim() || undefined,
      utmMedium: utm.medium.trim() || undefined,
      utmCampaign: utm.campaign.trim() || undefined,
      utmTerm: utm.term.trim() || undefined,
      utmContent: utm.content.trim() || undefined,
    });
  }

  /* surface backend 403s as upgrade moments */
  const backendError = mutation.error instanceof ApiError ? mutation.error : null;
  const is403 = backendError?.status === 403;
  const backendMessage = backendError?.message ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>Create a new link</DialogTitle>
        <p className="mt-1 text-sm text-fg-secondary">
          Paste a destination — everything else is optional.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
          <Field>
            <FieldLabel htmlFor="create-destination">Destination URL</FieldLabel>
            <Input
              id="create-destination"
              value={destination}
              onChange={(e) => { setDestination(e.target.value); setFieldError(null); }}
              placeholder="https://example.com/your-long-page"
              autoFocus
              aria-invalid={!!fieldError && !destinationValid}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="create-name">
                Name <span className="text-fg-muted">(optional)</span>
              </FieldLabel>
              <Input
                id="create-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Launch campaign"
                maxLength={50}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="create-domain">Domain</FieldLabel>
              <select
                id="create-domain"
                value={effectiveDomainId}
                onChange={(e) => setDomainId(e.target.value)}
                className="h-9 w-full cursor-pointer rounded-md border border-input bg-surface px-3 text-sm text-foreground transition-colors hover:border-border-strong focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-ring/40"
              >
                {domains.isPending && <option>Loading domains…</option>}
                {domains.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.host}
                    {d.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <FieldHint>Your short link will live on this domain.</FieldHint>
            </Field>
          </div>

          {/* advanced */}
          <div className="rounded-md border border-border">
            <button
              type="button"
              onClick={() => setAdvanced((v) => !v)}
              aria-expanded={advanced}
              className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-[13px] font-medium text-fg-secondary">
                Advanced options
                <span className="ml-2 font-mono text-[10px] text-fg-muted">
                  slug · expiry · password · UTM
                </span>
              </span>
              <ChevronDown
                className={cn("size-4 text-fg-muted transition-transform duration-200", advanced && "rotate-180")}
                aria-hidden="true"
              />
            </button>

            {advanced && (
              <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
                {/* custom slug */}
                <Field>
                  <FieldLabel htmlFor="create-slug">
                    Custom slug
                    {!canUseSlug && (
                      <span className="ml-2 inline-flex items-center gap-1 font-mono text-[9px] tracking-wide text-brand uppercase">
                        <Lock className="size-2.5" /> Starter+
                      </span>
                    )}
                  </FieldLabel>
                  {canUseSlug ? (
                    <>
                      <Input
                        id="create-slug"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="my-custom-path"
                        maxLength={50}
                        aria-invalid={!!slug && !slugValid}
                      />
                      <FieldHint>
                        go.linkshift.in/<span className="text-brand">{slug || "your-slug"}</span>
                      </FieldHint>
                      <FieldError>{slug && !slugValid ? "3–50 characters: letters, numbers, hyphens, underscores." : null}</FieldError>
                    </>
                  ) : (
                    <UpgradeHint
                      feature="Custom slugs let you choose the exact words after the domain."
                      requirement="Starter or higher"
                    />
                  )}
                </Field>

                {/* expiry */}
                <Field>
                  <FieldLabel htmlFor="create-expiry">
                    Expires at <span className="text-fg-muted">(optional)</span>
                  </FieldLabel>
                  <Input
                    id="create-expiry"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="[color-scheme:dark]"
                  />
                  <FieldHint>The link stops resolving (410) after this moment.</FieldHint>
                </Field>

                {/* password */}
                <Field>
                  <label htmlFor="create-use-password" className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-secondary">
                    <input
                      id="create-use-password"
                      type="checkbox"
                      checked={usePassword}
                      onChange={(e) => setUsePassword(e.target.checked)}
                      className="size-3.5 accent-[#E8590C]"
                    />
                    Require a password to open
                  </label>
                  {usePassword && (
                    <>
                      <PasswordInput
                        id="create-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password visitors must enter"
                        autoComplete="new-password"
                      />
                      <ul className="flex flex-wrap gap-1.5" aria-label="Password requirements">
                        {PASSWORD_RULES.map((r) => (
                          <li
                            key={r.key}
                            className={cn(
                              "rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wide uppercase transition-colors",
                              r.test(password)
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : "border-border bg-elevated text-fg-muted",
                            )}
                          >
                            {r.label}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Field>

                {/* UTM */}
                <div className="rounded-md border border-border p-3.5">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-fg-secondary">
                    UTM campaign tagging
                    {!canUseUtm && (
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-wide text-brand uppercase">
                        <Lock className="size-2.5" /> Creator/Pro
                      </span>
                    )}
                  </p>
                  {canUseUtm ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Input value={utm.source} onChange={(e) => setUtm({ ...utm, source: e.target.value })} placeholder="utm_source *" aria-label="UTM source (required)" />
                      <Input value={utm.medium} onChange={(e) => setUtm({ ...utm, medium: e.target.value })} placeholder="utm_medium *" aria-label="UTM medium (required)" />
                      <Input value={utm.campaign} onChange={(e) => setUtm({ ...utm, campaign: e.target.value })} placeholder="utm_campaign *" aria-label="UTM campaign (required)" className="sm:col-span-2" />
                      <Input value={utm.term} onChange={(e) => setUtm({ ...utm, term: e.target.value })} placeholder="utm_term (optional)" aria-label="UTM term" />
                      <Input value={utm.content} onChange={(e) => setUtm({ ...utm, content: e.target.value })} placeholder="utm_content (optional)" aria-label="UTM content" />
                      <p className="text-xs text-fg-muted sm:col-span-2">
                        Appended to the destination URL and tracked on every scan.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <UpgradeHint
                        feature="Tag scans by campaign, source and medium — reported in analytics and CSV exports."
                        requirement="Creator or Pro"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {fieldError && <FieldError>{fieldError}</FieldError>}
          {backendMessage && (
            <FieldError>{backendMessage}</FieldError>
          )}
          {is403 && (
            <UpgradeHint
              feature={backendMessage ?? "This capability"}
              requirement="a higher plan"
              className="border-brand/25"
            />
          )}

          <div className="mt-1 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending} loadingLabel="Creating link…">
              Create link
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { CreateLinkDialog };
