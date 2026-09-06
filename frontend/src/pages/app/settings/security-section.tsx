import { LogOut, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { resendVerification } from "@/api/auth";
import { ApiError } from "@/api/client";
import { changePassword } from "@/api/settings";
import { useLogout, useSession } from "@/auth/session";
import { Lamp } from "@/components/ui/lamp";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { useToaster } from "@/components/ui/toaster";
import { devSlow } from "@/lib/dev-delay";
import { cn } from "@/lib/utils";
import { logout as logoutApi } from "@/api/auth";

const RULES = [
  { key: "len", label: "8–64 characters", test: (p: string) => p.length >= 8 && p.length <= 64 },
  { key: "lower", label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { key: "upper", label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "digit", label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

function SecuritySection() {
  const { user } = useSession();
  const logout = useLogout();
  const { toast } = useToaster();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const ruleState = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(next) })), [next]);

  if (!user) return null;
  const settingPassword = !user.hasPassword;

  const allValid = ruleState.every((r) => r.ok);
  const confirmMatches = confirm.length > 0 && confirm === next;
  const canSubmit = next.length > 0 && allValid && confirmMatches && (!user.hasPassword || current.length > 0);

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      await resendVerification(user.email);
      toast({ title: "Verification email sent", description: user.email, variant: "success" });
    } catch (err) {
      toast({
        title: "Could not resend",
        description: err instanceof ApiError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setResending(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    await devSlow();
    try {
      await changePassword({
        currentPassword: user.hasPassword ? current : undefined,
        newPassword: next,
      });
      toast({
        title: settingPassword ? "Password set" : "Password updated",
        description: "Sign in again with your new password.",
        variant: "success",
      });
      // The single refresh session was revoked on the server. End the
      // local session too and land the user on the login screen.
      logout();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update your password.");
      setSubmitting(false);
    }
  };

  const handleSignOutEverywhere = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logoutApi();
    } catch {
      // clearing the local session regardless
    }
    logout();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Sign-in & session summary */}
      <div className="flex flex-col gap-6">
        <dl className="ls-plate grid grid-cols-1 overflow-hidden sm:grid-cols-2">
          <div className="border-b border-border px-4 py-3.5 sm:border-r">
            <dt className="font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">Password</dt>
            <dd className="mt-1.5">
              {user.hasPassword ? (
                <Lamp tone="neutral">Set</Lamp>
              ) : (
                <Lamp tone="warning">Not set. Google sign-in</Lamp>
              )}
            </dd>
          </div>
          <div className="border-b border-border px-4 py-3.5">
            <dt className="font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">Email status</dt>
            <dd className="mt-1.5 flex flex-wrap items-center gap-2">
              {user.verified ? (
                <Lamp tone="success">Verified</Lamp>
              ) : (
                <>
                  <Lamp tone="warning">Unverified</Lamp>
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    disabled={resending}
                    className="font-mono text-[11px] tracking-wide text-brand underline-offset-4 uppercase hover:underline disabled:opacity-50"
                  >
                    {resending ? "Sending…" : "Resend email"}
                  </button>
                </>
              )}
            </dd>
          </div>
        </dl>

        <div className="ls-plate flex flex-col gap-2 px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
            <div>
              <p className="text-sm font-medium text-foreground">One active session</p>
              <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">
                LinkShift keeps a single, rotating session per account. Changing your password revokes it
                on the server. Signing out everywhere ends this one too.
              </p>
            </div>
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              loading={signingOut}
              onClick={() => void handleSignOutEverywhere()}
            >
              <LogOut className="size-3.5" />
              Sign out everywhere
            </Button>
          </div>
        </div>
      </div>

      {/* Password change form */}
      <form
        onSubmit={handlePasswordChange}
        className="ls-plate flex flex-col gap-4 px-4 py-4"
        noValidate
      >
        {user.hasPassword ? (
          <Field>
            <FieldLabel htmlFor="security-current">Current password</FieldLabel>
            <PasswordInput
              id="security-current"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••••••"
            />
          </Field>
        ) : (
          <p className="text-[13px] leading-snug text-fg-muted">
            Your Google sign-in has no local password yet. Set one to add email sign-in.
          </p>
        )}

        <Field>
          <FieldLabel htmlFor="security-new">{settingPassword ? "New password" : "Update password"}</FieldLabel>
          <PasswordInput
            id="security-new"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Create a strong password"
          />
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Password requirements">
            {ruleState.map((r) => (
              <li
                key={r.key}
                className={cn(
                  "rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wide uppercase transition-colors duration-200",
                  r.ok
                    ? "border-success/30 bg-success-soft text-success"
                    : "border-border bg-elevated text-fg-muted",
                )}
              >
                {r.label}
              </li>
            ))}
          </ul>
        </Field>

        <Field>
          <FieldLabel htmlFor="security-confirm">Confirm new password</FieldLabel>
          <PasswordInput
            id="security-confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat the new password"
          />
        </Field>

        <FieldError>
          {error ??
            (next && !allValid ? "Password does not meet all requirements yet." : null) ??
            (confirm && !confirmMatches ? "Passwords do not match." : null)}
        </FieldError>

        <div>
          <Button
            type="submit"
            size="sm"
            loading={submitting}
            loadingLabel={settingPassword ? "Setting…" : "Updating…"}
            disabled={!canSubmit}
          >
            {settingPassword ? "Set password" : "Update password"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export { SecuritySection };