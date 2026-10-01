import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, FlaskConical, Info } from "lucide-react";
import { useState } from "react";
import {
  previewRedirect,
  TESTER_PRESETS,
  type PreviewRedirectInput,
  type RedirectPreview,
  type TesterPreset,
} from "@/api/redirect-tester";
import { ApiError } from "@/api/client";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Lamp } from "@/components/ui/lamp";
import { cn } from "@/lib/utils";

function audienceTone(audience: RedirectPreview["audience"]) {
  if (audience === "bot") return "neutral" as const;
  if (audience === "desktop") return "dim" as const;
  return "ember" as const;
}

function audienceLabel(audience: RedirectPreview["audience"]): string {
  if (audience === "ios") return "iOS visitor";
  if (audience === "android") return "Android visitor";
  if (audience === "bot") return "Bot crawler";
  return "Desktop visitor";
}

export function RedirectTesterPage() {
  const [url, setUrl] = useState("");
  const [preset, setPreset] = useState<TesterPreset>("desktop");
  const [path, setPath] = useState("");
  const [query, setQuery] = useState("");
  const [deepLink, setDeepLink] = useState(false);
  const [appScheme, setAppScheme] = useState("");
  const [androidPackage, setAndroidPackage] = useState("");
  const [appPath, setAppPath] = useState("");

  const preview = useMutation({
    mutationFn: (input: PreviewRedirectInput) => previewRedirect(input),
  });

  const run = () => {
    if (!url.trim()) return;
    preview.mutate({
      url: url.trim(),
      preset,
      path: path.trim(),
      query: query.trim(),
      deepLink,
      appScheme: appScheme.trim() || undefined,
      androidPackage: androidPackage.trim() || undefined,
      appPath: appPath.trim() || undefined,
    });
  };

  const result = preview.data;
  const error = preview.error instanceof ApiError ? preview.error.message : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-fg-muted" aria-hidden="true" />
          <p className="font-mono text-[10px] tracking-[0.18em] text-fg-muted uppercase">
            Redirect tester
          </p>
        </div>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
          See where a link actually sends people
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-secondary">
          Check a destination against every platform before you point a short link at it.
          Previews record nothing and cost none of your monthly redirects.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="tester-url"
                className="mb-1.5 block font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase"
              >
                Destination URL
              </label>
              <Input
                id="tester-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/checkout"
                inputMode="url"
                autoComplete="off"
              />
            </div>

            <div>
              <span className="mb-1.5 block font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                Visitor
              </span>
              <Segmented
                ariaLabel="Simulated visitor"
                value={preset}
                onValueChange={(v) => setPreset(v as TesterPreset)}
                options={TESTER_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tester-path"
                  className="mb-1.5 block font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase"
                >
                  Path after slug
                </label>
                <Input
                  id="tester-path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/checkout"
                />
              </div>
              <div>
                <label
                  htmlFor="tester-query"
                  className="mb-1.5 block font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase"
                >
                  Query string
                </label>
                <Input
                  id="tester-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="utm_source=news"
                />
              </div>
            </div>

            <div className="rounded-md border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] text-fg-secondary">Path forwarding</p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">
                    Append the path and query to the destination.
                  </p>
                </div>
                <Switch
                  checked={deepLink}
                  onCheckedChange={setDeepLink}
                  aria-label="Path forwarding"
                />
              </div>
            </div>

            <div className="rounded-md border border-border bg-background/40 p-4">
              <p className="text-[13px] text-fg-secondary">App deep link</p>
              <p className="mt-0.5 mb-3 text-[11px] text-fg-muted">
                Route mobile visitors into the app, with a store fallback.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="tester-scheme"
                    className="mb-1.5 block font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase"
                  >
                    Scheme
                  </label>
                  <Input
                    id="tester-scheme"
                    value={appScheme}
                    onChange={(e) => setAppScheme(e.target.value)}
                    placeholder="myapp"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tester-package"
                    className="mb-1.5 block font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase"
                  >
                    Android package
                  </label>
                  <Input
                    id="tester-package"
                    value={androidPackage}
                    onChange={(e) => setAndroidPackage(e.target.value)}
                    placeholder="com.example"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tester-app-path"
                    className="mb-1.5 block font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase"
                  >
                    App path
                  </label>
                  <Input
                    id="tester-app-path"
                    value={appPath}
                    onChange={(e) => setAppPath(e.target.value)}
                    placeholder="checkout"
                  />
                </div>
              </div>
            </div>

            <Button onClick={run} disabled={!url.trim() || preview.isPending}>
              {preview.isPending ? "Checking..." : "Run preview"}
            </Button>
          </div>
        </section>

        <aside className="space-y-4">
          {error && (
            <Banner tone="destructive">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </Banner>
          )}

          {!result && !error && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Info className="mx-auto mb-2 size-4 text-fg-muted" aria-hidden="true" />
              <p className="text-[13px] text-fg-secondary">No preview yet</p>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                Enter a destination and pick a visitor to see where they would land.
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Lamp tone={audienceTone(result.audience)}>
                    {audienceLabel(result.audience)}
                  </Lamp>
                  {result.showsInterstitial && <Lamp tone="ember">Interstitial</Lamp>}
                </div>

                <p className="font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                  Final destination
                </p>
                <p className="mt-1.5 font-mono text-xs leading-relaxed break-all text-foreground">
                  {result.finalUrl}
                </p>

                {result.appUrl && (
                  <>
                    <p className="mt-4 font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                      App URL
                    </p>
                    <p className="mt-1.5 font-mono text-xs leading-relaxed break-all text-fg-secondary">
                      {result.appUrl}
                    </p>
                  </>
                )}

                {result.storeUrl && (
                  <>
                    <p className="mt-4 font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                      Store fallback
                    </p>
                    <p className="mt-1.5 font-mono text-xs leading-relaxed break-all text-fg-secondary">
                      {result.storeUrl}
                    </p>
                  </>
                )}
              </div>

              {result.warnings.length > 0 && (
                <Banner tone="warning">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                  <ul className="space-y-1.5">
                    {result.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </Banner>
              )}

              <ol className="space-y-3 rounded-lg border border-border bg-surface p-4">
                {result.steps.map((step, i) => (
                  <li key={step.label} className="flex gap-3">
                    <span className="font-mono text-[10px] text-fg-muted tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] text-fg-secondary">{step.label}</p>
                      <p className={cn("mt-0.5 text-[11px] leading-relaxed break-words text-fg-muted")}>
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}

          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-fg-muted">
            <ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            A preview never follows the link, never stores a click, and never counts against your
            redirect limit.
          </p>
        </aside>
      </div>
    </div>
  );
}
