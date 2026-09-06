import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/api/client";
import { deleteAccount } from "@/api/settings";
import { useLogout, useSession } from "@/auth/session";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToaster } from "@/components/ui/toaster";
import { devSlow } from "@/lib/dev-delay";

function DangerZoneSection() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <AlertTriangle className="size-3.5" />
          </span>
          <div>
            <p className="text-[13.5px] font-medium text-foreground">Delete your account</p>
            <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">
              Permanent and irreversible. Any active subscription is cancelled at the payment provider first.
              To proceed you must type your account email exactly.
            </p>
          </div>
        </div>
        <div>
          <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        </div>
      </div>
      <DeleteAccountDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
        }}
      />
    </div>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useSession();
  const logout = useLogout();
  const { toast } = useToaster();

  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const emailMatches =
    confirmation.trim().toLowerCase() === (user.email ?? "").trim().toLowerCase();
  const ready = emailMatches && (user.hasPassword ? password.length > 0 : true);

  const closeDialog = () => {
    if (busy) return;
    setConfirmation("");
    setPassword("");
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    await devSlow();
    try {
      await deleteAccount({
        confirmation: confirmation.trim(),
        password: user.hasPassword ? password : undefined,
      });
      toast({
        title: "Account deleted",
        description: "Your data has been removed. We're sorry to see you go.",
        variant: "success",
      });
      
      logout();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Deletion failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => openDialogState(closeDialog, next)}>
      <DialogContent>
        <DialogTitle className="text-destructive">Delete your account?</DialogTitle>
        <DialogDescription>
          <ul className="mb-3 space-y-1 text-foreground">
            <DeleteDetail label="Removed">Profile, avatar, links, and every QR code with its scan history.</DeleteDetail>
            <DeleteDetail label="Domains">
              Custom domains you own are released; the shared default domain stays.
            </DeleteDetail>
            <DeleteDetail label="Subscriptions">
              Any active plan is cancelled at the payment provider before deletion starts. A failed
              cancellation aborts everything.
            </DeleteDetail>
            <DeleteDetail label="Emails">
              Messages already delivered through our provider are outside our control and may remain.
            </DeleteDetail>
          </ul>

          <p className="text-foreground">
            This is permanent. To confirm, type{" "}
            <span className="font-mono text-destructive">{user.email}</span>
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="delete-confirmation">Type your email to confirm</FieldLabel>
              <Input
                id="delete-confirmation"
                autoComplete="off"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="you@company.com"
                aria-invalid={confirmation.length > 0 && !emailMatches}
              />
            </Field>

            {user.hasPassword && (
              <Field>
                <FieldLabel htmlFor="delete-password">Password</FieldLabel>
                <PasswordInput
                  id="delete-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
                <p className="text-xs text-fg-muted">Required to verify you own this account.</p>
              </Field>
            )}

            {error && <FieldError>{error}</FieldError>}
            {!error && confirmation.length > 0 && !emailMatches && (
              <FieldError>Email does not match your account email.</FieldError>
            )}
          </div>
        </DialogDescription>

        <DialogFooter>
          <Button variant="ghost" onClick={closeDialog} disabled={busy}>
            Keep my account
          </Button>
          <Button
            variant="destructive"
            loading={busy}
            loadingLabel="Deleting…"
            disabled={!ready}
            onClick={() => void handleDelete()}
          >
            Delete account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function openDialogState(onClose: () => void, next: boolean) {
  if (!next) onClose();
}

function DeleteDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-[13px] leading-snug">
      <span className="shrink-0 font-mono text-[10px] tracking-wide text-destructive uppercase">
        {label}
      </span>
      <span className="text-fg-secondary">{children}</span>
    </li>
  );
}

export { DangerZoneSection };