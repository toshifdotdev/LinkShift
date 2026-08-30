import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  meta?: string;
  variant: ToastVariant;
}

interface ToastInput {
  title: string;
  description?: string;
  /** Optional mono caption shown right-aligned, e.g. the short link or id. */
  meta?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToasterValue {
  toast: (input: ToastInput) => void;
}

const ToasterContext = createContext<ToasterValue | null>(null);

function useToaster() {
  const ctx = useContext(ToasterContext);
  if (!ctx) throw new Error("useToaster must be used within <ToastProvider>");
  return ctx;
}

const icons: Record<ToastVariant, ReactNode> = {
  default: <Info className="size-4 text-fg-secondary" />,
  success: <CheckCircle2 className="size-4 text-emerald-400" />,
  error: <AlertTriangle className="size-4 text-destructive" />,
};

const variantsToTone: Record<ToastVariant, string> = {
  default: "before:bg-fg-muted/60",
  success: "before:bg-emerald-400",
  error: "before:bg-destructive",
};

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, meta, variant = "default", duration = 5000 }: ToastInput) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, meta, variant }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToasterContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-0 bottom-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 sm:right-4 sm:bottom-4 sm:p-0"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={cn(
                "pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-lg border border-border bg-raised p-3.5 pr-9 shadow-xl shadow-black/40 before:absolute before:inset-y-0 before:left-0 before:w-0.5",
                variantsToTone[t.variant],
              )}
            >
              <span className="mt-0.5 shrink-0">{icons[t.variant]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-[13px] leading-snug text-fg-secondary">
                    {t.description}
                  </p>
                )}
              </div>
              {t.meta && (
                <span
                  className="mt-0.5 max-w-[40%] truncate text-right font-mono text-[10px] tracking-[0.12em] text-fg-muted"
                  title={t.meta}
                >
                  {t.meta}
                </span>
              )}
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
                className="absolute top-3 right-3 rounded-sm p-1 text-fg-muted transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToasterContext.Provider>
  );
}

export { ToastProvider, useToaster };
