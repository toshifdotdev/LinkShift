import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Lock } from "lucide-react";
import { useState } from "react";
import { createLink } from "@/api/links";
import { ApiError } from "@/api/client";
import { useSession } from "@/auth/session";
import { useDomains } from "@/hooks/use-domains";
import { Lamp } from "@/components/ui/lamp";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { UpgradeHint } from "./upgrade-hint";
import { cn } from "@/lib/utils";
import { DEFAULT_SHORT_DOMAIN } from "@/lib/short-url";
import type { LinkItem } from "@/types/api";

const SLUG_RE = /^[a-zA-Z0-9_-]+$/;
const APP_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*$/;
const ANDROID_PACKAGE_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

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
  const canUseDeepLink = plan === "PRO";

  const [destination, setDestination] = useState("");
  const [name, setName] = useState("");
  const [domainId, setDomainId] = useState<string>("");
  const [advanced, setAdvanced] = useState(false);
  const [slug, setSlug] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [deepLink, setDeepLink] = useState(false);
  const [appDeepLink, setAppDeepLink] = useState(false);
  const [appScheme, setAppScheme] = useState("");
  const [androidPackage, setAndroidPackage] = useState("");
  const [appPath, setAppPath] = useState("");
  const [iosStoreUrl, setIosStoreUrl] = useState("");
  const [androidStoreUrl, setAndroidStoreUrl] = useState("");
  const [utm, setUtm] = useState({ source: "", medium: "", campaign: "", term: "", content: "" });
  const [fieldError, setFieldError] = useState<string | null>(null);

  const domains = useDomains({ enabled: open });

  /* effective domain = user choice, else the default domain once loaded */
  const defaultDomain = domains.data?.find((d) => d.host === DEFAULT_SHORT_DOMAIN) ?? domains.data?.find((d) => d.isDefault) ?? domains.data?.[0];
  const effectiveDomainId = domainId || defaultDomain?.id || "";
  const domainHost = domains.data?.find((d) => d.id === effectiveDomainId)?.host ?? DEFAULT_SHORT_DOMAIN;

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
    setDeepLink(false);
    setAppDeepLink(false);
    setAppScheme("");
    setAndroidPackage("");
    setAppPath("");
    setIosStoreUrl("");
    setAndroidStoreUrl("");
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
      setFieldError("Enter a valid destination URL. It must start with http:// or https://");
      return;
    }
    if (!effectiveDomainId) {
      setFieldError("Choose a domain for this link.");
      return;
    }
    if (!slugValid) {
      setFieldError("Slugs are 3 to 50 characters. Letters, numbers, hyphens, and underscores only.");
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
    if (appDeepLink) {
      if (!appScheme.trim()) {
        setFieldError("A URI scheme is required to enable mobile app deep linking.");
        return;
      }
      if (!APP_SCHEME_RE.test(appScheme.trim())) {
        setFieldError("App scheme is invalid. Use letters, digits, +, . or -, starting with a letter (e.g. myapp).");
        return;
      }
      if (androidPackage.trim() && !ANDROID_PACKAGE_RE.test(androidPackage.trim())) {
        setFieldError("Android package looks invalid. Expected something like com.example.app.");
        return;
      }
    }

    mutation.mutate({
      targetUrl: destination.trim(),
      name: name.trim() || undefined,
      domainId: effectiveDomainId,
      slug: slug.trim() || undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      password: usePassword && password ? password : undefined,
      deepLink: deepLink || undefined,
      appDeepLink: appDeepLink || undefined,
      appScheme: appDeepLink ? appScheme.trim() || undefined : undefined,
      androidPackage: appDeepLink ? androidPackage.trim() || undefined : undefined,
      appPath: appDeepLink ? appPath.trim() || undefined : undefined,
      iosStoreUrl: appDeepLink ? iosStoreUrl.trim() || undefined : undefined,
      androidStoreUrl: appDeepLink ? androidStoreUrl.trim() || undefined : undefined,
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
          Paste a destination. Everything else is optional.
        </p>

        {/* The live slug preview — a single line that always reads as
            `go.linkshift.in/<slug>` and updates as the user types or as
            the auto-generated slug changes. The slug slot is the chip. */}
        <div
          aria-label="Short link preview"
          className="mt-4 flex items-center gap-2 rounded-md border border-border bg-sunken/50 px-3 py-2 font-mono text-[12.5px]"
        >
          <span className="shrink-0 text-fg-muted/80">{domainHost}/</span>
          <span className="min-w-0 truncate font-medium text-foreground">
            {canUseSlug ? (slug.trim() || "your-slug") : "your-slug"}
          </span>
          <Lamp tone="dim" className="ml-auto">
            {canUseSlug ? "Custom" : "Auto"}
          </Lamp>
        </div>

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
                {(domains.data ?? [])
                  .filter((d) => d.verified || d.isDefault)
                  .map((d) => (
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
                Advanced
                <span className="ml-2 font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">
                  slug · expiry · password · UTM · forwarding · app links
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
                      <span className="ml-2 inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.16em] text-brand uppercase">
                        <Lock className="size-2.5" /> Starter and above
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
                        <span className="text-fg-muted/70">{domainHost}/</span>
                        <span className="text-foreground">{slug || "your-slug"}</span>
                      </FieldHint>
                      <FieldError>
                        {slug && !slugValid ? "3 to 50 characters. Letters, numbers, hyphens, underscores." : null}
                      </FieldError>
                    </>
                  ) : (
                    <UpgradeHint
                      feature="Custom slugs let you choose the exact words after the domain."
                      requirement="Starter or above"
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
                              "rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.16em] uppercase transition-colors",
                              r.test(password)
                                ? "border-success/30 bg-success-soft text-success"
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
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.16em] text-brand uppercase">
                        <Lock className="size-2.5" /> Creator and above
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
                        Appended to the destination URL. Every scan carries it.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <UpgradeHint
                        feature="Tag scans by campaign, source, and medium. Reported in analytics and CSV exports."
                        requirement="Creator or above"
                      />
                    </div>
                  )}
                </div>

                {/* path forwarding */}
                <div className="rounded-md border border-border p-3.5">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-fg-secondary">
                    Path forwarding
                    {!canUseDeepLink && (
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.16em] text-brand uppercase">
                        <Lock className="size-2.5" /> Pro only
                      </span>
                    )}
                    <a
                      href="/docs/path-forwarding"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto font-mono text-[9px] tracking-[0.16em] text-brand uppercase transition-colors hover:text-brand-hover"
                    >
                      How it works ↗
                    </a>
                  </p>
                  {canUseDeepLink ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <label htmlFor="create-deep-link" className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-secondary">
                        <input
                          id="create-deep-link"
                          type="checkbox"
                          checked={deepLink}
                          onChange={(e) => setDeepLink(e.target.checked)}
                          className="size-3.5 accent-[#E8590C]"
                        />
                        Forward appended paths and query strings to the destination
                      </label>
                      <p className="text-xs text-fg-muted">
                        <span className="font-mono text-[11px] text-fg-secondary">…/slug/products/5?ref=x</span>{" "}
                        resolves to the same path and query on your destination.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <UpgradeHint
                        feature="Route visitors to any path on your destination through one short link."
                        requirement="Pro"
                      />
                    </div>
                  )}
                </div>

                {/* mobile app deep linking */}
                <div className="rounded-md border border-border p-3.5">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-fg-secondary">
                    Mobile app deep linking
                    {!canUseDeepLink && (
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.16em] text-brand uppercase">
                        <Lock className="size-2.5" /> Pro only
                      </span>
                    )}
                    <a
                      href="/docs/mobile-app-deep-linking"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto font-mono text-[9px] tracking-[0.16em] text-brand uppercase transition-colors hover:text-brand-hover"
                    >
                      Setup guide ↗
                    </a>
                  </p>
                  {canUseDeepLink ? (
                    <div className="mt-3 flex flex-col gap-3">
                      <label htmlFor="create-app-deep-link" className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-secondary">
                        <input
                          id="create-app-deep-link"
                          type="checkbox"
                          checked={appDeepLink}
                          onChange={(e) => setAppDeepLink(e.target.checked)}
                          className="size-3.5 accent-[#E8590C]"
                        />
                        Open your app on mobile when it's installed
                      </label>
                      {appDeepLink && (
                        <>
                          <p className="text-xs text-fg-muted">
                            You provide your app's identifiers below. LinkShift can't infer
                            them from a website URL.{" "}
                            <a
                              href="/docs/mobile-app-deep-linking"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand transition-colors hover:text-brand-hover"
                            >
                              How do I find these?
                            </a>
                            {" · "}
                            <a
                              href="/docs/mobile-app-deep-linking"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand transition-colors hover:text-brand-hover"
                            >
                              View example
                            </a>
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field>
                              <FieldLabel htmlFor="create-app-scheme">App URI scheme *</FieldLabel>
                              <Input
                                id="create-app-scheme"
                                value={appScheme}
                                onChange={(e) => setAppScheme(e.target.value)}
                                placeholder="myapp"
                                maxLength={100}
                              />
                              <FieldHint>
                                The scheme your app registers. Just the name, e.g.{" "}
                                <span className="font-mono">myapp</span> for{" "}
                                <span className="font-mono">myapp://</span>.
                              </FieldHint>
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="create-android-package">Android package</FieldLabel>
                              <Input
                                id="create-android-package"
                                value={androidPackage}
                                onChange={(e) => setAndroidPackage(e.target.value)}
                                placeholder="com.example.app"
                                maxLength={255}
                              />
                              <FieldHint>
                                Your app's package name, e.g.{" "}
                                <span className="font-mono">com.example.app</span>. Enables
                                Chrome's native handoff on Android.
                              </FieldHint>
                            </Field>
                          </div>
                          <Field>
                            <FieldLabel htmlFor="create-app-path">
                              In-app path prefix <span className="text-fg-muted">(optional)</span>
                            </FieldLabel>
                            <Input
                              id="create-app-path"
                              value={appPath}
                              onChange={(e) => setAppPath(e.target.value)}
                              placeholder="content/home"
                              maxLength={1024}
                            />
                            <FieldHint>
                              The screen to open inside your app; any path the visitor
                              appends is placed after it.
                            </FieldHint>
                          </Field>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field>
                              <FieldLabel htmlFor="create-ios-store">
                                App Store URL <span className="text-fg-muted">(optional)</span>
                              </FieldLabel>
                              <Input
                                id="create-ios-store"
                                value={iosStoreUrl}
                                onChange={(e) => setIosStoreUrl(e.target.value)}
                                placeholder="https://apps.apple.com/…"
                              />
                              <FieldHint>Offered on iOS when the app isn't installed.</FieldHint>
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="create-android-store">
                                Play Store URL <span className="text-fg-muted">(optional)</span>
                              </FieldLabel>
                              <Input
                                id="create-android-store"
                                value={androidStoreUrl}
                                onChange={(e) => setAndroidStoreUrl(e.target.value)}
                                placeholder="https://play.google.com/…"
                              />
                              <FieldHint>
                                Chrome's fallback on Android when the app isn't installed.
                              </FieldHint>
                            </Field>
                          </div>
                          <p className="text-xs text-fg-muted">
                            Mobile visitors go to the app when it's installed and to your
                            destination otherwise. Desktop always goes to the destination.
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <UpgradeHint
                        feature="Send mobile visitors straight into your app, with a web fallback when it isn't installed."
                        requirement="Pro"
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
              requirement="A higher plan"
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
