import { useQueryClient } from "@tanstack/react-query";
import { Check, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { ApiError } from "@/api/client";
import { removeAvatar, uploadAvatar } from "@/api/settings";
import { useSession } from "@/auth/session";
import { Avatar } from "@/components/app/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToaster } from "@/components/ui/toaster";
import { updateName } from "@/api/users";
import { devSlow } from "@/lib/dev-delay";
import { AvatarCropDialog } from "./avatar-crop-dialog";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

function memberSince(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function ProfileSection() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToaster();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nameDraft, setNameDraft] = useState(user?.name ?? "");
  const [prevName, setPrevName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  if (user?.name !== prevName) {
    // The profile refreshed from the server (e.g. saved elsewhere) — resync
    // the draft so it never silently diverges from the stored name.
    setPrevName(user?.name ?? "");
    setNameDraft(user?.name ?? "");
  }

  if (!user) return null;

  const trimmed = nameDraft.trim();
  const nameValid = trimmed.length >= 2 && trimmed.length <= 50;

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (savingName || !nameValid) return;
    setSavingName(true);
    setNameError(null);
    await devSlow();
    try {
      await updateName(trimmed);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Name updated", variant: "success" });
    } catch (err) {
      setNameError(err instanceof ApiError ? err.message : "Could not update your name.");
    } finally {
      setSavingName(false);
    }
  }

  function handleAvatarFile(file: File) {
    setAvatarError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setAvatarError("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setAvatarError("Image must be under 2 MB.");
      return;
    }
    setCropFile(file);
  }

  async function handleCropComplete(blob: Blob) {
    if (uploading) return;
    setAvatarError(null);
    setUploading(true);
    await devSlow();
    try {
      await uploadAvatar(blob);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Avatar updated", variant: "success" });
      setCropFile(null);
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  }

  function handleCropCancel() {
    if (uploading) return;
    setCropFile(null);
    setAvatarError(null);
  }

  async function handleRemoveAvatar() {
    setAvatarError(null);
    setUploading(true);
    await devSlow();
    try {
      await removeAvatar();
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Avatar removed", variant: "success" });
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : "Could not remove your avatar.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        {/* Avatar */}
        <div className="flex items-start gap-4">
          <Avatar
            src={user.avatarUrl}
            name={user.name}
            className="size-16 shrink-0 text-sm sm:size-20"
          />
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handleAvatarFile(file);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {!uploading && <UploadCloud className="size-3.5" />}
                Change avatar
              </Button>
              {user.avatarUrl && (
                <Button variant="ghost" size="sm" disabled={uploading} onClick={() => void handleRemoveAvatar()}>
                  <X className="size-3.5" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-fg-muted">PNG, JPEG, or WebP under 2 MB.</p>
            <FieldError>{avatarError}</FieldError>
          </div>
        </div>

        <AvatarCropDialog
          file={cropFile}
          uploadBusy={uploading}
          uploadError={avatarError}
          onRequestClose={handleCropCancel}
          onCropComplete={(blob) => void handleCropComplete(blob)}
        />

        {/* Name */}
        <form onSubmit={handleSaveName} className="flex flex-col gap-1.5" noValidate>
          <Field>
            <FieldLabel htmlFor="profile-name">Name</FieldLabel>
            <Input
              id="profile-name"
              autoComplete="name"
              value={nameDraft}
              maxLength={50}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Your name"
            />
            <FieldHint>2–50 characters.</FieldHint>
          </Field>
          <FieldError>
            {nameError ?? (nameDraft && !nameValid ? "Name must be between 2 and 50 characters." : null)}
          </FieldError>
          <div>
            <Button type="submit" size="sm" loading={savingName} loadingLabel="Saving…" disabled={!nameValid || trimmed === user.name}>
              Save name
            </Button>
          </div>
        </form>
      </div>

      {/* Account facts */}
      <dl className="grid h-fit grid-cols-1 overflow-hidden rounded-lg border border-border bg-raised/40 sm:grid-cols-2">
        <div className="border-b border-border px-4 py-3.5 sm:border-r">
          <dt className="font-mono text-[9px] tracking-[0.16em] text-fg-muted uppercase">Email</dt>
          <dd className="mt-1 truncate font-mono text-xs text-foreground" title={user.email}>
            {user.email}
          </dd>
        </div>
        <div className="border-b border-border px-4 py-3.5">
          <dt className="font-mono text-[9px] tracking-[0.16em] text-fg-muted uppercase">Member since</dt>
          <dd className="mt-1 text-[13px] text-foreground">{memberSince(user.createdAt)}</dd>
        </div>
        <div className="px-4 py-3.5 sm:border-r sm:border-border">
          <dt className="font-mono text-[9px] tracking-[0.16em] text-fg-muted uppercase">Sign-in method</dt>
          <dd className="mt-1.5">
            <Badge variant={user.provider === "GOOGLE" ? "ember" : "neutral"}>
              {user.provider === "GOOGLE" ? "Google" : "Email & password"}
            </Badge>
          </dd>
        </div>
        <div className="px-4 py-3.5">
          <dt className="font-mono text-[9px] tracking-[0.16em] text-fg-muted uppercase">Email status</dt>
          <dd className="mt-1.5">
            {user.verified ? (
              <Badge variant="success">
                <Check className="size-3" />
                Verified
              </Badge>
            ) : (
              <Badge variant="warning">Unverified</Badge>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export { ProfileSection };