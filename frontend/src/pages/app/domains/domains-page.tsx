import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { addDomain, deleteDomain, verifyDomain } from "@/api/domains";
import { useSession } from "@/auth/session";
import { useDomains } from "@/hooks/use-domains";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/ui/empty";
import { Banner } from "@/components/ui/banner";
import { Lamp } from "@/components/ui/lamp";
import { RouteStrip } from "@/components/ui/route-strip";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToaster } from "@/components/ui/toaster";
import { FadeIn } from "@/components/ui/motion";
import type { DomainRow } from "@/types/api";

/* plan caps mirror the seeded Plan.maxDomains (server enforces via 403) */
const DOMAIN_CAP: Record<string, number | null> = { FREE: 0, STARTER: 1, CREATOR: 5, PRO: null };

function DnsInstructions({ host }: { host: string }) {
  return (
    <div className="relative overflow-hidden rounded-md border border-brand/25 bg-brand/[0.05] p-4">
      <span aria-hidden="true" className="ls-stripe" />
      <p className="font-mono text-[10px] tracking-[0.18em] text-brand uppercase">
        DNS record to add
      </p>
      <dl className="mt-2.5 space-y-1.5 font-mono text-xs">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 text-fg-muted uppercase">Type</dt>
          <dd className="text-foreground">CNAME</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="w-14 shrink-0 text-fg-muted uppercase">Name</dt>
          <dd className="break-all text-foreground">{host}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="w-14 shrink-0 text-fg-muted uppercase">Target</dt>
          <dd className="break-all text-foreground">go.linkshift.in</dd>
        </div>
      </dl>
      <p className="mt-2.5 text-[11px] leading-snug text-fg-muted">
        DNS changes can take a few minutes to a few hours. Come back and press Verify once the record is live.
      </p>
    </div>
  );
}

function AddDomainDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (domain: DomainRow) => void;
}) {
  const queryClient = useQueryClient();
  const [host, setHost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [instructionsHost, setInstructionsHost] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => addDomain(host.trim()),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["domains"] });
      setInstructionsHost(res.instructions.host);
      onAdded({
        id: "pending",
        host: res.instructions.host,
        verified: false,
        verifiedAt: null,
        isDefault: false,
        userId: null,
        createdAt: new Date().toISOString(),
      });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Couldn't add the domain.");
    },
  });

  function normalize(v: string): string {
    return v
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./i, "")
      .replace(/\/.*$/, "")
      .replace(/\.$/, "");
  }

  const valid = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(normalize(host));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valid) {
      setError("Enter a valid hostname, for example go.example.com. No http://, no path.");
      return;
    }
    setHost(normalize(host));
    mutation.mutate();
  }

  function close() {
    setHost("");
    setError(null);
    setInstructionsHost(null);
    mutation.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Add a custom domain</DialogTitle>
        {instructionsHost ? (
          <>
            <p className="mt-1 text-sm text-fg-secondary">
              One step left: point <span className="font-mono text-foreground">{instructionsHost}</span> at
              LinkShift with this DNS record.
            </p>
            <div className="mt-4">
              <DnsInstructions host={instructionsHost} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>
                Later
              </Button>
              <Button onClick={close}>Got it</Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-fg-secondary">
              Put your brand on every short link. Point one DNS record at LinkShift, then verify.
            </p>
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
              <Field>
                <FieldLabel htmlFor="domain-host">Domain</FieldLabel>
                <Input
                  id="domain-host"
                  value={host}
                  onChange={(e) => { setHost(e.target.value); setError(null); }}
                  placeholder="go.example.com"
                  autoFocus
                  aria-invalid={!!error && !valid}
                />
                <FieldError>{error}</FieldError>
              </Field>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" loading={mutation.isPending} loadingLabel="Adding…" disabled={!host.trim()}>
                  Add domain
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DomainRowSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <Skeleton className="size-10 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  );
}

function DomainRowCard({
  domain,
  verifying,
  onVerify,
  onDelete,
}: {
  domain: DomainRow;
  verifying: boolean;
  onVerify: () => void;
  onDelete: () => void;
}) {
  const [showDns, setShowDns] = useState(false);

  return (
    <li className="relative overflow-hidden rounded-xl border border-border bg-surface">
      {domain.verified && <span aria-hidden="true" className="ls-stripe" />}
      <div className="flex flex-wrap items-center gap-4 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-elevated text-fg-muted">
          <Globe className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <p className="truncate font-mono text-sm text-foreground">{domain.host}</p>
            {domain.verified ? <Lamp tone="success">Verified</Lamp> : <Lamp tone="warning">Pending DNS</Lamp>}
          </div>
          <p className="mt-0.5 font-mono text-[10px] tracking-[0.12em] text-fg-muted">
            Added {new Date(domain.createdAt).toLocaleDateString()}
            {domain.verifiedAt && ` · Verified ${new Date(domain.verifiedAt).toLocaleDateString()}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!domain.verified && (
            <Button variant="secondary" size="sm" loading={verifying} onClick={onVerify}>
              <RefreshCcw className="size-3.5" />
              Verify
            </Button>
          )}
          {domain.verified && (
            <Button variant="ghost" size="sm" className="text-fg-muted" onClick={() => setShowDns((v) => !v)}>
              DNS info
            </Button>
          )}
          <button
            type="button"
            aria-label={`Remove ${domain.host}`}
            onClick={onDelete}
            className="flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {showDns && (
        <div className="border-t border-border px-4 py-3.5">
          <DnsInstructions host={domain.host} />
        </div>
      )}
    </li>
  );
}

function DomainsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToaster();
  const { user } = useSession();
  const plan = user?.plan.name ?? "FREE";
  const cap = DOMAIN_CAP[plan];

  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<DomainRow | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const domains = useDomains();

  const rows = domains.data ?? [];
  const own = rows.filter((d) => d.userId !== null);
  const shared = rows.filter((d) => d.userId === null);
  const atCap = cap !== null && own.length >= cap;

  const verify = useMutation({
    mutationFn: (id: string) => verifyDomain(id),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["domains"] });
      toast({
        title: res.alreadyVerified ? "Already verified" : "Domain verified",
        description: res.alreadyVerified ? "Nothing to do." : "The domain can back your links now.",
        variant: "success",
      });
    },
    onError: (err) => {
      toast({
        title: "Verification failed",
        description: err instanceof Error ? err.message : "DNS record not found yet. Check your provider settings.",
        variant: "error",
      });
    },
    onSettled: () => setVerifyingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDomain(id),
    onSuccess: async () => {
      toast({ title: "Domain removed", variant: "success" });
      await queryClient.invalidateQueries({ queryKey: ["domains"] });
      setDeleting(null);
    },
    onError: (err) => {
      toast({
        title: "Couldn't remove domain",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    },
    onSettled: () => setDeleting(null),
  });

  function handleVerify(d: DomainRow) {
    if (verifyingId) return;
    setVerifyingId(d.id);
    verify.mutate(d.id);
  }

  const addControl = (
    <Button size="md" onClick={() => setAddOpen(true)}>
      <Plus className="size-4" />
      Add domain
    </Button>
  );

  return (
    <FadeIn>
      <RouteStrip
        index="05"
        label="Domains"
        title="Your brand, on every hop."
        description="Connect a domain, verify it in DNS, and put it on any link you own."
        action={addControl}
      />

      <section
        aria-label="Custom domains ledger"
        className="relative mt-8 overflow-hidden rounded-xl border border-border bg-surface"
      >
        <span aria-hidden="true" className="ls-stripe" />
        <header className="flex items-center justify-between border-b border-border-subtle px-5 py-3 sm:px-6">
          <p className="ls-marquee">Custom domains</p>
          <span className="font-mono text-[9px] tracking-[0.16em] text-fg-muted uppercase">
            {cap === null
              ? `${plan} plan · unlimited`
              : `${plan} plan · ${own.length} of ${cap} used`}
          </span>
        </header>

        <div className="px-5 py-4 sm:px-6 sm:py-5">
          {domains.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <DomainRowSkeleton key={i} />
              ))}
            </div>
          ) : domains.isError ? (
            <ErrorState
              title="Couldn't load your domains"
              message={domains.error instanceof Error ? domains.error.message : undefined}
              onRetry={() => void domains.refetch()}
            />
          ) : (
            <>
              {/* shared system domain */}
              {shared.map((d) => (
                <div
                  key={d.id}
                  className="mb-3 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-elevated/30 p-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-elevated text-fg-muted">
                    <Globe className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{d.host}</p>
                    <p className="font-mono text-[10px] tracking-[0.16em] text-fg-muted uppercase">
                      LinkShift domain. Available on every plan.
                    </p>
                  </div>
                </div>
              ))}

              {/* user domains */}
              {own.length === 0 ? (
                cap === 0 ? (
                  <EmptyState
                    marquee="Custom domains"
                    title="Custom domains live on paid plans"
                    description="Add your brand to every short link. Unlock with Starter, then add your domain."
                    action={
                      <a
                        href="/pricing"
                        className="inline-flex h-9 items-center rounded-md border border-brand/40 bg-brand/[0.09] px-4 font-mono text-[11px] font-medium tracking-[0.08em] text-foreground uppercase transition-colors hover:border-brand/75 hover:bg-brand/[0.16]"
                      >
                        View plans
                      </a>
                    }
                  />
                ) : (
                  <EmptyState
                    marquee="Custom domains"
                    title="No custom domains yet"
                    description="Connect a domain you own. Every short link can carry your brand instead of ours."
                    action={addControl}
                  />
                )
              ) : (
                <ul className="space-y-3">
                  {own.map((d) => (
                    <DomainRowCard
                      key={d.id}
                      domain={d}
                      verifying={verifyingId === d.id}
                      onVerify={() => handleVerify(d)}
                      onDelete={() => setDeleting(d)}
                    />
                  ))}
                </ul>
              )}

              {atCap && (
                <div className="mt-4">
                  <Banner
                    tone="warning"
                    action={
                      <a
                        href="/pricing"
                        className="font-mono text-[10px] tracking-[0.14em] text-brand uppercase hover:text-brand-hover"
                      >
                        Upgrade
                      </a>
                    }
                  >
                    You've used all {cap} custom domain{cap === 1 ? "" : "s"} on {plan.charAt(0) + plan.slice(1).toLowerCase()}.
                  </Banner>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <AddDomainDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => {
          toast({ title: "Domain added", description: "Add the DNS record, then press Verify.", variant: "success" });
          queryClient.invalidateQueries({ queryKey: ["domains"] });
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remove domain?"
        description={
          deleting ? (
            <>
              <span className="font-mono text-foreground">{deleting.host}</span> disconnects from
              LinkShift. Links using it can no longer be created, and existing links must be moved first.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Remove domain"
        cancelLabel="Keep domain"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) void deleteMutation.mutateAsync(deleting.id);
        }}
      />
    </FadeIn>
  );
}

export { DomainsPage };
