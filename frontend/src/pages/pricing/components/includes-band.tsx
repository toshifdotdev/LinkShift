import { UNIVERSAL_INCLUDES } from "../plan-presentation";

function IncludesBand() {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
        <p className="font-mono text-[11px] font-medium tracking-[0.18em] text-fg-secondary uppercase">
          Every plan includes
        </p>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <dl className="grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
        {UNIVERSAL_INCLUDES.map((item) => (
          <div key={item.title}>
            <dt className="text-[13px] font-medium text-foreground">{item.title}</dt>
            <dd className="mt-0.5 text-xs leading-snug text-fg-muted">{item.note}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export { IncludesBand };
