import { apiFetch } from "./client";



export function changePassword(input: {
  currentPassword?: string;
  newPassword: string;
}) {
  return apiFetch<{ success: true; message: string }>("/auth/change-password", {
    method: "POST",
    body: input,
  });
}

export function deleteAccount(input: {
  confirmation: string;
  password?: string;
}) {
  return apiFetch<{ success: true; message: string }>("/users/me", {
    method: "DELETE",
    body: input,
  });
}

export function uploadAvatar(file: File | Blob) {
  const form = new FormData();
  form.append("image", file);
  return apiFetch<{ success: true; avatarUrl: string | null }>("/auth/avatar", {
    method: "PATCH",
    body: form,
  });
}

export function removeAvatar() {
  return apiFetch<{ success: true; message: string }>("/auth/avatar", {
    method: "DELETE",
  });
}