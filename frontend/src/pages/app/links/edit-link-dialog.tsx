import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/api/client";
import { getDomains } from "@/api/domains";
import { updateLink } from "@/api/links";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { UpgradeHint } from "./upgrade-hint";
import { cn } from "@/lib/utils";
import { toLocalInputValue, fromLocalInputValue } from "./utils";
import type { LinkItem } from "@/types/api";

const SLUG_RE = /^[a-zA-Z0-9_-]+$/;
const PASSWORD_RULES = [
  { key: "len", label: "8–64", test: (p: string) => p.length >= 8 && p.length <= 64 },
  { key: "lower", label: "a–z", test: (p: string) => /[a-z]/.test(p) },
  { key: "upper", label: "A–Z", test: (p: string) => /[A-Z]/.test(p) },
  { key: "digit", label: "0–9", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "!@#…", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

type PasswordChoice = "keep" | "replace" | "remove";

function EditLinkDialog({
  link,
  onClose,
  onSaved,
}: {
  link: LinkItem;
  onClose: () => void;
  onSaved: (link: LinkItem) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const plan = user?.plan.name ?? "FREE";
  const canUseSlug = plan !== "FREE";

  /* The parent mounts this component per-edit (keyed by link id), so
     initializers run fresh for every edit session — no seeding effects. */
  const [name, setName] = useState(link.name ?? "");
  const [targetUrl, setTargetUrl] = useState(link.targetUrl);
  const [isActive, setIsActive] = useState(link.isActive);
  const [slug, setSlug] = useState(link.shortId);
  const [expiry, setExpiry] = useState(toLocalInputValue(link.expiresAt));
  const [passwordChoice, setPasswordChoice] = useState<PasswordChoice>("keep");
  const [newPassword, setNewPassword] = useState("");
  const [switchDomain, setSwitchDomain] = useState(false);
  const [domainId, setDomainId] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  /* mounted only while an edit session is open, so fetch immediately */
  const domains = useQuery({
    queryKey: ["domains"],
    queryFn: async () => (await getDomains()).data,
  });

  function close() {
    onClose();
  }

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateLink>[1]) => updateLink(link.id, payload),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["links"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
      onSaved(res.data);
      close();
    },
  });

  const slugChanged = slug !== link.shortId;
  const slugValid = !slugChanged || (slug.length >= 3 && slug.length <= 50 && SLUG_RE.test(slug));
  const destinationValid = /^https?:\/\/.+/i.test(targetUrl.trim());
  const passwordValid =
    passwordChoice !== "replace" || PASSWORD_RULES.every((r) => r.test(newPassword));

  const backendError = mutation.error instanceof ApiError ? mutation.error : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (!destinationValid) {
      setFieldError("Destination must be a valid http(s) URL.");
      return;
    }
    if (!slugValid) {
      setFieldError("Slugs are 3–50 characters: letters, numbers, hyphens and underscores.");
      return;
    }
    if (!passwordValid) {
      setFieldError("New password does not meet all requirements.");
      return;
    }

    void mutation.mutateAsync({
      /* always sent — the backend clears expiry when it is omitted */
      expiresAt: fromLocalInputValue(expiry),
      name: name.trim() || " ",
      targetUrl: targetUrl.trim(),
      isActive,
      slug: slugChanged ? slug.trim() : undefined,
      domainId: switchDomain && domainId ? domainId : undefined,
      password:
        passwordChoice === "replace" ? newPassword : passwordChoice === "remove" ? null : undefined,
    });
  }

  const selectClass =
    "h-9 w-full cursor-pointer rounded-md border border-input bg-surface px-3 text-sm text-foreground transition-colors hover:border-border-strong focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-ring/40";

  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>Edit link</DialogTitle>
        <p className="mt-1 truncate font-mono text-[11px]">
          <span className="text-fg-muted">go.linkshift.in/</span>
          <span className="text-brand">{link?.shortId}</span>
        </p>

        {link && (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
            <Field>
              <FieldLabel htmlFor="edit-name">Name</FieldLabel>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-destination">Destination URL</FieldLabel>
              <Input
                id="edit-destination"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                aria-invalid={!!targetUrl && !destinationValid}
              />
              <FieldHint>
                Changing the destination counts against your monthly destination edits.
                {link.targetUrl.includes("utm_") && " This link carries UTM parameters — they are re-applied automatically."}
              </FieldHint>
              <FieldError>{targetUrl && !destinationValid ? "Enter a valid http(s) URL." : null}</FieldError>
            </Field>

            {/* UTM honesty: stored UTM values are not returned by the API */}
            {link.targetUrl.includes("utm_") && (
              <div className="flex items-start gap-2.5 rounded-md border border-border bg-elevated/60 px-3.5 py-3">
                <Info className="mt-0.5 size-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-fg-muted">
                  This link has UTM parameters attached. Editing existing UTM values arrives with a
                  backend mapper update — recreating the link with new UTM tags is the current path.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-slug">
                  Slug
                  {!canUseSlug && (
                    <span className="ml-2 inline-flex items-center gap-1 font-mono text-[9px] tracking-wide text-brand uppercase">
                      Starter+ to change
                    </span>
                  )}
                </FieldLabel>
                {canUseSlug ? (
                  <>
                    <Input
                      id="edit-slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      aria-invalid={slugChanged && !slugValid}
                    />
                    <FieldError>
                      {slugChanged && !slugValid
                        ? "3–50 characters: letters, numbers, hyphens, underscores."
                        : null}
                    </FieldError>
                  </>
                ) : (
                  <>
                    <Input id="edit-slug" value={slug} disabled aria-describedby="edit-slug-locked" />
                    <FieldHint>
                      <span id="edit-slug-locked">
                      <button
                        type="button"
                        onClick={close}
                        className="text-brand underline-offset-4 hover:underline"
                      >
                        Upgrade
                      </button>{" "}
                      to change the slug after creation.
                      </span>
                    </FieldHint>
                  </>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-expiry">Expires at</FieldLabel>
                <Input
                  id="edit-expiry"
                  type="datetime-local"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="[color-scheme:dark]"
                />
                <FieldError>
                  {isExpiredCheck(expiry) ? "This moment is in the past — the link will 410 immediately." : null}
                </FieldError>
                <FieldHint>Clear the field to remove the expiry.</FieldHint>
              </Field>
            </div>

            {/* password tri-state */}
            <Field>
              <FieldLabel>Password</FieldLabel>
              <div
                role="radiogroup"
                aria-label="Password protection"
                className="flex flex-wrap items-center gap-2"
              >
                {(
                  [
                    ["keep", "No change"],
                    ["replace", "Set new"],
                    ["remove", "Remove"],
                  ] as Array<[PasswordChoice, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={passwordChoice === value}
                                        onClick={() => setPasswordChoice(value)}
                    className={cn(
                      "h-8 cursor-pointer rounded-md border px-3 text-[12px] font-medium transition-colors",
                      passwordChoice === value
                        ? "border-border-strong bg-raised text-foreground"
                        : "border-border bg-surface text-fg-muted hover:text-fg-secondary disabled:opacity-35",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {passwordChoice === "replace" && (
                <>
                  <PasswordInput
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="New password for visitors"
                  />
                  <ul className="flex flex-wrap gap-1.5" aria-label="Password requirements">
                    {PASSWORD_RULES.map((r) => (
                      <li
                        key={r.key}
                        className={cn(
                          "rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wide uppercase transition-colors",
                          r.test(newPassword)
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

            {/* domain switch */}
            <Field>
              <label htmlFor="edit-switch-domain" className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-secondary">
                <input
                  id="edit-switch-domain"
                  type="checkbox"
                  checked={switchDomain}
                  onChange={(e) => setSwitchDomain(e.target.checked)}
                  className="size-3.5 accent-[#E8590C]"
                />
                Move to a different domain
              </label>
              {switchDomain && (
                <select
                  id="edit-domain"
                  value={domainId}
                  onChange={(e) => setDomainId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select a domain…</option>
                  {domains.data?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.host}
                      {d.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              )}
              <FieldHint>
                The slug is re-checked for availability on the new domain.
              </FieldHint>
            </Field>

            {/* status toggle */}
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-secondary">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-3.5 accent-[#E8590C]"
              />
              Link is active (unchecking pauses all redirects)
            </label>

            {backendError && (
              <>
                <FieldError>{backendError.message}</FieldError>
                {backendError.status === 403 && (
                  <UpgradeHint feature={backendError.message} requirement="a higher plan or unused quota" />
                )}
              </>
            )}
            {fieldError && <FieldError>{fieldError}</FieldError>}

            <div className="mt-1 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={mutation.isPending}
                loadingLabel="Saving changes…"
                disabled={!destinationValid || !slugValid || !passwordValid}
              >
                Save changes
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function isExpiredCheck(localValue: string): boolean {
  if (!localValue) return false;
  return new Date(localValue).getTime() < Date.now();
}

export { EditLinkDialog };
