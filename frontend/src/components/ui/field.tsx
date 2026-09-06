import { Info } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";



interface FieldRegistry {
  register: (id: string) => void;
  unregister: (id: string) => void;
}

const FieldRegistryContext = createContext<FieldRegistry | null>(null);
const FieldDescribedByContext = createContext<string | undefined>(undefined);


function useFieldDescribedBy() {
  return useContext(FieldDescribedByContext);
}

function Field({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const [ids, setIds] = useState<string[]>([]);

  const register = useCallback(
    (id: string) => setIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    [],
  );
  const unregister = useCallback(
    (id: string) => setIds((prev) => prev.filter((x) => x !== id)),
    [],
  );
  const registry = useMemo(() => ({ register, unregister }), [register, unregister]);
  const describedBy = ids.length ? ids.join(" ") : undefined;

  return (
    <FieldRegistryContext.Provider value={registry}>
      <FieldDescribedByContext.Provider value={describedBy}>
        <div
          data-slot="field"
          className={cn("flex flex-col gap-1.5", className)}
          {...props}
        />
      </FieldDescribedByContext.Provider>
    </FieldRegistryContext.Provider>
  );
}

function FieldLabel({
  className,
  children,
  htmlFor,
}: {
  className?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      data-slot="field-label"
      className={cn("text-[13px] font-medium text-fg-secondary", className)}
    >
      {children}
    </label>
  );
}

function FieldHint({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const registry = useContext(FieldRegistryContext);
  const id = useId();
  useEffect(() => {
    if (!registry) return;
    registry.register(id);
    return () => registry.unregister(id);
  }, [registry, id]);
  return (
    <p
      id={id}
      data-slot="field-hint"
      className={cn(
        "flex items-start gap-1.5 text-xs leading-snug text-fg-muted",
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function FieldError({ className, children }: { className?: string; children?: ReactNode }) {
  const registry = useContext(FieldRegistryContext);
  const id = useId();
  const active = !!children;
  useEffect(() => {
    if (!registry || !active) return;
    registry.register(id);
    return () => registry.unregister(id);
  }, [registry, active, id]);
  if (!children) return null;
  return (
    <p
      id={id}
      role="alert"
      data-slot="field-error"
      className={cn("text-xs text-destructive", className)}
    >
      {children}
    </p>
  );
}

export { Field, FieldLabel, FieldHint, FieldError, useFieldDescribedBy };
