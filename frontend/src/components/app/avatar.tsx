import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * User avatar with graceful initial fallback — never renders a broken
 * image. Falls back whenever src is missing or fails to load.
 */
function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  const initials = (() => {
    if (!name) return "·";
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  })();

  if (!showImage) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-full border border-border-strong bg-raised font-mono text-[10px] text-fg-secondary",
          className,
        )}
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={src ?? undefined}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("rounded-full object-cover", className)}
    />
  );
}

export { Avatar };
