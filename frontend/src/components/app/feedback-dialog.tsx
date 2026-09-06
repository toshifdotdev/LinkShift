import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/api/client";
import { sendFeedback, type FeedbackCategory } from "@/api/support";

const CATEGORIES: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "general", label: "General impression" },
  { value: "bug", label: "Something is broken" },
  { value: "idea", label: "Feature idea" },
];

function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function submit() {
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setError("Feedback must be at least 10 characters.");
      return;
    }
    if (trimmed.length > 5000) {
      setError("Feedback cannot exceed 5000 characters.");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      await sendFeedback({ category, message: trimmed });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ApiError && err.status === 429
          ? "Too much feedback at once. Please try again later."
          : err instanceof Error
            ? err.message
            : "Something went wrong sending your feedback.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(next) => {
        if (!next) {
          setMessage("");
          setCategory("general");
          setError(null);
          setStatus("idle");
        }
      }}
    >
      <DialogContent className="max-w-md">
        {status === "success" ? (
          <>
            <DialogTitle>Thank you</DialogTitle>
            <DialogDescription>
              Your feedback reached the team. This is how LinkShift gets better —
              we read every note.
            </DialogDescription>
            <DialogFooter>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>
              Goes straight to the people who build LinkShift. For account or
              billing help, use the contact page instead.
            </DialogDescription>

            <Field className="mt-5">
              <FieldLabel>Kind</FieldLabel>
              <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
                <SelectTrigger aria-label="Feedback kind" placeholder="Choose a kind" />
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field className="mt-4">
              <FieldLabel htmlFor="feedback-message">Feedback</FieldLabel>
              <Textarea
                id="feedback-message"
                rows={5}
                value={message}
                placeholder="What worked, what didn't, what's missing?"
                aria-invalid={!!error}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (error) setError(null);
                }}
              />
              <FieldError>{error ?? undefined}</FieldError>
            </Field>

            {status === "error" && (
              <p
                role="alert"
                className="mt-4 rounded-md border border-dashed border-destructive/50 bg-destructive/10 px-4 py-3 text-[13px] leading-relaxed text-destructive"
              >
                {error}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" disabled={status === "submitting"} onClick={() => void submit()}>
                {status === "submitting" ? (
                  <>
                    <Spinner className="size-3.5" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    Send
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { FeedbackDialog };
